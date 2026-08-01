import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, posix, resolve, win32 } from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  assertInquiryCheckpointEvidenceComplete,
  type InquiryCheckpointEvidence,
  inquiryCheckpointEvidenceHash,
  inquiryCheckpointIri,
  inquiryDefinitionHash,
  normalizeInquiryCheckpointEvidence,
} from "./checkpoint";
import { type InquiryDefinition, SUPPORTED_FLUREE_VERSION } from "./definition";
import type { FlureeClient, JsonObject, JsonValue } from "./fluree-client";
import { assertGitObjectId, createGitRunner, type GitRunner } from "./git";
import { refreshSemanticMaterialization, type SemanticMaterialization } from "./materialization";
import {
  configGraphIri,
  contextFor,
  evidenceHash,
  inquiryIri,
  namespacesFor,
  transactionMetadataSource,
} from "./namespaces";

export interface ModelSourceAttestation {
  readonly id: string;
  readonly locator: string;
  readonly repository: string;
  readonly revision: string;
  readonly path: string;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly section?: string;
  readonly blob: string;
  readonly contentHash: string;
}

export interface AuthoredModel {
  readonly controls: {
    readonly ontology: string;
    readonly rules: string;
    readonly shapes: string;
    readonly config: string;
  };
  readonly facts: readonly JsonObject[];
  readonly materialization?: string;
}

export interface ValidateModelOptions {
  readonly root: string;
  readonly executable?: string;
}

type ModelClient = Pick<
  FlureeClient,
  | "info"
  | "insert"
  | "ledger"
  | "query"
  | "sparql"
  | "updateGraph"
  | "upsertTrig"
  | "upsertTurtle"
  | "waitForIndex"
>;

export interface IntakeModelOptions {
  readonly definition: InquiryDefinition;
  readonly client: ModelClient;
  readonly root: string;
  readonly git?: GitRunner;
  readonly flureeExecutable?: string;
}

export interface ModelIntakeReport {
  readonly ledger: string;
  readonly definitionHash: string;
  readonly modelHash: string;
  readonly evidenceHash: string;
  readonly evidence: InquiryCheckpointEvidence;
  readonly checkpointId: string;
  readonly controlHashes: Readonly<Record<string, string>>;
  readonly controlTransactions: readonly ModelControlTransaction[];
  readonly facts: readonly string[];
  readonly sources: readonly ModelSourceAttestation[];
  readonly validation: string;
  readonly checkpoint: unknown;
  readonly semantic?: SemanticMaterialization;
}

export interface ModelControlsReceipt {
  readonly definitionHash: string;
  readonly ledger: string;
  readonly modelHash: string;
  readonly controlHashes: Readonly<Record<string, string>>;
  readonly controlTransactions: readonly ModelControlTransaction[];
  readonly sources: readonly ModelSourceAttestation[];
  readonly validation: string;
}

export type ModelControlsReport = ModelControlsReceipt;

export interface ModelControlTransaction {
  readonly commit: string;
  readonly format: "trig" | "turtle";
  readonly path: string;
  readonly t: number;
  readonly transaction?: string;
}

export interface PreparedModel {
  readonly definition: string;
  readonly definitionHash: string;
  readonly ledger: string;
  readonly authored: AuthoredModel;
  readonly controlEntries: readonly (readonly [string, string, "trig" | "turtle"])[];
  readonly controlHashes: Readonly<Record<string, string>>;
  readonly modelHash: string;
  readonly sources: readonly ModelSourceAttestation[];
  readonly validation: string;
  readonly materialization?: string;
  readonly materializationHash?: string;
}

const installedControlReceipts = new WeakMap<ModelControlsReceipt, ModelClient>();

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function responseRows(response: unknown): readonly unknown[] {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) return [];
  if (Array.isArray(response.result)) return response.result;
  if (isRecord(response.results) && Array.isArray(response.results.bindings)) {
    return response.results.bindings;
  }
  return isRecord(response.result) ? responseRows(response.result) : [];
}

function rowValue(row: unknown, name: string, index: number): unknown {
  if (Array.isArray(row)) return row[index];
  if (!isRecord(row)) return undefined;
  return row[name] ?? row[`?${name}`];
}

function literalValue(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return value["@value"] ?? value.value ?? value;
}

interface ExistingCheckpoint {
  readonly transaction: string;
  readonly t: number;
  readonly address?: string;
}

async function existingCheckpoint(
  client: ModelClient,
  definition: InquiryDefinition,
  checkpointId: string,
  expected: {
    readonly definitionHash: string;
    readonly evidenceHash: string;
    readonly modelHash: string;
  }
): Promise<ExistingCheckpoint | undefined> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: transactionMetadataSource(definition.ledger),
    select: ["?transaction", "?definitionHash", "?evidenceHash", "?modelHash", "?t", "?address"],
    where: [
      {
        "@id": "?transaction",
        "meta:inquiryCheckpoint": { "@id": checkpointId },
        "meta:definitionHash": "?definitionHash",
        "meta:evidenceHash": "?evidenceHash",
        "meta:inquiryComplete": true,
        "meta:modelHash": "?modelHash",
        "f:t": "?t",
      },
      ["optional", { "@id": "?transaction", "f:address": "?address" }],
    ],
    orderBy: [["asc", "?t"]],
    limit: 2,
    reasoning: "none",
  });
  const rows = responseRows(response);
  if (rows.length > 1) {
    throw new Error(
      `Inquiry checkpoint '${checkpointId}' has more than one completion transaction`
    );
  }
  const row = rows[0];
  if (row === undefined) return undefined;
  const transaction = literalValue(rowValue(row, "transaction", 0));
  const definitionHash = literalValue(rowValue(row, "definitionHash", 1));
  const checkpointEvidenceHash = literalValue(rowValue(row, "evidenceHash", 2));
  const modelHash = literalValue(rowValue(row, "modelHash", 3));
  const rawT = literalValue(rowValue(row, "t", 4));
  const address = literalValue(rowValue(row, "address", 5));
  const t =
    typeof rawT === "number"
      ? rawT
      : typeof rawT === "string" && rawT.trim() !== ""
        ? Number(rawT)
        : Number.NaN;
  if (
    typeof transaction !== "string" ||
    definitionHash !== expected.definitionHash ||
    checkpointEvidenceHash !== expected.evidenceHash ||
    modelHash !== expected.modelHash ||
    !Number.isSafeInteger(t) ||
    t < 0 ||
    (address !== undefined && typeof address !== "string")
  ) {
    throw new Error(`Inquiry checkpoint '${checkpointId}' has conflicting completion metadata`);
  }
  return {
    transaction,
    t,
    ...(address === undefined ? {} : { address }),
  };
}

function assertModelBoundary(options: IntakeModelOptions, prepared?: PreparedModel): void {
  if (options.client.ledger !== options.definition.ledger) {
    throw new Error(
      `Fluree client ledger '${options.client.ledger}' does not match definition '${options.definition.ledger}'`
    );
  }
  if (
    prepared !== undefined &&
    (prepared.definition !== options.definition.id ||
      prepared.definitionHash !== inquiryDefinitionHash(options.definition) ||
      prepared.ledger !== options.definition.ledger)
  ) {
    throw new Error("Prepared model does not belong to this inquiry definition");
  }
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonValue);
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function jsonObject(value: unknown, field: string): JsonObject {
  if (!isRecord(value) || !isJsonValue(value)) {
    throw new Error(`${field} must contain one JSON object`);
  }
  return value;
}

function compactTypeIncludes(node: Record<string, unknown>, expected: string): boolean {
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  return types.includes(expected);
}

function requiredString(node: Record<string, unknown>, key: string, source: string): string {
  const value = node[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${source} requires a non-empty ${key}`);
  }
  return value;
}

function literalInteger(value: unknown, key: string, source: string): number {
  const literal = isRecord(value) ? (value["@value"] ?? value.value) : value;
  const number =
    typeof literal === "number"
      ? literal
      : typeof literal === "string" && literal.trim() !== ""
        ? Number(literal)
        : Number.NaN;
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${source} requires a positive integer ${key}`);
  }
  return number;
}

function nodeIri(value: unknown, key: string, source: string): string {
  if (!isRecord(value) || typeof value["@id"] !== "string") {
    throw new Error(`${source} requires an IRI-valued ${key}`);
  }
  return value["@id"];
}

function sourcePath(value: string, source: string): string {
  if (
    value.includes("\\") ||
    value.includes("\0") ||
    isAbsolute(value) ||
    win32.isAbsolute(value) ||
    posix.normalize(value) !== value ||
    value === "." ||
    value === ".." ||
    value.startsWith("../")
  ) {
    throw new Error(`${source} has a non-repository-relative model:path`);
  }
  return value;
}

async function repositoryIdentity(definition: InquiryDefinition, root: string): Promise<string> {
  const path = resolve(root, definition.repository.definition);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not read repository definition ${definition.repository.definition}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (!isRecord(value) || typeof value.name !== "string" || value.name.trim() === "") {
    throw new Error(
      `Repository definition ${definition.repository.definition} requires a non-empty name`
    );
  }
  return value.name;
}

function sourceAnchorNodes(
  definition: InquiryDefinition,
  document: JsonObject
): readonly Record<string, unknown>[] {
  const graph = document["@graph"];
  if (!Array.isArray(graph)) return [];
  const expandedType = `${namespacesFor(definition).model}SourceAnchor`;
  return graph.filter(
    (node): node is Record<string, unknown> =>
      isRecord(node) &&
      (compactTypeIncludes(node, "model:SourceAnchor") || compactTypeIncludes(node, expandedType))
  );
}

function verifySection(
  lines: readonly string[],
  section: string | undefined,
  lineStart: number,
  lineEnd: number,
  locator: string
): void {
  if (section === undefined) return;
  const expected = section.trim().toLocaleLowerCase("en-US");
  const headings = lines
    .slice(lineStart - 1, lineEnd)
    .filter((line) => /^#{1,6}\s+/u.test(line))
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/u, "")
        .replace(/\s+#+\s*$/u, "")
        .trim()
        .toLocaleLowerCase("en-US")
    );
  if (!headings.some((heading) => heading === expected || heading.startsWith(`${expected} `))) {
    throw new Error(`Source section '${section}' does not resolve inside ${locator}`);
  }
}

/** Verify one reviewed source anchor against an exact committed blob and line range. */
export function verifyModelSource(
  definition: InquiryDefinition,
  node: Record<string, unknown>,
  options: {
    readonly repository: string;
    readonly git: GitRunner;
  }
): ModelSourceAttestation {
  const id = requiredString(node, "@id", "model:SourceAnchor");
  const repository = requiredString(node, "model:repository", id);
  const sha = assertGitObjectId(requiredString(node, "model:gitSha", id), `${id} git SHA`);
  const path = sourcePath(requiredString(node, "model:path", id), id);
  const locator = requiredString(node, "model:locator", id);
  const sourceRevision = nodeIri(node["model:sourceRevision"], "model:sourceRevision", id);
  const lineStart = literalInteger(node["model:lineStart"], "model:lineStart", id);
  const lineEnd = literalInteger(node["model:lineEnd"], "model:lineEnd", id);
  const section =
    node["model:section"] === undefined ? undefined : requiredString(node, "model:section", id);
  if (repository !== options.repository) {
    throw new Error(
      `Source repository '${repository}' must equal definition '${options.repository}'`
    );
  }
  if (lineEnd < lineStart) {
    throw new Error(`${id} model:lineEnd must not precede model:lineStart`);
  }
  const expectedLocator = `${repository}@${sha}:${path}#L${lineStart}-L${lineEnd}`;
  if (locator !== expectedLocator) {
    throw new Error(`Source locator '${locator}' must equal '${expectedLocator}'`);
  }
  const expectedRevision = inquiryIri(definition, "git:commit", sha);
  if (sourceRevision !== expectedRevision) {
    throw new Error(`Source revision '${sourceRevision}' must equal '${expectedRevision}'`);
  }

  options.git.text(["cat-file", "-e", `${sha}^{commit}`]);
  const blob = assertGitObjectId(
    options.git.text(["rev-parse", `${sha}:${path}`]).trim(),
    `${id} blob`
  );
  const type = options.git.text(["cat-file", "-t", blob]).trim();
  if (type !== "blob") throw new Error(`Source is not a blob at ${locator}`);
  const content = options.git.text(["show", `${sha}:${path}`]);
  const lines = content.split(/\r?\n/u);
  if (lines.at(-1) === "") lines.pop();
  if (lineEnd > lines.length) {
    throw new Error(
      `Source line range ${lineStart}-${lineEnd} exceeds ${lines.length} lines at ${locator}`
    );
  }
  verifySection(lines, section, lineStart, lineEnd, locator);
  return {
    id,
    locator,
    repository,
    revision: sha,
    path,
    lineStart,
    lineEnd,
    ...(section === undefined ? {} : { section }),
    blob,
    contentHash: evidenceHash(content),
  };
}

/** Verify every reviewed source anchor in the integrated fact set. */
export async function attestModelSources(
  definition: InquiryDefinition,
  documents: readonly JsonObject[],
  options: {
    readonly root: string;
    readonly git?: GitRunner;
  }
): Promise<readonly ModelSourceAttestation[]> {
  integratedModelDocument(documents);
  const repository = await repositoryIdentity(definition, options.root);
  const git = options.git ?? createGitRunner(options.root);
  const nodes = documents.flatMap((document) => sourceAnchorNodes(definition, document));
  if (nodes.length === 0) {
    throw new Error("Reviewed model facts contain no model:SourceAnchor nodes");
  }
  return nodes.map((node) => verifyModelSource(definition, node, { repository, git }));
}

/**
 * Compose reviewed JSON-LD files into one native transaction document.
 *
 * Contexts are admitted only when repeated terms agree exactly. One top-level
 * context is necessary because Fluree resolves compact IRIs inside nested edge
 * annotations from the transaction context. Native SHACL then sees every
 * cross-file relationship against the complete fact set atomically.
 */
export function integratedModelDocument(documents: readonly JsonObject[]): JsonObject {
  let context: Record<string, JsonValue> | undefined;
  const graph: JsonValue[] = [];
  for (const [index, document] of documents.entries()) {
    const documentContext = document["@context"];
    if (!isRecord(documentContext) || !isJsonValue(documentContext)) {
      throw new Error(`Model facts document ${index} requires an object @context`);
    }
    const contextRecord = documentContext as Record<string, JsonValue>;
    const contextKeyword = Object.keys(contextRecord).find((term) => term.startsWith("@"));
    if (contextKeyword !== undefined) {
      throw new Error(
        `Model facts document ${index} must not use context keyword '${contextKeyword}'`
      );
    }
    if (context === undefined) {
      context = contextRecord;
    } else if (!isDeepStrictEqual(context, contextRecord)) {
      throw new Error(`Model facts document ${index} must use the exact shared top-level @context`);
    }
    const documentGraph = document["@graph"];
    if (!Array.isArray(documentGraph)) {
      throw new Error(`Model facts document ${index} requires an @graph array`);
    }
    for (const [nodeIndex, value] of documentGraph.entries()) {
      if (!isRecord(value) || !isJsonValue(value)) {
        throw new Error(`Model facts document ${index} node ${nodeIndex} requires an object`);
      }
      if ("@context" in value) {
        throw new Error(
          `Model facts document ${index} node ${nodeIndex} must not declare a local @context`
        );
      }
      graph.push(value);
    }
  }
  if (context === undefined) {
    throw new Error("Reviewed model facts require at least one JSON-LD document");
  }
  return { "@context": context, "@graph": graph };
}

function modelTransactionParts(
  definition: InquiryDefinition,
  documents: readonly JsonObject[]
): {
  readonly context: JsonObject;
  readonly nodes: readonly JsonObject[];
} {
  const integrated = integratedModelDocument(documents);
  const context = integrated["@context"];
  const graph = integrated["@graph"];
  if (!isRecord(context) || !Array.isArray(graph) || !graph.every(isRecord)) {
    throw new Error("Integrated reviewed facts did not produce one native JSON-LD graph");
  }
  for (const [term, iri] of Object.entries(contextFor(definition))) {
    if (context[term] !== iri) {
      throw new Error(
        `Reviewed model facts must declare canonical context term '${term}' as '${iri}'`
      );
    }
  }
  return {
    context: context as JsonObject,
    nodes: graph as readonly JsonObject[],
  };
}

/** Load authored controls and reviewed facts without interpreting their semantics. */
export async function loadAuthoredModel(
  definition: InquiryDefinition,
  root: string
): Promise<AuthoredModel> {
  const read = (path: string) => readFile(resolve(root, path), "utf8");
  const [ontology, rules, shapes, config, factsText, materialization] = await Promise.all([
    read(definition.model.ontology),
    read(definition.model.rules),
    read(definition.model.shapes),
    read(definition.model.config),
    Promise.all(definition.model.facts.map(read)),
    definition.model.materialization === undefined
      ? Promise.resolve(undefined)
      : read(definition.model.materialization),
  ]);
  const facts = factsText.map((text, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(
        `Invalid JSON-LD in ${definition.model.facts[index]}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return jsonObject(parsed, definition.model.facts[index]);
  });
  return {
    controls: { ontology, rules, shapes, config },
    facts,
    ...(materialization === undefined ? {} : { materialization }),
  };
}

function assertFlureeVersion(executable: string, root: string): void {
  const output = execFileSync(executable, ["--version"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (output.trim() !== `fluree ${SUPPORTED_FLUREE_VERSION}`) {
    throw new Error(
      `Model validation requires Fluree ${SUPPORTED_FLUREE_VERSION}; received '${output.trim()}'`
    );
  }
}

/** Run the pinned native SHACL validator over the integrated reviewed fact graph. */
export async function validateIntegratedModel(
  documents: readonly JsonObject[],
  shapes: string,
  options: ValidateModelOptions
): Promise<string> {
  const executable = options.executable ?? "fluree";
  assertFlureeVersion(executable, options.root);
  const directory = await mkdtemp(join(tmpdir(), "temporal-inquiry-model-"));
  const factsPath = join(directory, "integrated-model.jsonld");
  const shapesPath = join(directory, "shapes.ttl");
  try {
    await Promise.all([
      writeFile(factsPath, `${JSON.stringify(integratedModelDocument(documents), null, 2)}\n`),
      writeFile(shapesPath, shapes),
    ]);
    return execFileSync(
      executable,
      ["validate", factsPath, "--shacl", shapesPath, "--format", "table", "--no-color"],
      {
        cwd: options.root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function requireNativeShapeRejection(
  executable: string,
  root: string,
  shapesPath: string,
  factsPath: string,
  label: string
): Promise<void> {
  try {
    execFileSync(
      executable,
      ["validate", factsPath, "--shacl", shapesPath, "--format", "table", "--no-color"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    if (isRecord(error) && error.status === 1) return;
    throw error;
  }
  throw new Error(`Native SHACL must reject an incomplete ${label}`);
}

function requireNativeShapeAcceptance(
  executable: string,
  root: string,
  shapesPath: string,
  factsPath: string
): void {
  try {
    execFileSync(
      executable,
      ["validate", factsPath, "--shacl", shapesPath, "--format", "table", "--no-color"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    throw new Error(
      `Native SHACL rejected the canonical kernel marker fixture: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Ask Fluree itself whether the consumer shapes protect the kernel markers.
 *
 * This is a behavioral probe, not a Turtle parser: authored shapes must reject
 * incomplete checkpoint and projection nodes through the pinned native engine.
 */
export async function validateKernelShapes(
  definition: InquiryDefinition,
  shapes: string,
  options: ValidateModelOptions
): Promise<void> {
  const executable = options.executable ?? "fluree";
  assertFlureeVersion(executable, options.root);
  const directory = await mkdtemp(join(tmpdir(), "temporal-inquiry-kernel-shapes-"));
  const shapesPath = join(directory, "shapes.ttl");
  const canonicalPath = join(directory, "canonical-kernel-markers.jsonld");
  const context = contextFor(definition);
  const historyGeneration = inquiryIri(definition, "git:history-generation", "shape-probe-history");
  const observedCommit = inquiryIri(
    definition,
    "git:commit",
    "0123456789abcdef0123456789abcdef01234567"
  );
  const frameAttestation = inquiryIri(definition, "frame:lineage-attestation", "shape-probe-frame");
  const legacyFrameAttestation = inquiryIri(
    definition,
    "frame:attestation",
    "shape-probe-legacy-frame"
  );
  const frameGeneration = inquiryIri(definition, "frame:generation", "shape-probe-generation");
  const frameObservation = inquiryIri(definition, "frame:observation", "shape-probe-observation");
  const projectionGeneration = inquiryIri(
    definition,
    "model:projection-generation",
    "shape-probe-projection"
  );
  const projectionNode = inquiryIri(definition, "model:projection-node", "shape-probe-node");
  const canonicalProjection: JsonObject = {
    "@id": projectionGeneration,
    "@type": "model:ProjectionGeneration",
    "model:projectionVersion": "shape-probe-v1",
    "model:sourceId": "shape-probe",
    "model:observedCommit": { "@id": observedCommit },
    "model:historyGeneration": { "@id": historyGeneration },
    "model:node": { "@id": projectionNode },
    "model:complete": true,
  };
  const canonicalCheckpoint: JsonObject = {
    "@id": inquiryIri(definition, "model:shape-probe", "checkpoint-complete"),
    "@type": "model:InquiryCheckpoint",
    "model:definitionHash": "a".repeat(64),
    "model:evidenceHash": "b".repeat(64),
    "model:modelHash": "c".repeat(64),
    "model:evidenceVersion": "checkpoint-evidence-v2",
    "model:modelFile": "model.trig",
    "model:observedCommit": { "@id": observedCommit },
    "model:historyGeneration": { "@id": historyGeneration },
    "model:projectionGeneration": { "@id": projectionGeneration },
    "model:frameAttestation": { "@id": frameAttestation },
    "model:frameGeneration": { "@id": frameGeneration },
    "model:frameObservation": { "@id": frameObservation },
    "model:complete": true,
  };
  const legacyCheckpoint: JsonObject = {
    "@id": inquiryIri(definition, "model:shape-probe", "checkpoint-legacy-complete"),
    "@type": "model:InquiryCheckpoint",
    "model:definitionHash": "d".repeat(64),
    "model:evidenceHash": "e".repeat(64),
    "model:modelHash": "f".repeat(64),
    "model:modelFile": "legacy-model.trig",
    "model:observedCommit": { "@id": observedCommit },
    "model:historyGeneration": { "@id": historyGeneration },
    "model:projectionGeneration": { "@id": projectionGeneration },
    "model:frameAttestation": { "@id": legacyFrameAttestation },
    "model:complete": true,
  };
  const requiredProperties = [
    {
      label: "model:InquiryCheckpoint",
      node: canonicalCheckpoint,
      properties: [
        "model:definitionHash",
        "model:evidenceHash",
        "model:modelHash",
        "model:evidenceVersion",
        "model:modelFile",
        "model:observedCommit",
        "model:historyGeneration",
        "model:projectionGeneration",
        "model:frameAttestation",
        "model:frameGeneration",
        "model:frameObservation",
        "model:complete",
      ],
    },
    {
      label: "model:ProjectionGeneration",
      node: canonicalProjection,
      properties: [
        "model:projectionVersion",
        "model:sourceId",
        "model:observedCommit",
        "model:historyGeneration",
        "model:node",
        "model:complete",
      ],
    },
  ] as const;
  const missingFixtures = requiredProperties.flatMap(({ label, node, properties }) =>
    properties.map((property) => {
      const incomplete = { ...node };
      delete incomplete[property];
      return {
        label: `${label} without ${property}`,
        path: join(
          directory,
          `missing-${label.split(":").at(-1)?.toLowerCase()}-${property
            .split(":")
            .at(-1)
            ?.toLowerCase()}.jsonld`
        ),
        value: {
          "@context": context,
          "@graph": [
            incomplete,
            ...(label === "model:InquiryCheckpoint"
              ? [canonicalProjection, legacyCheckpoint]
              : [legacyCheckpoint]),
          ],
        } satisfies JsonObject,
      };
    })
  );
  try {
    await Promise.all([
      writeFile(shapesPath, shapes),
      writeFile(
        canonicalPath,
        `${JSON.stringify(
          {
            "@context": context,
            "@graph": [canonicalProjection, legacyCheckpoint, canonicalCheckpoint],
          },
          null,
          2
        )}\n`
      ),
      ...missingFixtures.map((fixture) =>
        writeFile(fixture.path, `${JSON.stringify(fixture.value, null, 2)}\n`)
      ),
    ]);
    requireNativeShapeAcceptance(executable, options.root, shapesPath, canonicalPath);
    for (const fixture of missingFixtures) {
      await requireNativeShapeRejection(
        executable,
        options.root,
        shapesPath,
        fixture.path,
        fixture.label
      );
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** Read, attest, validate, and hash one immutable authored-model snapshot. */
export async function prepareModel(options: IntakeModelOptions): Promise<PreparedModel> {
  const { definition } = options;
  assertModelBoundary(options);
  const authored = await loadAuthoredModel(definition, options.root);
  modelTransactionParts(definition, authored.facts);
  const sources = await attestModelSources(definition, authored.facts, {
    root: options.root,
    git: options.git,
  });
  const validation = await validateIntegratedModel(authored.facts, authored.controls.shapes, {
    root: options.root,
    executable: options.flureeExecutable,
  });
  await validateKernelShapes(definition, authored.controls.shapes, {
    root: options.root,
    executable: options.flureeExecutable,
  });
  const controlEntries = [
    [definition.model.ontology, authored.controls.ontology, "trig"],
    [definition.model.shapes, authored.controls.shapes, "turtle"],
    [definition.model.rules, authored.controls.rules, "trig"],
    [definition.model.config, authored.controls.config, "trig"],
  ] as const;
  const controlHashes = Object.fromEntries(
    controlEntries.map(([path, content]) => [path, evidenceHash(content)])
  );
  const modelHash = evidenceHash(
    JSON.stringify({
      controls: controlEntries.map(([path, content, format], index) => ({
        format,
        hash: evidenceHash(content),
        path,
        role: ["ontology", "shapes", "rules", "config"][index],
      })),
      facts: integratedModelDocument(authored.facts),
      ...(authored.materialization === undefined
        ? {}
        : {
            materialization: {
              hash: evidenceHash(authored.materialization),
              path: definition.model.materialization,
            },
          }),
    })
  );
  return deepFreeze({
    definition: definition.id,
    definitionHash: inquiryDefinitionHash(definition),
    ledger: definition.ledger,
    authored,
    controlEntries,
    controlHashes,
    modelHash,
    sources,
    validation,
    ...(authored.materialization === undefined
      ? {}
      : {
          materialization: authored.materialization,
          materializationHash: evidenceHash(authored.materialization),
        }),
  });
}

async function writeModelControls(
  client: ModelClient,
  controlEntries: readonly (readonly [string, string, "trig" | "turtle"])[]
): Promise<readonly ModelControlTransaction[]> {
  const transactions: ModelControlTransaction[] = [];
  for (const [path, document, format] of controlEntries) {
    const response =
      format === "turtle"
        ? await client.upsertTurtle(document, true)
        : await client.upsertTrig(document, true);
    transactions.push(controlTransaction(response, path, format));
  }
  return transactions;
}

function controlTransaction(
  response: unknown,
  path: string,
  format: "trig" | "turtle"
): ModelControlTransaction {
  const tracked = isRecord(response) ? response : undefined;
  const result = tracked === undefined || !isRecord(tracked.result) ? undefined : tracked.result;
  const rawT = tracked?.t ?? result?.t;
  const rawCommit =
    tracked?.commit ??
    (isRecord(result?.commit) ? result.commit.hash : undefined) ??
    result?.commit_id ??
    undefined;
  const rawTransaction = tracked?.transaction ?? result?.["tx-id"];
  const t =
    typeof rawT === "number"
      ? rawT
      : typeof rawT === "string" && rawT.trim() !== ""
        ? Number(rawT)
        : Number.NaN;
  if (!Number.isSafeInteger(t) || t < 0 || typeof rawCommit !== "string" || rawCommit === "") {
    throw new Error(
      `Fluree did not return an exact transaction receipt for model control '${path}'`
    );
  }
  if (
    rawTransaction !== undefined &&
    (typeof rawTransaction !== "string" || rawTransaction === "")
  ) {
    throw new Error(`Fluree returned an invalid transaction identity for model control '${path}'`);
  }
  return Object.freeze({
    commit: rawCommit,
    format,
    path,
    t,
    ...(rawTransaction === undefined ? {} : { transaction: rawTransaction }),
  });
}

function modelControlTransactionIri(
  definition: InquiryDefinition,
  hash: string,
  transaction: ModelControlTransaction
): string {
  return inquiryIri(
    definition,
    "model:control-transaction",
    evidenceHash(JSON.stringify({ hash, ...transaction }))
  );
}

function semanticMaterializationNode(materialization: SemanticMaterialization): JsonObject {
  return {
    "@id": materialization.id,
    "@type": "model:SemanticMaterialization",
    "model:semanticGraph": { "@id": materialization.graph },
    "model:materializationQueryHash": materialization.queryHash,
    "model:semanticContentHash": materialization.contentHash,
    "model:modelHash": materialization.modelHash,
    "model:baseT": materialization.baseT,
    "model:materializedT": materialization.materializedT,
    "model:materializedNodeCount": materialization.nodeCount,
    "model:complete": true,
  };
}

function referenceValue(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return value["@id"] ?? literalValue(value);
}

function expandedReferenceValue(definition: InquiryDefinition, value: unknown): unknown {
  const reference = referenceValue(value);
  if (typeof reference !== "string") return reference;
  const separator = reference.indexOf(":");
  if (separator <= 0) return reference;
  const namespace = contextFor(definition)[reference.slice(0, separator)];
  return namespace === undefined ? reference : `${namespace}${reference.slice(separator + 1)}`;
}

async function checkpointControlTransactions(
  client: ModelClient,
  definition: InquiryDefinition,
  checkpointId: string,
  checkpointT: number,
  snapshot: PreparedModel
): Promise<readonly ModelControlTransaction[]> {
  const from = `${definition.ledger}@t:${checkpointT}`;
  const expectedCount = snapshot.controlEntries.length;
  const linkResponse = await client.query({
    "@context": contextFor(definition),
    from,
    select: ["?control"],
    where: {
      "@id": checkpointId,
      "model:controlTransaction": { "@id": "?control" },
    },
    orderBy: [["asc", "?control"]],
    limit: expectedCount + 1,
    reasoning: "none",
  });
  const linkedControls = responseRows(linkResponse).map((row) =>
    expandedReferenceValue(definition, rowValue(row, "control", 0))
  );
  if (
    linkedControls.length !== expectedCount ||
    linkedControls.some((control) => typeof control !== "string" || control === "") ||
    new Set(linkedControls).size !== linkedControls.length
  ) {
    throw new Error(
      `Inquiry checkpoint '${checkpointId}' does not bind exactly one receipt for every model control`
    );
  }

  const receiptResponse = await client.query({
    "@context": contextFor(definition),
    from,
    select: ["?control", "?commit", "?controlHash", "?format", "?path", "?t", "?transaction"],
    where: [
      {
        "@id": checkpointId,
        "model:controlTransaction": { "@id": "?control" },
      },
      {
        "@id": "?control",
        "@type": "model:ControlTransaction",
        "model:commit": "?commit",
        "model:controlHash": "?controlHash",
        "model:format": "?format",
        "model:path": "?path",
        "model:t": "?t",
      },
      ["optional", { "@id": "?control", "model:transaction": "?transaction" }],
    ],
    orderBy: [["asc", "?control"]],
    limit: expectedCount + 1,
    reasoning: "none",
  });
  const rows = responseRows(receiptResponse);
  if (rows.length !== expectedCount) {
    throw new Error(
      `Inquiry checkpoint '${checkpointId}' has incomplete or ambiguous model control receipts`
    );
  }

  const remainingControls = new Set(linkedControls);
  const receiptsByPath = new Map<string, ModelControlTransaction>();
  for (const row of rows) {
    const control = expandedReferenceValue(definition, rowValue(row, "control", 0));
    const commit = literalValue(rowValue(row, "commit", 1));
    const hash = literalValue(rowValue(row, "controlHash", 2));
    const format = literalValue(rowValue(row, "format", 3));
    const path = literalValue(rowValue(row, "path", 4));
    const rawT = literalValue(rowValue(row, "t", 5));
    const rawTransaction = literalValue(rowValue(row, "transaction", 6));
    const transaction = rawTransaction === null ? undefined : rawTransaction;
    const t =
      typeof rawT === "number"
        ? rawT
        : typeof rawT === "string" && rawT.trim() !== ""
          ? Number(rawT)
          : Number.NaN;
    if (
      typeof control !== "string" ||
      !remainingControls.delete(control) ||
      typeof commit !== "string" ||
      commit === "" ||
      typeof hash !== "string" ||
      (format !== "trig" && format !== "turtle") ||
      typeof path !== "string" ||
      !Number.isSafeInteger(t) ||
      t < 0 ||
      (transaction !== undefined && (typeof transaction !== "string" || transaction === ""))
    ) {
      throw new Error(`Inquiry checkpoint '${checkpointId}' has an invalid model control receipt`);
    }
    const preparedControl = snapshot.controlEntries.find(([preparedPath]) => preparedPath === path);
    if (
      preparedControl === undefined ||
      preparedControl[2] !== format ||
      snapshot.controlHashes[path] !== hash ||
      receiptsByPath.has(path)
    ) {
      throw new Error(
        `Inquiry checkpoint '${checkpointId}' binds a model control receipt outside its model`
      );
    }
    const receipt = Object.freeze({
      commit,
      format,
      path,
      t,
      ...(transaction === undefined ? {} : { transaction }),
    });
    if (control !== modelControlTransactionIri(definition, hash, receipt)) {
      throw new Error(
        `Inquiry checkpoint '${checkpointId}' binds a model control receipt with a conflicting identity`
      );
    }
    receiptsByPath.set(path, receipt);
  }
  if (remainingControls.size !== 0) {
    throw new Error(
      `Inquiry checkpoint '${checkpointId}' has incomplete or ambiguous model control receipts`
    );
  }
  return Object.freeze(
    snapshot.controlEntries.map(([path]) => {
      const receipt = receiptsByPath.get(path);
      if (receipt === undefined) {
        throw new Error(
          `Inquiry checkpoint '${checkpointId}' does not bind model control '${path}'`
        );
      }
      return receipt;
    })
  );
}

export async function assertNativeModelControls(
  client: Pick<ModelClient, "query">,
  definition: InquiryDefinition
): Promise<void> {
  const f = "https://ns.flur.ee/db#";
  const config = configGraphIri(definition.ledger);
  const rules = namespacesFor(definition).graphs.rules;
  const configSource = {
    "@id": definition.ledger,
    graph: config,
  } satisfies JsonObject;
  const configRows = responseRows(
    await client.query({
      "@context": { f },
      from: configSource,
      select: ["?config"],
      where: {
        "@id": "?config",
        "@type": "f:LedgerConfig",
      },
      limit: 2,
      reasoning: "none",
    })
  );
  if (configRows.length !== 1) {
    throw new Error("Fluree's native config graph must contain exactly one f:LedgerConfig");
  }
  const response = await client.query({
    "@context": { f },
    from: configSource,
    select: ["?config"],
    where: [
      {
        "@id": "?config",
        "@type": "f:LedgerConfig",
        "f:reasoningDefaults": { "@id": "?reasoning" },
        "f:datalogDefaults": { "@id": "?datalog" },
        "f:shaclDefaults": { "@id": "?shacl" },
        "f:transactDefaults": { "@id": "?transact" },
      },
      {
        "@id": "?reasoning",
        "f:overrideControl": { "@id": "f:OverrideAll" },
      },
      {
        "@id": "?datalog",
        "f:datalogEnabled": true,
        "f:rulesSource": { "@id": "?rulesRef" },
        "f:allowQueryTimeRules": false,
        "f:overrideControl": { "@id": "f:OverrideNone" },
      },
      {
        "@id": "?rulesRef",
        "f:graphSource": { "@id": "?rulesSource" },
      },
      {
        "@id": "?rulesSource",
        "f:graphSelector": { "@id": rules },
      },
      {
        "@id": "?shacl",
        "f:shaclEnabled": true,
        "f:shapesSource": { "@id": "?shapesRef" },
        "f:validationMode": { "@id": "f:ValidationReject" },
        "f:overrideControl": { "@id": "f:OverrideNone" },
      },
      {
        "@id": "?shapesRef",
        "f:graphSource": { "@id": "?shapesSource" },
      },
      {
        "@id": "?shapesSource",
        "f:graphSelector": { "@id": "f:defaultGraph" },
      },
      {
        "@id": "?transact",
        "f:uniqueEnabled": true,
        "f:overrideControl": { "@id": "f:OverrideNone" },
      },
    ],
    limit: 2,
    reasoning: "none",
  });
  if (responseRows(response).length !== 1) {
    throw new Error(
      "Fluree's native config graph does not expose the required stored-rule, SHACL, uniqueness, and override controls"
    );
  }
  const graphOverrides = await client.query({
    "@context": { f },
    from: configSource,
    select: ["?value"],
    where: {
      "@id": "?config",
      "@type": "f:LedgerConfig",
      "f:graphOverrides": { "@id": "?value" },
    },
    limit: 1,
    reasoning: "none",
  });
  // Semantic closure is materialized during refresh; control reads stay factual.
  const reasoningModes = await client.query({
    "@context": { f },
    from: configSource,
    select: ["?value"],
    where: [
      {
        "@id": "?config",
        "@type": "f:LedgerConfig",
        "f:reasoningDefaults": { "@id": "?reasoning" },
      },
      {
        "@id": "?reasoning",
        "f:reasoningModes": "?value",
      },
    ],
    limit: 2,
    reasoning: "none",
  });
  if (responseRows(graphOverrides).length !== 0 || responseRows(reasoningModes).length !== 0) {
    throw new Error(
      "Fluree's native config graph must not add graph overrides or ledger-wide reasoning modes"
    );
  }
  const rulesResponse = await client.query({
    "@context": contextFor(definition),
    from: {
      "@id": definition.ledger,
      graph: rules,
    },
    select: ["?ruleNode"],
    where: {
      "@id": "?ruleNode",
      "f:rule": "?rule",
    },
    limit: 1,
    reasoning: "none",
  });
  if (responseRows(rulesResponse).length !== 1) {
    throw new Error("Fluree's configured stored rules graph contains no native Datalog rule");
  }
}

/**
 * Install native controls before any shaped evidence transaction.
 *
 * Fluree applies ledger configuration to subsequent transactions, so config is
 * deliberately the final control write. Bulk Git history has no SHACL target
 * and may precede this function; projections, dialogue, frames, and reviewed
 * facts must follow it.
 */
export async function installModelControls(
  options: IntakeModelOptions,
  prepared?: PreparedModel
): Promise<ModelControlsReport> {
  const snapshot = prepared ?? (await prepareModel(options));
  assertModelBoundary(options, snapshot);
  const controlTransactions = await writeModelControls(options.client, snapshot.controlEntries);
  await assertNativeModelControls(options.client, options.definition);
  const receipt: ModelControlsReceipt = deepFreeze({
    definitionHash: snapshot.definitionHash,
    ledger: options.definition.ledger,
    modelHash: snapshot.modelHash,
    controlHashes: snapshot.controlHashes,
    controlTransactions,
    sources: snapshot.sources,
    validation: snapshot.validation,
  });
  installedControlReceipts.set(receipt, options.client);
  return receipt;
}

/** Admit reviewed facts, then seal the sole complete inquiry checkpoint last. */
export async function intakeModel(
  options: IntakeModelOptions,
  evidence: InquiryCheckpointEvidence,
  controlsReceipt: ModelControlsReceipt,
  prepared?: PreparedModel
): Promise<ModelIntakeReport> {
  const { client, definition } = options;
  const snapshot = prepared ?? (await prepareModel(options));
  assertModelBoundary(options, snapshot);
  if (
    installedControlReceipts.get(controlsReceipt) !== client ||
    controlsReceipt.definitionHash !== snapshot.definitionHash ||
    controlsReceipt.ledger !== snapshot.ledger ||
    controlsReceipt.modelHash !== snapshot.modelHash ||
    JSON.stringify(controlsReceipt.controlHashes) !== JSON.stringify(snapshot.controlHashes)
  ) {
    throw new Error("Model checkpoint requires controls installed from this exact prepared model");
  }
  // Fluree 4.1.4 can expose a newly committed namespace through the novelty
  // overlay before every active binary index can resolve it. Checkpoint proof
  // therefore begins only after the staged history, projection, session, frame,
  // and control writes share one native indexed boundary.
  await client.waitForIndex();
  await assertNativeModelControls(client, definition);
  const baseEvidence = normalizeInquiryCheckpointEvidence(definition, evidence);
  if (
    baseEvidence.evidenceVersion !== "checkpoint-evidence-v2" ||
    baseEvidence.frameGeneration === undefined ||
    baseEvidence.frameObservation === undefined
  ) {
    throw new Error("New model checkpoints require complete frame lineage evidence v2");
  }
  if (baseEvidence.semanticMaterialization !== undefined) {
    throw new Error("Semantic materialization identity is owned by model intake");
  }
  await assertInquiryCheckpointEvidenceComplete(client, definition, baseEvidence);
  const integrated = modelTransactionParts(definition, snapshot.authored.facts);
  const checkpointKey = `${namespacesFor(definition).model}checkpointKey`;
  const controlNodes = controlsReceipt.controlTransactions.map((transaction) => {
    const hash = snapshot.controlHashes[transaction.path];
    if (hash === undefined) {
      throw new Error(`Model control transaction has no prepared hash for '${transaction.path}'`);
    }
    return {
      "@id": modelControlTransactionIri(definition, hash, transaction),
      "@type": "model:ControlTransaction",
      "model:commit": transaction.commit,
      "model:controlHash": hash,
      "model:format": transaction.format,
      "model:path": transaction.path,
      "model:t": transaction.t,
      ...(transaction.transaction === undefined
        ? {}
        : { "model:transaction": transaction.transaction }),
    } satisfies JsonObject;
  });
  let semantic: SemanticMaterialization | undefined;
  if (snapshot.materialization !== undefined) {
    await client.insert([...integrated.nodes, ...controlNodes], {
      context: integrated.context,
      metadata: {
        "f:message": "Stage reviewed temporal inquiry model",
        "meta:definitionHash": snapshot.definitionHash,
        "meta:modelHash": snapshot.modelHash,
      },
    });
    await client.waitForIndex();
    semantic = await refreshSemanticMaterialization({
      client,
      definition,
      modelHash: snapshot.modelHash,
      query: snapshot.materialization,
    });
  }
  const normalizedEvidence = normalizeInquiryCheckpointEvidence(definition, {
    ...baseEvidence,
    ...(semantic === undefined ? {} : { semanticMaterialization: semantic.id }),
  });
  const checkpointEvidenceHash = inquiryCheckpointEvidenceHash(
    definition,
    snapshot.modelHash,
    normalizedEvidence
  );
  const checkpointId = inquiryCheckpointIri(definition, snapshot.modelHash, normalizedEvidence);
  const prior = await existingCheckpoint(client, definition, checkpointId, {
    definitionHash: snapshot.definitionHash,
    evidenceHash: checkpointEvidenceHash,
    modelHash: snapshot.modelHash,
  });
  if (prior !== undefined) {
    await assertInquiryCheckpointEvidenceComplete(
      client,
      definition,
      normalizedEvidence,
      `${definition.ledger}@t:${prior.t}`
    );
    const controlTransactions = await checkpointControlTransactions(
      client,
      definition,
      checkpointId,
      prior.t,
      snapshot
    );
    return {
      ledger: definition.ledger,
      definitionHash: snapshot.definitionHash,
      modelHash: snapshot.modelHash,
      evidenceHash: checkpointEvidenceHash,
      evidence: normalizedEvidence,
      checkpointId,
      controlHashes: snapshot.controlHashes,
      controlTransactions,
      facts: definition.model.facts,
      sources: snapshot.sources,
      validation: snapshot.validation,
      ...(semantic === undefined ? {} : { semantic }),
      checkpoint: {
        existing: true,
        ...prior,
      },
    };
  }
  const completionAttempt = inquiryIri(definition, "model:checkpoint-completion", randomUUID());
  const sealedCheckpointNode: JsonObject = {
    "@id": checkpointId,
    "@type": "model:InquiryCheckpoint",
    "model:definitionHash": snapshot.definitionHash,
    "model:evidenceHash": checkpointEvidenceHash,
    "model:modelHash": snapshot.modelHash,
    "model:evidenceVersion": normalizedEvidence.evidenceVersion,
    "model:modelFile": [
      ...snapshot.controlEntries.map(([path]) => basename(path)),
      ...definition.model.facts.map((path) => basename(path)),
      ...(definition.model.materialization === undefined
        ? []
        : [basename(definition.model.materialization)]),
    ],
    "model:controlTransaction": controlNodes.map((node) => ({ "@id": node["@id"] })),
    "model:source": snapshot.sources.map((source) => ({ "@id": source.id })),
    "model:observedCommit": {
      "@id": inquiryIri(definition, "git:commit", normalizedEvidence.observedCommit),
    },
    "model:historyGeneration": {
      "@id": normalizedEvidence.historyGeneration,
    },
    ...(normalizedEvidence.projectionGenerations.length === 0
      ? {}
      : {
          "model:projectionGeneration": normalizedEvidence.projectionGenerations.map(
            (generation) => ({ "@id": generation })
          ),
        }),
    ...(normalizedEvidence.sessionGeneration === undefined
      ? {}
      : {
          "model:sessionGeneration": {
            "@id": normalizedEvidence.sessionGeneration,
          },
        }),
    "model:frameAttestation": {
      "@id": normalizedEvidence.frameAttestation,
    },
    "model:frameGeneration": {
      "@id": normalizedEvidence.frameGeneration,
    },
    "model:frameObservation": {
      "@id": normalizedEvidence.frameObservation,
    },
    ...(normalizedEvidence.semanticMaterialization === undefined
      ? {}
      : {
          "model:semanticMaterialization": {
            "@id": normalizedEvidence.semanticMaterialization,
          },
        }),
    "model:complete": true,
  };
  let raced = false;
  try {
    await client.insert(
      [
        ...(semantic === undefined ? [...integrated.nodes, ...controlNodes] : []),
        ...(semantic === undefined ? [] : [semanticMaterializationNode(semantic)]),
        sealedCheckpointNode,
        {
          "@id": completionAttempt,
          "@type": "model:CheckpointCompletion",
          "model:checkpoint": { "@id": checkpointId },
          "model:checkpointKey": { "@id": checkpointId },
        },
        {
          "@id": checkpointKey,
          "f:enforceUnique": true,
        },
      ],
      {
        context: integrated.context,
        metadata: {
          "f:message": "Complete temporal inquiry checkpoint",
          "meta:definitionHash": snapshot.definitionHash,
          "meta:evidenceHash": checkpointEvidenceHash,
          "meta:inquiryCheckpoint": { "@id": checkpointId },
          "meta:inquiryComplete": true,
          "meta:modelHash": snapshot.modelHash,
        },
        opts: {
          uniqueProperties: [checkpointKey],
        },
      }
    );
  } catch (error) {
    const winner = await existingCheckpoint(client, definition, checkpointId, {
      definitionHash: snapshot.definitionHash,
      evidenceHash: checkpointEvidenceHash,
      modelHash: snapshot.modelHash,
    });
    if (winner === undefined) throw error;
    raced = true;
  }
  const completion = await existingCheckpoint(client, definition, checkpointId, {
    definitionHash: snapshot.definitionHash,
    evidenceHash: checkpointEvidenceHash,
    modelHash: snapshot.modelHash,
  });
  if (completion === undefined) {
    throw new Error(`Inquiry checkpoint '${checkpointId}' did not record a completion transaction`);
  }
  await assertInquiryCheckpointEvidenceComplete(
    client,
    definition,
    normalizedEvidence,
    `${definition.ledger}@t:${completion.t}`
  );
  const controlTransactions = await checkpointControlTransactions(
    client,
    definition,
    checkpointId,
    completion.t,
    snapshot
  );
  return {
    ledger: definition.ledger,
    definitionHash: snapshot.definitionHash,
    modelHash: snapshot.modelHash,
    evidenceHash: checkpointEvidenceHash,
    evidence: normalizedEvidence,
    checkpointId,
    controlHashes: snapshot.controlHashes,
    controlTransactions,
    facts: definition.model.facts,
    sources: snapshot.sources,
    validation: snapshot.validation,
    ...(semantic === undefined ? {} : { semantic }),
    checkpoint: {
      existing: raced,
      ...completion,
    },
  };
}
