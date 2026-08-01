import { randomUUID } from "node:crypto";

import type { InquiryDefinition } from "./definition";
import type { FlureeClient, JsonObject } from "./fluree-client";
import { assertGitObjectId } from "./git";
import { assertHistoryObservation } from "./history";
import {
  contextFor,
  evidenceHash,
  inquiryIri,
  namespacesFor,
  sparqlIri,
  transactionMetadataSource,
} from "./namespaces";

/**
 * Neutral handoff shape for repository-owned syntax or session adapters.
 *
 * The kernel does not parse these sources or grant their observations semantic
 * identity. An adapter may hand over exact nodes only after it closes its own
 * generation and source-evidence contract.
 */
export interface CompleteProjectionEnvelope<Node extends JsonObject = JsonObject> {
  readonly schemaVersion: 1;
  readonly kind: "projection";
  readonly version: string;
  readonly generation: string;
  readonly source: {
    readonly id: string;
    readonly revision: string;
    readonly path?: string;
  };
  readonly nodes: readonly Node[];
  readonly complete: true;
}

export interface ProjectionIntakeReport {
  readonly existing: boolean;
  readonly ledger: string;
  readonly generation: string;
  readonly historyGeneration: string;
  readonly observedCommit: string;
  readonly nodes: number;
  readonly version: string;
}

export interface IntakeProjectionOptions<Node extends JsonObject = JsonObject> {
  readonly client: Pick<FlureeClient, "insert" | "ledger" | "query">;
  readonly definition: InquiryDefinition;
  readonly envelope: CompleteProjectionEnvelope<Node>;
  readonly historyGeneration: string;
}

export interface AssertProjectionGenerationImmutableOptions {
  readonly client: Pick<FlureeClient, "ledger" | "query">;
  readonly definition: InquiryDefinition;
  readonly generation: string;
  readonly snapshot?: string;
}

const PROJECTION_SUBJECT_BATCH_SIZE = 100;
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function responseRows(response: unknown, label: string): readonly unknown[] {
  if (Array.isArray(response)) return response;
  if (!isRecord(response)) {
    throw new Error(`Fluree returned an invalid ${label} response`);
  }
  if (Array.isArray(response.result)) return response.result;
  if (isRecord(response.results) && Array.isArray(response.results.bindings)) {
    return response.results.bindings;
  }
  if (isRecord(response.result)) {
    return responseRows(response.result, label);
  }
  throw new Error(`Fluree returned an invalid ${label} response`);
}

function rowValue(row: unknown, name: string, index: number): unknown {
  if (Array.isArray(row)) return row[index];
  if (!isRecord(row)) return undefined;
  return row[name] ?? row[`?${name}`];
}

function rdfValue(value: unknown): unknown {
  if (!isRecord(value)) return value;
  if (typeof value["@id"] === "string") return value["@id"];
  return value["@value"] ?? value.value ?? value;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Fluree returned a non-finite RDF term");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw new Error("Fluree returned an invalid RDF term");
}

export async function constantSubjectExpansions(
  client: Pick<FlureeClient, "query">,
  from: string,
  subjects: readonly string[],
  label: string
): Promise<readonly Record<string, unknown>[]> {
  if (
    subjects.length === 0 ||
    subjects.length > PROJECTION_SUBJECT_BATCH_SIZE ||
    new Set(subjects).size !== subjects.length
  ) {
    throw new Error(`Cannot issue an invalid ${label} subject batch`);
  }
  // Any RFC 3986 scheme is a valid context-free absolute IRI. Keep `did:`,
  // `tag:`, and repository-owned schemes valid rather than pretending that
  // only HTTP/URN identities are expanded; exact expected roots prevent a
  // compact alias from being substituted in a response.
  for (const subject of subjects) sparqlIri(subject, `${label} subject`);

  const response = await client.query({
    from,
    // With no context, these full-IRI hydration roots remain exact. Fluree
    // 4.1.4 lowers each root to a Sid and serves wildcard properties from SPOT.
    select: subjects.map((subject) => ({ [subject]: ["*"] })),
    reasoning: "none",
  });
  const rows = responseRows(response, label);
  const rawExpansions =
    subjects.length === 1 && rows.length === 1 && isRecord(rows[0])
      ? rows
      : subjects.length > 1 && rows.length === 1 && Array.isArray(rows[0])
        ? rows[0]
        : undefined;
  if (rawExpansions === undefined || rawExpansions.length !== subjects.length) {
    throw new Error(`Fluree returned an invalid ${label} response`);
  }

  const expected = new Set(subjects);
  const bySubject = new Map<string, Record<string, unknown>>();
  for (const expansion of rawExpansions) {
    if (!isRecord(expansion) || typeof expansion["@id"] !== "string") {
      throw new Error(`Fluree returned an invalid ${label} response`);
    }
    const subject = expansion["@id"];
    sparqlIri(subject, `${label} @id`);
    if (!expected.has(subject) || bySubject.has(subject)) {
      throw new Error(`Fluree returned an invalid ${label} response`);
    }
    bySubject.set(subject, expansion);
  }
  if (bySubject.size !== expected.size) {
    throw new Error(`Fluree returned an invalid ${label} response`);
  }
  return subjects.map((subject) => {
    const expansion = bySubject.get(subject);
    if (expansion === undefined) {
      throw new Error(`Fluree returned an invalid ${label} response`);
    }
    return expansion;
  });
}

function validateProjectionObjectValue(value: Record<string, unknown>, label: string): void {
  const keys = Object.keys(value);
  if ("@annotation" in value) {
    throw new Error(`${label} must not contain an edge annotation`);
  }
  if ("@id" in value) {
    if (keys.length !== 1 || typeof value["@id"] !== "string") {
      throw new Error(`${label} must be a direct IRI reference, not a nested node`);
    }
    if (value["@id"].startsWith("_:")) {
      throw new Error(`${label} must not reference a blank node`);
    }
    sparqlIri(value["@id"], `${label} @id`);
    return;
  }
  if (!("@value" in value)) {
    throw new Error(`${label} must not contain a nested or blank node`);
  }
  if (keys.some((key) => !["@value", "@type", "@language"].includes(key))) {
    throw new Error(`${label} must be a direct JSON-LD literal`);
  }
  const literal = value["@value"];
  if (
    literal === null ||
    !["boolean", "number", "string"].includes(typeof literal) ||
    (typeof literal === "number" && !Number.isFinite(literal))
  ) {
    throw new Error(`${label} must contain one finite JSON-LD literal value`);
  }
  if ("@type" in value && "@language" in value) {
    throw new Error(`${label} cannot contain both @type and @language`);
  }
  if ("@type" in value) {
    if (typeof value["@type"] !== "string") {
      throw new Error(`${label} @type must be an IRI`);
    }
    sparqlIri(value["@type"], `${label} @type`);
  }
  if (
    "@language" in value &&
    (typeof value["@language"] !== "string" || value["@language"].trim() === "")
  ) {
    throw new Error(`${label} @language must be a non-empty string`);
  }
}

function validateProjectionPropertyValue(value: unknown, label: string, insideArray = false): void {
  if (Array.isArray(value)) {
    if (insideArray) {
      throw new Error(`${label} must not contain a nested array`);
    }
    for (const [index, entry] of value.entries()) {
      validateProjectionPropertyValue(entry, `${label}[${index}]`, true);
    }
    return;
  }
  if (isRecord(value)) {
    validateProjectionObjectValue(value, label);
    return;
  }
  if (
    value === null ||
    !["boolean", "number", "string"].includes(typeof value) ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    throw new Error(`${label} must be a direct finite JSON-LD value`);
  }
}

function validateProjectionNode(node: JsonObject, index: number): void {
  const label = `Projection node ${index}`;
  if (typeof node["@id"] !== "string") {
    throw new Error(`${label} requires an absolute @id`);
  }
  if (node["@id"].startsWith("_:")) {
    throw new Error(`${label} must not be a blank node`);
  }
  sparqlIri(node["@id"], `${label} @id`);
  for (const [predicate, value] of Object.entries(node)) {
    if (predicate === "@id") continue;
    if (predicate === "@type") {
      const types = Array.isArray(value) ? value : [value];
      if (
        types.length === 0 ||
        types.some((type) => typeof type !== "string" || type.startsWith("_:"))
      ) {
        throw new Error(`${label} @type must contain only IRIs`);
      }
      for (const type of types) sparqlIri(type as string, `${label} @type`);
      continue;
    }
    if (predicate.startsWith("@")) {
      throw new Error(`${label} must not contain unsupported JSON-LD keyword '${predicate}'`);
    }
    sparqlIri(predicate, `${label} predicate`);
    validateProjectionPropertyValue(value, `${label} '${predicate}'`);
  }
}

function projectionIdentity<Node extends JsonObject>(
  definition: InquiryDefinition,
  envelope: Omit<CompleteProjectionEnvelope<Node>, "generation">,
  historyGeneration: string
): string {
  return inquiryIri(
    definition,
    "model:projection-generation",
    evidenceHash(
      JSON.stringify({
        complete: envelope.complete,
        historyGeneration,
        kind: envelope.kind,
        nodes: envelope.nodes,
        schemaVersion: envelope.schemaVersion,
        source: envelope.source,
        version: envelope.version,
      })
    )
  );
}

/** Derive the only accepted content-addressed identity for an adapter envelope. */
export function projectionGeneration<Node extends JsonObject>(
  definition: InquiryDefinition,
  envelope: Omit<CompleteProjectionEnvelope<Node>, "generation">,
  historyGeneration: string
): string {
  return projectionIdentity(definition, envelope, historyGeneration);
}

function validateProjectionEnvelope<Node extends JsonObject>(
  definition: InquiryDefinition,
  envelope: CompleteProjectionEnvelope<Node>,
  historyGeneration: string
): void {
  if (
    envelope.schemaVersion !== 1 ||
    envelope.kind !== "projection" ||
    envelope.complete !== true
  ) {
    throw new Error("Projection envelope must be one complete schema version 1 projection");
  }
  if (envelope.version.trim() === "" || envelope.version !== envelope.version.trim()) {
    throw new Error("Projection version must be a non-empty trimmed string");
  }
  if (envelope.source.id.trim() === "" || envelope.source.id !== envelope.source.id.trim()) {
    throw new Error("Projection source id must be a non-empty trimmed string");
  }
  assertGitObjectId(envelope.source.revision, "projection source revision");
  if (envelope.nodes.length === 0) {
    throw new Error("Projection envelope must contain at least one node");
  }
  for (const [index, node] of envelope.nodes.entries()) {
    validateProjectionNode(node, index);
  }
  const expected = projectionIdentity(definition, envelope, historyGeneration);
  if (envelope.generation !== expected) {
    throw new Error(`Projection generation must equal its exact content identity '${expected}'`);
  }
}

async function projectionGenerationPresent(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  envelope: CompleteProjectionEnvelope,
  historyGeneration: string
): Promise<boolean> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: definition.ledger,
    select: ["?generation"],
    where: {
      "@id": envelope.generation,
      "@type": "model:ProjectionGeneration",
      "model:projectionVersion": envelope.version,
      "model:sourceId": envelope.source.id,
      "model:observedCommit": {
        "@id": inquiryIri(definition, "git:commit", envelope.source.revision),
      },
      "model:historyGeneration": { "@id": historyGeneration },
      "model:complete": true,
    },
    limit: 1,
    reasoning: "none",
  });
  return responseRows(response, "projection generation lookup").length > 0;
}

async function assertProjectionSubjectsFresh(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  nodes: readonly JsonObject[]
): Promise<void> {
  for (let offset = 0; offset < nodes.length; offset += PROJECTION_SUBJECT_BATCH_SIZE) {
    const subjects = nodes
      .slice(offset, offset + PROJECTION_SUBJECT_BATCH_SIZE)
      .map((node) => String(node["@id"]));
    const expansions = await constantSubjectExpansions(
      client,
      definition.ledger,
      subjects,
      "projection subject ownership query"
    );
    for (const [index, expansion] of expansions.entries()) {
      if (
        expansion["@id"] !== subjects[index] ||
        Object.keys(expansion).some((key) => key !== "@id")
      ) {
        throw new Error(
          "Projection subjects must be fresh, generation-owned observations without ambient triples"
        );
      }
    }
  }
}

/**
 * Admit one repository-owned structural projection behind a generic complete marker.
 *
 * Habitat does not interpret the projected nodes. It only checks exact source
 * history, owns the content identity, and writes the completion marker in the
 * same native Fluree transaction.
 */
export async function intakeProjection<Node extends JsonObject>(
  options: IntakeProjectionOptions<Node>
): Promise<ProjectionIntakeReport> {
  const { client, definition, envelope, historyGeneration } = options;
  if (client.ledger !== definition.ledger) {
    throw new Error(
      `Fluree client ledger '${client.ledger}' does not match definition '${definition.ledger}'`
    );
  }
  validateProjectionEnvelope(definition, envelope, historyGeneration);
  await assertHistoryObservation({
    client,
    commit: envelope.source.revision,
    definition,
    generation: historyGeneration,
  });
  if (await projectionGenerationPresent(client, definition, envelope, historyGeneration)) {
    await assertProjectionGenerationImmutable({
      client,
      definition,
      generation: envelope.generation,
    });
    return {
      existing: true,
      ledger: definition.ledger,
      generation: envelope.generation,
      historyGeneration,
      observedCommit: envelope.source.revision,
      nodes: envelope.nodes.length,
      version: envelope.version,
    };
  }
  await assertProjectionSubjectsFresh(client, definition, envelope.nodes);
  const observedCommit = inquiryIri(definition, "git:commit", envelope.source.revision);
  const projectionKey = `${namespacesFor(definition).model}projectionKey`;
  const projectionNodeKey = `${namespacesFor(definition).model}node`;
  try {
    await client.insert(
      [
        ...envelope.nodes,
        {
          "@id": envelope.generation,
          "@type": "model:ProjectionGeneration",
          "model:projectionVersion": envelope.version,
          "model:sourceId": envelope.source.id,
          "model:observedCommit": { "@id": observedCommit },
          "model:historyGeneration": { "@id": historyGeneration },
          "model:node": envelope.nodes.map((node) => ({ "@id": node["@id"] })),
          ...(envelope.source.path === undefined
            ? {}
            : { "model:sourcePath": envelope.source.path }),
          "model:complete": true,
        },
        {
          "@id": inquiryIri(definition, "model:projection-completion", randomUUID()),
          "@type": "model:ProjectionCompletion",
          "model:projectionGeneration": { "@id": envelope.generation },
          "model:projectionKey": { "@id": envelope.generation },
        },
        {
          "@id": projectionKey,
          "f:enforceUnique": true,
        },
        {
          "@id": projectionNodeKey,
          "f:enforceUnique": true,
        },
      ],
      {
        context: contextFor(definition),
        metadata: {
          "f:message": `Complete structural projection ${envelope.version}`,
          "meta:job": "projection-intake",
          "meta:generation": { "@id": envelope.generation },
          "meta:gitSha": envelope.source.revision,
        },
        opts: {
          uniqueProperties: [projectionKey, projectionNodeKey],
        },
      }
    );
  } catch (error) {
    if (!(await projectionGenerationPresent(client, definition, envelope, historyGeneration))) {
      throw error;
    }
    await assertProjectionGenerationImmutable({
      client,
      definition,
      generation: envelope.generation,
    });
    return {
      existing: true,
      ledger: definition.ledger,
      generation: envelope.generation,
      historyGeneration,
      observedCommit: envelope.source.revision,
      nodes: envelope.nodes.length,
      version: envelope.version,
    };
  }
  return {
    existing: false,
    ledger: definition.ledger,
    generation: envelope.generation,
    historyGeneration,
    observedCommit: envelope.source.revision,
    nodes: envelope.nodes.length,
    version: envelope.version,
  };
}

async function projectionIntakeT(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  generation: string
): Promise<number> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: transactionMetadataSource(definition.ledger),
    select: ["?transaction", "?t"],
    where: {
      "@id": "?transaction",
      "meta:job": "projection-intake",
      "meta:generation": { "@id": generation },
      "f:t": "?t",
    },
    orderBy: [["asc", "?t"]],
    limit: 2,
    reasoning: "none",
  });
  const rows = responseRows(response, "projection intake transaction");
  if (rows.length === 0) {
    throw new Error(`Projection generation '${generation}' has no projection intake transaction`);
  }
  if (rows.length > 1) {
    throw new Error(
      `Projection generation '${generation}' has more than one projection intake transaction`
    );
  }
  const transaction = rdfValue(rowValue(rows[0], "transaction", 0));
  const rawT = rdfValue(rowValue(rows[0], "t", 1));
  const t =
    typeof rawT === "number"
      ? rawT
      : typeof rawT === "string" && rawT.trim() !== ""
        ? Number(rawT)
        : Number.NaN;
  if (typeof transaction !== "string" || !Number.isSafeInteger(t) || t < 0) {
    throw new Error(`Projection generation '${generation}' has invalid intake metadata`);
  }
  return t;
}

export function canonicalProjectionTriples(
  expansion: Record<string, unknown>,
  subject: string,
  label: string
): readonly string[] {
  if (expansion["@id"] !== subject) {
    throw new Error(`Fluree returned an invalid ${label} response`);
  }
  const triples = new Set<string>();
  for (const [rawPredicate, rawValues] of Object.entries(expansion)) {
    if (rawPredicate === "@id") continue;
    const predicate = rawPredicate === "@type" ? RDF_TYPE : rawPredicate;
    if (rawPredicate.startsWith("@") && rawPredicate !== "@type") {
      throw new Error(`${label} must not contain unsupported JSON-LD keyword '${rawPredicate}'`);
    }
    sparqlIri(predicate, `${label} predicate`);
    const values = Array.isArray(rawValues) ? rawValues : [rawValues];
    if (values.length === 0) {
      throw new Error(`${label} must not contain an empty predicate value set`);
    }
    for (const [index, value] of values.entries()) {
      const valueLabel = `${label} '${rawPredicate}'[${String(index)}]`;
      if (Array.isArray(value)) {
        throw new Error(`${valueLabel} must not contain a nested array`);
      }
      if (rawPredicate === "@type") {
        if (typeof value !== "string" || value.startsWith("_:")) {
          throw new Error(`${valueLabel} must be an IRI`);
        }
        sparqlIri(value, valueLabel);
      } else {
        validateProjectionPropertyValue(value, valueLabel);
      }
      triples.add(canonicalJson([subject, predicate, value]));
    }
  }
  return [...triples].sort();
}

interface ProjectionGenerationBoundary {
  readonly nodes: readonly string[];
  readonly triples: readonly string[];
}

async function projectionGenerationBoundary(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  generation: string,
  from: string
): Promise<ProjectionGenerationBoundary> {
  const [expansion] = await constantSubjectExpansions(
    client,
    from,
    [generation],
    "projection generation expansion"
  );
  const triples = canonicalProjectionTriples(
    expansion,
    generation,
    "Projection generation expansion"
  );
  const nodePredicate = `${namespacesFor(definition).model}node`;
  const rawNodes = expansion[nodePredicate];
  const nodeValues = Array.isArray(rawNodes) ? rawNodes : [rawNodes];
  if (rawNodes === undefined || nodeValues.length === 0) {
    throw new Error(`Projection generation '${generation}' has no projection nodes at '${from}'`);
  }
  const nodes = nodeValues.map((value) => {
    if (
      !isRecord(value) ||
      Object.keys(value).length !== 1 ||
      typeof value["@id"] !== "string" ||
      value["@id"].startsWith("_:")
    ) {
      throw new Error(`Projection generation '${generation}' contains an invalid node identity`);
    }
    sparqlIri(value["@id"], `Projection generation '${generation}' node`);
    return value["@id"];
  });
  return {
    nodes: [...new Set(nodes)].sort(),
    triples,
  };
}

async function projectionSubjectTriples(
  client: Pick<FlureeClient, "query">,
  from: string,
  nodeIds: readonly string[]
): Promise<readonly string[]> {
  const triples = new Set<string>();
  for (let offset = 0; offset < nodeIds.length; offset += PROJECTION_SUBJECT_BATCH_SIZE) {
    const subjects = nodeIds.slice(offset, offset + PROJECTION_SUBJECT_BATCH_SIZE);
    const expansions = await constantSubjectExpansions(
      client,
      from,
      subjects,
      "projection subject expansion"
    );
    for (const [index, expansion] of expansions.entries()) {
      for (const triple of canonicalProjectionTriples(
        expansion,
        subjects[index],
        "Projection subject expansion"
      )) {
        triples.add(triple);
      }
    }
  }
  return [...triples].sort();
}

/**
 * Prove that one completed projection still has its exact intake-time RDF boundary.
 *
 * The intake transaction fixes the historical comparison point. Membership and
 * every direct triple of the admitted subjects must match at the requested
 * checkpoint snapshot.
 */
export async function assertProjectionGenerationImmutable(
  options: AssertProjectionGenerationImmutableOptions
): Promise<void> {
  const { client, definition, generation } = options;
  if (client.ledger !== definition.ledger) {
    throw new Error(
      `Fluree client ledger '${client.ledger}' does not match definition '${definition.ledger}'`
    );
  }
  const generationPrefix = inquiryIri(definition, "model:projection-generation", "");
  if (!generation.startsWith(generationPrefix) || generation.length === generationPrefix.length) {
    throw new Error("Projection generation must be an identity from this inquiry");
  }
  sparqlIri(generation, "projection generation");
  const snapshot = options.snapshot ?? definition.ledger;
  const intakeT = await projectionIntakeT(client, definition, generation);
  const intakeSnapshot = `${definition.ledger}@t:${intakeT}`;
  const intakeGeneration = await projectionGenerationBoundary(
    client,
    definition,
    generation,
    intakeSnapshot
  );
  const checkpointGeneration = await projectionGenerationBoundary(
    client,
    definition,
    generation,
    snapshot
  );
  if (JSON.stringify(checkpointGeneration.nodes) !== JSON.stringify(intakeGeneration.nodes)) {
    throw new Error(
      `Projection generation '${generation}' node membership changed after its intake transaction`
    );
  }
  const intakeTriples = [
    ...new Set([
      ...intakeGeneration.triples,
      ...(await projectionSubjectTriples(client, intakeSnapshot, intakeGeneration.nodes)),
    ]),
  ].sort();
  const checkpointTriples = [
    ...new Set([
      ...checkpointGeneration.triples,
      ...(await projectionSubjectTriples(client, snapshot, checkpointGeneration.nodes)),
    ]),
  ].sort();
  if (JSON.stringify(checkpointTriples) !== JSON.stringify(intakeTriples)) {
    throw new Error(
      `Projection generation '${generation}' content changed after its intake transaction`
    );
  }
}
