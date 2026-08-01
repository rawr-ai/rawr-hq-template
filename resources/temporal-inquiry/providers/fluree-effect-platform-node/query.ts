import { readFile } from "node:fs/promises";

import {
  assertInquiryCheckpointEvidenceReceiptsComplete,
  type InquiryCheckpointEvidence,
  inquiryCheckpointEvidenceHash,
  inquiryCheckpointIri,
  inquiryDefinitionHash,
} from "./checkpoint";
import type { InquiryDefinition } from "./definition";
import type {
  FlureeClient,
  FlureeLedgerInfo,
  JsonObject,
  TrackedFlureeResponse,
} from "./fluree-client";
import { assertGitObjectId } from "./git";
import { type SemanticMaterialization, semanticMaterializationIri } from "./materialization";
import {
  contextFor,
  evidenceHash,
  inquiryIri,
  namespacesFor,
  semanticGraphIri,
  sparqlIri,
  transactionMetadataSource,
} from "./namespaces";
import { sparqlPragmas, sparqlTokens } from "./sparql";

export const REASONING_MODES = [
  "none",
  "rdfs",
  "owl2ql",
  "owl2rl",
  "owl-datalog",
  "datalog",
] as const;

export type ReasoningMode = (typeof REASONING_MODES)[number];

interface InquiryCheckpointBase {
  readonly ledger: string;
  readonly id: string;
  readonly transaction: string;
  readonly definitionHash: string;
  readonly evidenceHash: string;
  readonly modelHash: string;
  readonly observedCommit: string;
  readonly historyGeneration: string;
  readonly projectionGenerations: readonly string[];
  readonly sessionGeneration?: string;
  readonly frameAttestation: string;
  readonly semanticMaterialization?: string;
  readonly semantic?: SemanticMaterialization;
  readonly t: number;
  readonly address?: string;
}

/** A replayable predecessor checkpoint or one complete frame-lineage successor. */
export type InquiryCheckpoint = InquiryCheckpointBase &
  (
    | {
        readonly evidenceVersion: "checkpoint-evidence-v1";
        readonly frameGeneration?: never;
        readonly frameObservation?: never;
      }
    | {
        readonly evidenceVersion: "checkpoint-evidence-v2";
        readonly frameGeneration: string;
        readonly frameObservation: string;
      }
  );

export type CheckpointQuery =
  | {
      readonly kind: "jsonld";
      readonly body: JsonObject;
      readonly namedGraphs?: Readonly<Record<string, string>>;
      /** Refuse unless the checkpoint carries one complete semantic receipt. */
      readonly requiresSemantic?: boolean;
    }
  | {
      readonly kind: "sparql";
      /** Refuse unless the checkpoint carries one complete semantic receipt. */
      readonly requiresSemantic?: boolean;
      readonly build: (
        queryLedger: string,
        checkpoint: InquiryCheckpoint,
        semantic: CheckpointSemanticDataset | undefined
      ) => string;
    };

export interface CheckpointSemanticDataset {
  /** Persisted Fluree graph IRI, used as the structured-query graph selector. */
  readonly graph: string;
  /** Stable dataset graph name used by SPARQL GRAPH clauses. */
  readonly name: string;
  /** Snapshot-pinned graph source used by SPARQL FROM NAMED. */
  readonly source: string;
}

export const CHECKPOINT_SPARQL_PLACEHOLDERS = [
  "__QUERY_LEDGER__",
  "__SEMANTIC_SOURCE__",
  "__SEMANTIC_GRAPH__",
  "__INQUIRY_CHECKPOINT__",
  "__HISTORY_GENERATION__",
  "__FRAME_GENERATION__",
  "__FRAME_OBSERVATION__",
  "__FRAME_ATTESTATION__",
  "__OBSERVED_COMMIT__",
] as const;

function sparqlPlaceholderIri(value: string, label: string): string {
  return sparqlIri(value, label);
}

/** Render agent-authored SPARQL with only checkpoint-owned identity placeholders. */
export function renderCheckpointSparql(
  definition: InquiryDefinition,
  template: string,
  queryLedger: string,
  checkpoint: InquiryCheckpoint,
  semantic: CheckpointSemanticDataset | undefined
): string {
  const requiresSemantic =
    template.includes("__SEMANTIC_SOURCE__") || template.includes("__SEMANTIC_GRAPH__");
  if (requiresSemantic && semantic === undefined) {
    throw new Error("Checkpoint SPARQL semantic placeholders require a sealed materialization");
  }
  const requiresLineage =
    template.includes("__FRAME_GENERATION__") || template.includes("__FRAME_OBSERVATION__");
  if (
    requiresLineage &&
    (checkpoint.frameGeneration === undefined || checkpoint.frameObservation === undefined)
  ) {
    throw new Error("Checkpoint SPARQL frame-lineage placeholders require evidence v2");
  }
  const replacements: Readonly<Record<(typeof CHECKPOINT_SPARQL_PLACEHOLDERS)[number], string>> = {
    __QUERY_LEDGER__: sparqlPlaceholderIri(queryLedger, "query ledger"),
    __SEMANTIC_SOURCE__:
      semantic === undefined
        ? "__SEMANTIC_SOURCE__"
        : sparqlPlaceholderIri(semantic.source, "semantic source"),
    __SEMANTIC_GRAPH__:
      semantic === undefined
        ? "__SEMANTIC_GRAPH__"
        : sparqlPlaceholderIri(semantic.name, "semantic graph"),
    __INQUIRY_CHECKPOINT__: sparqlPlaceholderIri(checkpoint.id, "inquiry checkpoint"),
    __HISTORY_GENERATION__: sparqlPlaceholderIri(
      checkpoint.historyGeneration,
      "history generation"
    ),
    __FRAME_GENERATION__:
      checkpoint.frameGeneration === undefined
        ? "__FRAME_GENERATION__"
        : sparqlPlaceholderIri(checkpoint.frameGeneration, "frame generation"),
    __FRAME_OBSERVATION__:
      checkpoint.frameObservation === undefined
        ? "__FRAME_OBSERVATION__"
        : sparqlPlaceholderIri(checkpoint.frameObservation, "frame observation"),
    __FRAME_ATTESTATION__: sparqlPlaceholderIri(checkpoint.frameAttestation, "frame attestation"),
    __OBSERVED_COMMIT__: sparqlPlaceholderIri(
      inquiryIri(definition, "git:commit", checkpoint.observedCommit),
      "observed commit"
    ),
  };
  let rendered = template;
  for (const placeholder of CHECKPOINT_SPARQL_PLACEHOLDERS) {
    if (rendered.includes(placeholder)) {
      rendered = rendered.replaceAll(placeholder, replacements[placeholder]);
    }
  }
  const unresolved = rendered.match(/__[A-Z][A-Z0-9_]*__/u)?.[0];
  if (unresolved !== undefined) {
    throw new Error(`Checkpoint SPARQL contains unsupported placeholder ${unresolved}`);
  }
  return rendered;
}

/** Build a guarded checkpoint query directly from agent-authored SPARQL text. */
export function checkpointSparqlQuery(
  definition: InquiryDefinition,
  template: string
): CheckpointQuery {
  const requiresSemantic =
    template.includes("__SEMANTIC_SOURCE__") || template.includes("__SEMANTIC_GRAPH__");
  return {
    kind: "sparql",
    requiresSemantic,
    build: (queryLedger, checkpoint, semantic) =>
      renderCheckpointSparql(definition, template, queryLedger, checkpoint, semantic),
  };
}

export interface CheckpointSparqlInput {
  readonly file?: string;
  /** Exact UTF-8 text already read from standard input by a CLI caller. */
  readonly stdin?: string;
}

/** Load exactly one agent-authored SPARQL source without interpreting it. */
export async function readCheckpointSparqlInput(input: CheckpointSparqlInput): Promise<string> {
  if ((input.file === undefined) === (input.stdin === undefined)) {
    throw new Error("Checkpoint SPARQL requires exactly one file or stdin source");
  }
  const sparql =
    input.file === undefined ? (input.stdin as string) : await readFile(input.file, "utf8");
  if (sparql.trim() === "") throw new Error("Checkpoint SPARQL source must not be empty");
  return sparql;
}

export type CurrentCheckpointQuery =
  | CheckpointQuery
  | ((checkpoint: InquiryCheckpoint) => CheckpointQuery);

type CheckpointQueryClient = Pick<FlureeClient, "ledger" | "query" | "sparql">;
type CurrentCheckpointQueryClient = CheckpointQueryClient & Pick<FlureeClient, "info">;

export interface QueryAtCheckpointOptions {
  readonly definition: InquiryDefinition;
  readonly client: CheckpointQueryClient;
  readonly checkpoint: InquiryCheckpoint;
  readonly query: CheckpointQuery;
}

export interface QueryCurrentInquiryCheckpointOptions {
  readonly definition: InquiryDefinition;
  readonly client: CurrentCheckpointQueryClient;
  readonly query: CurrentCheckpointQuery;
}

export type InquiryCheckpointSelector =
  | { readonly checkpoint: string }
  | { readonly t: number }
  | { readonly observedCommit: string };

export interface CheckpointQueryResult {
  readonly ledger: string;
  /** Physical Fluree dataset used to execute the admitted query. */
  readonly queryLedger: string;
  /** Immutable logical identity of the model checkpoint represented by the result. */
  readonly snapshotLedger: string;
  readonly inquiryCheckpoint: InquiryCheckpoint;
  readonly queryHash: string;
  readonly rules: readonly string[];
  readonly response: unknown;
  readonly timings: {
    readonly prepareMs: number;
    readonly proofMs: number;
    readonly executeMs: number;
    readonly totalMs: number;
  };
  /** Exact head observations guarding a current-ledger query. */
  readonly currentHead?: {
    readonly before: FlureeLedgerInfo;
    readonly after: FlureeLedgerInfo;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function responseRows(response: unknown): readonly unknown[] {
  if (Array.isArray(response)) return response;
  if (isRecord(response) && Array.isArray(response.result)) return response.result;
  return [];
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

function expandedInquiryIri(definition: InquiryDefinition, value: unknown): unknown {
  const literal = literalValue(value);
  return typeof literal === "string" && literal.startsWith("id:")
    ? `${definition.namespace}id/${literal.slice(3)}`
    : literal;
}

function requiredString(value: unknown, label: string): string {
  const literal = literalValue(value);
  if (typeof literal !== "string" || literal === "") {
    throw new Error(`Fluree returned an invalid ${label}`);
  }
  return literal;
}

async function readCheckpointEvidence(
  client: CheckpointQueryClient,
  definition: InquiryDefinition,
  checkpoint: {
    readonly id: string;
    readonly definitionHash: string;
    readonly evidenceHash: string;
    readonly modelHash: string;
    readonly t: number;
  }
): Promise<InquiryCheckpointEvidence> {
  // Checkpoint identity is asserted control evidence; semantic closure was materialized at refresh.
  const response = await client.query({
    "@context": contextFor(definition),
    from: `${definition.ledger}@t:${checkpoint.t}`,
    select: [
      "?observedCommit",
      "?historyGeneration",
      "?projectionGeneration",
      "?sessionGeneration",
      "?frameAttestation",
      "?semanticMaterialization",
      "?evidenceVersion",
      "?frameGeneration",
      "?frameObservation",
    ],
    where: [
      {
        "@id": checkpoint.id,
        "@type": "model:InquiryCheckpoint",
        "model:definitionHash": checkpoint.definitionHash,
        "model:evidenceHash": checkpoint.evidenceHash,
        "model:modelHash": checkpoint.modelHash,
        "model:observedCommit": { "@id": "?observedCommit" },
        "model:historyGeneration": { "@id": "?historyGeneration" },
        "model:frameAttestation": { "@id": "?frameAttestation" },
        "model:complete": true,
      },
      [
        "optional",
        {
          "@id": checkpoint.id,
          "model:projectionGeneration": { "@id": "?projectionGeneration" },
        },
      ],
      [
        "optional",
        {
          "@id": checkpoint.id,
          "model:evidenceVersion": "?evidenceVersion",
        },
      ],
      [
        "optional",
        {
          "@id": checkpoint.id,
          "model:frameGeneration": { "@id": "?frameGeneration" },
        },
      ],
      [
        "optional",
        {
          "@id": checkpoint.id,
          "model:frameObservation": { "@id": "?frameObservation" },
        },
      ],
      [
        "optional",
        {
          "@id": checkpoint.id,
          "model:sessionGeneration": { "@id": "?sessionGeneration" },
        },
      ],
      [
        "optional",
        {
          "@id": checkpoint.id,
          "model:semanticMaterialization": { "@id": "?semanticMaterialization" },
        },
      ],
    ],
    reasoning: "none",
  });
  const rows = responseRows(response);
  if (rows.length === 0) {
    throw new Error(`Inquiry checkpoint '${checkpoint.id}' is not complete at t:${checkpoint.t}`);
  }
  const observedCommitIri = requiredString(
    expandedInquiryIri(definition, rowValue(rows[0], "observedCommit", 0)),
    "checkpoint observed commit"
  );
  const commitPrefix = inquiryIri(definition, "git:commit", "");
  if (!observedCommitIri.startsWith(commitPrefix)) {
    throw new Error("Checkpoint observed commit is not an identity from this inquiry");
  }
  const observedCommit = assertGitObjectId(
    decodeURIComponent(observedCommitIri.slice(commitPrefix.length)),
    "checkpoint observed commit"
  );
  const historyGeneration = requiredString(
    expandedInquiryIri(definition, rowValue(rows[0], "historyGeneration", 1)),
    "checkpoint history generation"
  );
  const frameAttestation = requiredString(
    expandedInquiryIri(definition, rowValue(rows[0], "frameAttestation", 4)),
    "checkpoint frame attestation"
  );
  const projectionGenerations = [
    ...new Set(
      rows
        .map((row) => expandedInquiryIri(definition, rowValue(row, "projectionGeneration", 2)))
        .filter((value): value is string => typeof value === "string" && value !== "")
    ),
  ].sort();
  const sessionGenerations = [
    ...new Set(
      rows
        .map((row) => expandedInquiryIri(definition, rowValue(row, "sessionGeneration", 3)))
        .filter((value): value is string => typeof value === "string" && value !== "")
    ),
  ];
  if (sessionGenerations.length > 1) {
    throw new Error(`Inquiry checkpoint '${checkpoint.id}' links more than one session generation`);
  }
  const semanticMaterializations = [
    ...new Set(
      rows
        .map((row) => expandedInquiryIri(definition, rowValue(row, "semanticMaterialization", 5)))
        .filter((value): value is string => typeof value === "string" && value !== "")
    ),
  ];
  if (semanticMaterializations.length > 1) {
    throw new Error(`Inquiry checkpoint '${checkpoint.id}' links more than one materialization`);
  }
  const evidenceVersions = [
    ...new Set(
      rows
        .map((row) => literalValue(rowValue(row, "evidenceVersion", 6)))
        .filter((value): value is string => typeof value === "string" && value !== "")
    ),
  ];
  const frameGenerations = [
    ...new Set(
      rows
        .map((row) => expandedInquiryIri(definition, rowValue(row, "frameGeneration", 7)))
        .filter((value): value is string => typeof value === "string" && value !== "")
    ),
  ];
  const frameObservations = [
    ...new Set(
      rows
        .map((row) => expandedInquiryIri(definition, rowValue(row, "frameObservation", 8)))
        .filter((value): value is string => typeof value === "string" && value !== "")
    ),
  ];
  if (evidenceVersions.length > 1 || frameGenerations.length > 1 || frameObservations.length > 1) {
    throw new Error(`Inquiry checkpoint '${checkpoint.id}' has conflicting frame lineage receipts`);
  }
  const isLineage = evidenceVersions[0] === "checkpoint-evidence-v2";
  if (
    (evidenceVersions.length > 0 && !isLineage) ||
    (isLineage && (frameGenerations.length !== 1 || frameObservations.length !== 1)) ||
    (!isLineage && (frameGenerations.length !== 0 || frameObservations.length !== 0))
  ) {
    throw new Error(`Inquiry checkpoint '${checkpoint.id}' has an invalid evidence version`);
  }
  for (const [value, kind, label] of [
    [historyGeneration, "git:history-generation", "history generation"],
    [
      frameAttestation,
      isLineage ? "frame:lineage-attestation" : "frame:attestation",
      "frame attestation",
    ],
    ...(frameGenerations.length === 0
      ? []
      : [[frameGenerations[0], "frame:generation", "frame generation"] as const]),
    ...(frameObservations.length === 0
      ? []
      : [[frameObservations[0], "frame:observation", "frame observation"] as const]),
    ...projectionGenerations.map(
      (generation) => [generation, "model:projection-generation", "projection generation"] as const
    ),
    ...(sessionGenerations.length === 0
      ? []
      : [[sessionGenerations[0], "session-generation", "session generation"] as const]),
    ...(semanticMaterializations.length === 0
      ? []
      : [
          [
            semanticMaterializations[0],
            "model:semantic-materialization",
            "semantic materialization",
          ] as const,
        ]),
  ] as const) {
    const prefix = inquiryIri(definition, kind, "");
    if (!value.startsWith(prefix) || value.length === prefix.length) {
      throw new Error(`Checkpoint ${label} is not an identity from this inquiry`);
    }
  }
  const evidence: InquiryCheckpointEvidence = {
    observedCommit,
    historyGeneration,
    projectionGenerations,
    ...(sessionGenerations.length === 0 ? {} : { sessionGeneration: sessionGenerations[0] }),
    frameAttestation,
    ...(isLineage
      ? {
          evidenceVersion: "checkpoint-evidence-v2" as const,
          frameGeneration: frameGenerations[0],
          frameObservation: frameObservations[0],
        }
      : {}),
    ...(semanticMaterializations.length === 0
      ? {}
      : { semanticMaterialization: semanticMaterializations[0] }),
  };
  await assertInquiryCheckpointEvidenceReceiptsComplete(
    client,
    definition,
    evidence,
    `${definition.ledger}@t:${checkpoint.t}`
  );
  return evidence;
}

async function readCheckpointSemanticMaterialization(
  client: CheckpointQueryClient,
  definition: InquiryDefinition,
  checkpoint: {
    readonly id: string;
    readonly modelHash: string;
    readonly semanticMaterialization?: string;
    readonly t: number;
  }
): Promise<SemanticMaterialization | undefined> {
  if (definition.model?.materialization === undefined) return undefined;
  const response = await client.query({
    "@context": contextFor(definition),
    from: `${definition.ledger}@t:${checkpoint.t}`,
    select: [
      "?materialization",
      "?graph",
      "?queryHash",
      "?contentHash",
      "?modelHash",
      "?baseT",
      "?materializedT",
      "?nodeCount",
    ],
    where: [
      {
        "@id": checkpoint.id,
        "model:semanticMaterialization": { "@id": "?materialization" },
      },
      {
        "@id": "?materialization",
        "@type": "model:SemanticMaterialization",
        "model:semanticGraph": { "@id": "?graph" },
        "model:materializationQueryHash": "?queryHash",
        "model:semanticContentHash": "?contentHash",
        "model:modelHash": "?modelHash",
        "model:baseT": "?baseT",
        "model:materializedT": "?materializedT",
        "model:materializedNodeCount": "?nodeCount",
        "model:complete": true,
      },
    ],
    limit: 2,
    reasoning: "none",
  });
  const rows = responseRows(response);
  if (rows.length !== 1) {
    throw new Error("Checkpoint requires exactly one complete semantic materialization");
  }
  const row = rows[0];
  const id = requiredString(
    expandedInquiryIri(definition, rowValue(row, "materialization", 0)),
    "semantic materialization"
  );
  if (id !== checkpoint.semanticMaterialization) {
    throw new Error("Checkpoint semantic materialization link is inconsistent");
  }
  const graph = requiredString(
    literalValue(rowValue(row, "graph", 1)),
    "semantic materialization graph"
  );
  const queryHash = requiredString(
    literalValue(rowValue(row, "queryHash", 2)),
    "semantic materialization query hash"
  );
  const contentHash = requiredString(
    literalValue(rowValue(row, "contentHash", 3)),
    "semantic materialization content hash"
  );
  const modelHash = requiredString(
    literalValue(rowValue(row, "modelHash", 4)),
    "semantic materialization model hash"
  );
  const integers = [
    literalValue(rowValue(row, "baseT", 5)),
    literalValue(rowValue(row, "materializedT", 6)),
    literalValue(rowValue(row, "nodeCount", 7)),
  ].map((value) =>
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN
  );
  const [baseT, materializedT, nodeCount] = integers;
  if (
    graph !== semanticGraphIri(definition) ||
    modelHash !== checkpoint.modelHash ||
    !/^[0-9a-f]{64}$/u.test(queryHash) ||
    !/^[0-9a-f]{64}$/u.test(contentHash) ||
    !Number.isSafeInteger(baseT) ||
    baseT < 0 ||
    !Number.isSafeInteger(materializedT) ||
    materializedT < baseT ||
    materializedT > checkpoint.t ||
    !Number.isSafeInteger(nodeCount) ||
    nodeCount <= 0
  ) {
    throw new Error("Checkpoint links an invalid semantic materialization receipt");
  }
  const identity = {
    graph,
    queryHash,
    contentHash,
    modelHash,
    baseT,
    materializedT,
    nodeCount,
  };
  if (id !== semanticMaterializationIri(definition, identity)) {
    throw new Error("Semantic materialization receipt does not match its content identity");
  }
  return { id, ...identity };
}

async function assertSingleCheckpointCompletion(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  checkpointId: string,
  expectedTransaction: string,
  expectedT: number
): Promise<void> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: transactionMetadataSource(definition.ledger),
    select: ["?transaction", "?t"],
    where: {
      "@id": "?transaction",
      "meta:inquiryCheckpoint": { "@id": checkpointId },
      "meta:inquiryComplete": true,
      "f:t": "?t",
    },
    orderBy: [["asc", "?t"]],
    limit: 2,
    reasoning: "none",
  });
  const rows = responseRows(response);
  const transaction = literalValue(rowValue(rows[0], "transaction", 0));
  const rawT = literalValue(rowValue(rows[0], "t", 1));
  const t =
    typeof rawT === "number"
      ? rawT
      : typeof rawT === "string" && rawT.trim() !== ""
        ? Number(rawT)
        : Number.NaN;
  if (rows.length !== 1 || transaction !== expectedTransaction || t !== expectedT) {
    throw new Error(
      `Inquiry checkpoint '${checkpointId}' does not have one canonical completion transaction`
    );
  }
}

async function checkpointHasCanonicalCompletion(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  checkpointId: string
): Promise<boolean> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: transactionMetadataSource(definition.ledger),
    select: ["?transaction", "?t"],
    where: {
      "@id": "?transaction",
      "meta:inquiryCheckpoint": { "@id": checkpointId },
      "meta:inquiryComplete": true,
      "f:t": "?t",
    },
    orderBy: [["asc", "?t"]],
    limit: 2,
    reasoning: "none",
  });
  const rows = responseRows(response);
  if (rows.length === 0) return false;
  const transaction = literalValue(rowValue(rows[0], "transaction", 0));
  const rawT = literalValue(rowValue(rows[0], "t", 1));
  const t =
    typeof rawT === "number"
      ? rawT
      : typeof rawT === "string" && rawT.trim() !== ""
        ? Number(rawT)
        : Number.NaN;
  if (rows.length !== 1 || typeof transaction !== "string" || !Number.isSafeInteger(t) || t < 0) {
    throw new Error(
      `Inquiry checkpoint '${checkpointId}' does not have one canonical completion transaction`
    );
  }
  return true;
}

/**
 * Fail closed at the query boundary even though Fluree 4.1.4 may accept
 * caller-supplied rules despite a stored-rule-only ledger configuration.
 */
export function assertNoQueryTimeRules(body: unknown): void {
  if (isRecord(body) && Object.hasOwn(body, "rules")) {
    throw new Error("Query-time rules are disabled; use the configured stored rule graph");
  }
}

const FLUREE_NAMESPACE = "https://ns.flur.ee/db#";
const GRAPH_SOURCE_IRI = `${FLUREE_NAMESPACE}graphSource`;

interface JsonLdContextScope {
  readonly terms: ReadonlyMap<string, string>;
  readonly vocabulary?: string;
}

const ABSOLUTE_IRI = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const JSON_LD_TERM_KEYWORDS = new Set([
  "@id",
  "@type",
  "@language",
  "@container",
  "@list",
  "@set",
  "@reverse",
  "@index",
  "@nest",
  "@json",
  "@none",
]);

function unsupportedJsonLdContext(detail: string): never {
  throw new Error(`JSON-LD checkpoint query has an unsupported @context construct: ${detail}`);
}

function contextTermTarget(term: string, definition: unknown): string {
  if (typeof definition === "string") return definition;
  if (!isRecord(definition)) {
    return unsupportedJsonLdContext(`term '${term}' must map to a string or @id object`);
  }
  const members = Object.keys(definition);
  if (
    members.some((member) => member !== "@id" && member !== "@prefix") ||
    typeof definition["@id"] !== "string" ||
    (definition["@prefix"] !== undefined && typeof definition["@prefix"] !== "boolean")
  ) {
    return unsupportedJsonLdContext(
      `term '${term}' may contain only a string @id and optional boolean @prefix`
    );
  }
  return definition["@id"];
}

function extendContextScope(value: unknown, parent: JsonLdContextScope): JsonLdContextScope {
  if (value === undefined) return parent;
  if (!isRecord(value)) {
    throw new Error("JSON-LD checkpoint queries require one inline object @context");
  }
  const definitions = new Map<string, string>();
  let vocabularyTarget: string | null | undefined;
  for (const [term, definition] of Object.entries(value)) {
    if (term.startsWith("@")) {
      if (term !== "@vocab") {
        return unsupportedJsonLdContext(`keyword '${term}' is not supported`);
      }
      if (definition !== null && typeof definition !== "string") {
        return unsupportedJsonLdContext("@vocab must be an IRI string or null");
      }
      vocabularyTarget = definition;
      continue;
    }
    if (term === "") {
      return unsupportedJsonLdContext("term names must not be empty");
    }
    definitions.set(term, contextTermTarget(term, definition));
  }

  const resolvedTerms = new Map(parent.terms);
  const resolvingTerms = new Set<string>();
  const termCache = new Map<string, string>();
  let resolvingVocabulary = false;
  let vocabularyResolved = false;
  let vocabulary = parent.vocabulary;

  function resolveVocabulary(): string | undefined {
    if (vocabularyResolved) return vocabulary;
    if (resolvingVocabulary) {
      return unsupportedJsonLdContext("@vocab contains a cyclic alias");
    }
    resolvingVocabulary = true;
    if (vocabularyTarget === null) {
      vocabulary = undefined;
    } else if (vocabularyTarget !== undefined) {
      vocabulary = expandContextIri(vocabularyTarget, false);
      if (!ABSOLUTE_IRI.test(vocabulary) || vocabulary.startsWith("@")) {
        return unsupportedJsonLdContext("@vocab must resolve to an absolute IRI");
      }
    }
    resolvingVocabulary = false;
    vocabularyResolved = true;
    return vocabulary;
  }

  function resolveTerm(term: string): string | undefined {
    const cached = termCache.get(term);
    if (cached !== undefined) return cached;
    const target = definitions.get(term);
    if (target === undefined) return parent.terms.get(term);
    if (resolvingTerms.has(term)) {
      return unsupportedJsonLdContext(`term '${term}' contains a cyclic alias`);
    }
    resolvingTerms.add(term);
    const resolved = expandContextIri(target, true);
    resolvingTerms.delete(term);
    termCache.set(term, resolved);
    return resolved;
  }

  function expandContextIri(target: string, useVocabulary: boolean): string {
    if (target.startsWith("@")) {
      if (!JSON_LD_TERM_KEYWORDS.has(target)) {
        return unsupportedJsonLdContext(`keyword alias '${target}' is not supported`);
      }
      return target;
    }
    const separator = target.indexOf(":");
    if (separator >= 0) {
      const prefix = target.slice(0, separator);
      const suffix = target.slice(separator + 1);
      if (prefix === "_" || suffix.startsWith("//")) return target;
      const expandedPrefix = resolveTerm(prefix);
      if (expandedPrefix !== undefined) {
        if (expandedPrefix.startsWith("@")) {
          return unsupportedJsonLdContext(
            `compact IRI '${target}' uses keyword alias '${prefix}' as a prefix`
          );
        }
        return `${expandedPrefix}${suffix}`;
      }
      if (ABSOLUTE_IRI.test(target)) return target;
      return unsupportedJsonLdContext(`compact IRI '${target}' has no inline prefix definition`);
    }
    const expandedTerm = resolveTerm(target);
    if (expandedTerm !== undefined) return expandedTerm;
    const activeVocabulary = useVocabulary ? resolveVocabulary() : undefined;
    if (activeVocabulary !== undefined) return `${activeVocabulary}${target}`;
    return unsupportedJsonLdContext(`term target '${target}' is relative or undefined`);
  }

  resolveVocabulary();
  for (const term of definitions.keys()) {
    const resolved = resolveTerm(term);
    if (resolved === undefined) {
      return unsupportedJsonLdContext(`term '${term}' could not be resolved`);
    }
    resolvedTerms.set(term, resolved);
  }
  return {
    terms: resolvedTerms,
    ...(vocabulary === undefined ? {} : { vocabulary }),
  };
}

function isGraphSourceKey(key: string, scope: JsonLdContextScope): boolean {
  const direct = scope.terms.get(key);
  if (direct !== undefined) return direct === GRAPH_SOURCE_IRI;
  const separator = key.indexOf(":");
  if (separator >= 0) {
    const suffix = key.slice(separator + 1);
    if (key.slice(0, separator) === "_" || suffix.startsWith("//")) {
      return key === GRAPH_SOURCE_IRI;
    }
    const prefix = scope.terms.get(key.slice(0, separator));
    return prefix === undefined
      ? key === GRAPH_SOURCE_IRI
      : `${prefix}${suffix}` === GRAPH_SOURCE_IRI;
  }
  return scope.vocabulary === undefined
    ? key === GRAPH_SOURCE_IRI
    : `${scope.vocabulary}${key}` === GRAPH_SOURCE_IRI;
}

function assertJsonLdValueUsesKernelDataset(
  value: unknown,
  scope: JsonLdContextScope,
  visiting: WeakSet<object>
): void {
  if (value === null || typeof value !== "object") return;
  if (visiting.has(value)) {
    throw new Error("JSON-LD checkpoint query body must not contain cyclic values");
  }
  visiting.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) assertJsonLdValueUsesKernelDataset(entry, scope, visiting);
    visiting.delete(value);
    return;
  }
  if (!isRecord(value)) {
    visiting.delete(value);
    return;
  }
  const nestedScope = extendContextScope(value["@context"], scope);
  for (const [key, entry] of Object.entries(value)) {
    if (key === "@context") continue;
    if (key === "from" || key === "fromNamed" || key === "from-named") {
      throw new Error(`JSON-LD checkpoint query body must not set '${key}'`);
    }
    if (isGraphSourceKey(key, nestedScope)) {
      throw new Error(
        "JSON-LD checkpoint query body must not select an external Fluree graph source"
      );
    }
    assertJsonLdValueUsesKernelDataset(entry, nestedScope, visiting);
  }
  visiting.delete(value);
}

/**
 * Keep every JSON-LD dataset and specialized graph source inside the kernel.
 *
 * Fluree permits BM25/vector graph-source clauses inside `where`, so checking
 * only the top-level `from` field would let a checkpoint query read live data.
 */
function assertJsonLdDatasetIsKernelOwned(body: JsonObject): void {
  assertJsonLdValueUsesKernelDataset(
    body,
    {
      terms: new Map([["f", FLUREE_NAMESPACE]]),
    },
    new WeakSet()
  );
}

const ALTERNATE_SPARQL_SOURCE_KEYWORDS = new Set([
  "INSERT",
  "DELETE",
  "SERVICE",
  "USING",
  "WITH",
  "LOAD",
  "CLEAR",
  "CREATE",
  "DROP",
  "COPY",
  "MOVE",
  "ADD",
]);

/**
 * Verify the narrow dataset contract for repository-authored SPARQL.
 */
function assertSparqlUsesOnlyQueryLedger(
  sparql: string,
  queryLedger: string,
  semantic: CheckpointSemanticDataset | undefined
): void {
  const pragmas = sparqlPragmas(sparql);
  if (pragmas.length !== 1 || pragmas[0] !== "REASONING: NONE") {
    throw new Error(
      "Checkpoint SPARQL must explicitly disable reasoning with exactly one reasoning:none pragma"
    );
  }
  const queryLedgerIri = sparqlIri(queryLedger, "query ledger");
  const tokens = sparqlTokens(sparql);
  const fromOffsets = tokens.flatMap((token, index) =>
    token.kind === "word" && token.value === "FROM" ? [index] : []
  );
  const defaultSources = fromOffsets.filter(
    (offset) => tokens[offset + 1]?.kind === "iri" && tokens[offset + 1]?.value === queryLedgerIri
  );
  const semanticSourceIri =
    semantic === undefined
      ? undefined
      : sparqlIri(semantic.source, "semantic materialization source");
  const namedSources = fromOffsets.filter(
    (offset) =>
      tokens[offset + 1]?.kind === "word" &&
      tokens[offset + 1]?.value === "NAMED" &&
      tokens[offset + 2]?.kind === "iri" &&
      tokens[offset + 2]?.value === semanticSourceIri
  );
  const expectedSourceCount = semantic === undefined ? 1 : 2;
  if (
    fromOffsets.length !== expectedSourceCount ||
    defaultSources.length !== 1 ||
    namedSources.length !== (semantic === undefined ? 0 : 1)
  ) {
    throw new Error(
      semantic === undefined
        ? `Checkpoint SPARQL must contain exactly one default FROM ${queryLedgerIri} clause and no FROM NAMED clauses`
        : `Checkpoint SPARQL must contain exactly FROM ${queryLedgerIri} and FROM NAMED ${String(
            semanticSourceIri
          )}`
    );
  }
  const graphOffsets = tokens.flatMap((token, index) =>
    token.kind === "word" && token.value === "GRAPH" ? [index] : []
  );
  if (
    semantic === undefined
      ? graphOffsets.length !== 0
      : graphOffsets.length === 0 ||
        graphOffsets.some(
          (offset) =>
            tokens[offset + 1]?.kind !== "iri" ||
            tokens[offset + 1]?.value !== sparqlIri(semantic.name, "semantic dataset graph name")
        )
  ) {
    throw new Error(
      semantic === undefined
        ? "Checkpoint SPARQL must not use GRAPH"
        : "Checkpoint SPARQL GRAPH clauses must select only the sealed semantic graph"
    );
  }
  const alternateSource = tokens.find(
    (token) => token.kind === "word" && ALTERNATE_SPARQL_SOURCE_KEYWORDS.has(token.value)
  );
  if (alternateSource !== undefined) {
    throw new Error(
      `Checkpoint SPARQL must not use alternate source-selection construct ${alternateSource.value}`
    );
  }
}

/** Reject a response whose native reasoning engine reported a capped result. */
export function assertReasoningComplete<T>(response: T): T {
  if (!isRecord(response) || !isRecord(response.reasoning)) return response;
  if (response.reasoning.capped === true) {
    throw new Error(
      `Fluree reasoning was capped (${
        typeof response.reasoning.capped_reason === "string"
          ? response.reasoning.capped_reason
          : "unknown limit"
      })`
    );
  }
  return response;
}

/** Resolve a complete inquiry bundle from Fluree's transaction metadata. */
export async function resolveInquiryCheckpoint(
  client: CheckpointQueryClient,
  definition: InquiryDefinition,
  selector?: InquiryCheckpointSelector
): Promise<InquiryCheckpoint> {
  if (client.ledger !== definition.ledger) {
    throw new Error(
      `Fluree client ledger '${client.ledger}' does not match definition '${definition.ledger}'`
    );
  }
  if (selector !== undefined && "observedCommit" in selector) {
    const observedCommit = assertGitObjectId(
      selector.observedCommit,
      "checkpoint selector observed commit"
    );
    const candidates = responseRows(
      await client.query({
        "@context": contextFor(definition),
        from: definition.ledger,
        select: ["?checkpoint"],
        where: {
          "@id": "?checkpoint",
          "@type": "model:InquiryCheckpoint",
          "model:definitionHash": inquiryDefinitionHash(definition),
          "model:observedCommit": {
            "@id": inquiryIri(definition, "git:commit", observedCommit),
          },
          "model:complete": true,
        },
        limit: 101,
        reasoning: "none",
      })
    )
      .map((row) => expandedInquiryIri(definition, rowValue(row, "checkpoint", 0)))
      .filter((value): value is string => typeof value === "string");
    const uniqueCandidates = [...new Set(candidates)];
    if (uniqueCandidates.length > 100) {
      throw new Error(
        `Observed commit ${observedCommit} has more than 100 checkpoint candidates; select an exact checkpoint`
      );
    }
    const completion = await Promise.all(
      uniqueCandidates.map((checkpoint) =>
        checkpointHasCanonicalCompletion(client, definition, checkpoint)
      )
    );
    const canonicalCandidates = uniqueCandidates.filter((_, index) => completion[index]);
    const resolved = await Promise.all(
      canonicalCandidates.map((checkpoint) =>
        resolveInquiryCheckpoint(client, definition, { checkpoint })
      )
    );
    const latest = resolved.sort((left, right) => right.t - left.t)[0];
    if (latest === undefined) {
      throw new Error(`No complete inquiry checkpoint observes commit ${observedCommit}`);
    }
    return latest;
  }
  const checkpointSelector =
    selector !== undefined && "checkpoint" in selector
      ? inquiryIdentityForSelector(definition, selector.checkpoint)
      : undefined;
  const tSelector = selector !== undefined && "t" in selector ? selector.t : undefined;
  if (tSelector !== undefined && (!Number.isSafeInteger(tSelector) || tSelector < 0)) {
    throw new Error("Checkpoint selector t must be a non-negative safe integer");
  }
  const response = await client.query({
    "@context": contextFor(definition),
    from: transactionMetadataSource(definition.ledger),
    select: [
      "?transaction",
      "?checkpoint",
      "?definitionHash",
      "?evidenceHash",
      "?modelHash",
      "?t",
      "?address",
    ],
    where: [
      {
        "@id": "?transaction",
        "meta:inquiryCheckpoint": { "@id": checkpointSelector ?? "?checkpoint" },
        "meta:definitionHash": "?definitionHash",
        "meta:evidenceHash": "?evidenceHash",
        "meta:inquiryComplete": true,
        "meta:modelHash": "?modelHash",
        "f:t": tSelector ?? "?t",
      },
      ["optional", { "@id": "?transaction", "f:address": "?address" }],
    ],
    orderBy: [["desc", "?t"]],
    limit: 1,
    reasoning: "none",
  });
  const row = responseRows(response)[0];
  if (row === undefined) {
    throw new Error(`No complete inquiry checkpoint is visible in ${definition.ledger}`);
  }
  const transaction = literalValue(rowValue(row, "transaction", 0));
  const id = checkpointSelector ?? expandedInquiryIri(definition, rowValue(row, "checkpoint", 1));
  const checkpointDefinitionHash = literalValue(rowValue(row, "definitionHash", 2));
  const checkpointEvidenceHash = literalValue(rowValue(row, "evidenceHash", 3));
  const modelHash = literalValue(rowValue(row, "modelHash", 4));
  const rawT = tSelector ?? literalValue(rowValue(row, "t", 5));
  const address = literalValue(rowValue(row, "address", 6));
  const t =
    typeof rawT === "number"
      ? rawT
      : typeof rawT === "string" && rawT.trim() !== ""
        ? Number(rawT)
        : Number.NaN;
  if (
    typeof transaction !== "string" ||
    typeof id !== "string" ||
    typeof checkpointDefinitionHash !== "string" ||
    typeof checkpointEvidenceHash !== "string" ||
    typeof modelHash !== "string" ||
    !Number.isSafeInteger(t) ||
    t < 0
  ) {
    throw new Error(`Fluree returned an invalid inquiry checkpoint for ${definition.ledger}`);
  }
  const expectedDefinitionHash = inquiryDefinitionHash(definition);
  if (checkpointDefinitionHash !== expectedDefinitionHash) {
    throw new Error("Fluree returned a checkpoint for a different inquiry definition");
  }
  if (address !== undefined && typeof address !== "string") {
    throw new Error(`Fluree returned an invalid checkpoint address for ${definition.ledger}`);
  }
  const checkpointPrefix = inquiryIri(definition, "model:inquiry-checkpoint", "");
  if (!id.startsWith(checkpointPrefix) || id.length === checkpointPrefix.length) {
    throw new Error("Fluree returned a checkpoint identity from another inquiry");
  }
  await assertSingleCheckpointCompletion(client, definition, id, transaction, t);
  const evidence = await readCheckpointEvidence(client, definition, {
    id,
    definitionHash: checkpointDefinitionHash,
    evidenceHash: checkpointEvidenceHash,
    modelHash,
    t,
  });
  const expectedEvidenceHash = inquiryCheckpointEvidenceHash(definition, modelHash, evidence);
  const expectedId = inquiryCheckpointIri(definition, modelHash, evidence);
  if (checkpointEvidenceHash !== expectedEvidenceHash || id !== expectedId) {
    throw new Error(
      "Fluree returned a checkpoint whose content identity does not match its evidence"
    );
  }
  const semantic = await readCheckpointSemanticMaterialization(client, definition, {
    id,
    modelHash,
    semanticMaterialization: evidence.semanticMaterialization,
    t,
  });
  const resolved = {
    ledger: definition.ledger,
    id,
    transaction,
    definitionHash: checkpointDefinitionHash,
    evidenceHash: checkpointEvidenceHash,
    modelHash,
    observedCommit: evidence.observedCommit,
    historyGeneration: evidence.historyGeneration,
    projectionGenerations: evidence.projectionGenerations,
    ...(evidence.sessionGeneration === undefined
      ? {}
      : { sessionGeneration: evidence.sessionGeneration }),
    frameAttestation: evidence.frameAttestation,
    ...(evidence.semanticMaterialization === undefined
      ? {}
      : { semanticMaterialization: evidence.semanticMaterialization }),
    ...(semantic === undefined ? {} : { semantic }),
    t,
    ...(address === undefined ? {} : { address }),
  };
  return evidence.evidenceVersion === "checkpoint-evidence-v2"
    ? {
        ...resolved,
        evidenceVersion: "checkpoint-evidence-v2",
        frameGeneration: evidence.frameGeneration as string,
        frameObservation: evidence.frameObservation as string,
      }
    : { ...resolved, evidenceVersion: "checkpoint-evidence-v1" };
}

function inquiryIdentityForSelector(definition: InquiryDefinition, checkpoint: string): string {
  const prefix = inquiryIri(definition, "model:inquiry-checkpoint", "");
  if (!checkpoint.startsWith(prefix) || checkpoint.length === prefix.length) {
    throw new Error("Checkpoint selector identity belongs to another inquiry");
  }
  sparqlIri(checkpoint, "checkpoint selector identity");
  return checkpoint;
}

/** Address the exact immutable ledger state named by a complete checkpoint. */
export function checkpointLedger(checkpoint: InquiryCheckpoint): string {
  return `${checkpoint.ledger}@t:${checkpoint.t}`;
}

async function storedRuleIds(
  client: Pick<FlureeClient, "query">,
  definition: InquiryDefinition,
  checkpoint: InquiryCheckpoint
): Promise<readonly string[]> {
  const response = await client.query({
    "@context": contextFor(definition),
    from: {
      "@id": checkpointLedger(checkpoint),
      graph: namespacesFor(definition).graphs.rules,
    },
    select: ["?ruleNode"],
    where: {
      "@id": "?ruleNode",
      "f:rule": "?rule",
    },
    reasoning: "none",
  });
  return responseRows(response)
    .map((row) => literalValue(rowValue(row, "ruleNode", 0)))
    .filter((value): value is string => typeof value === "string");
}

function trackedReasoning(response: unknown): unknown {
  if (!isRecord(response)) return undefined;
  return response.reasoning;
}

interface PreparedCheckpointQuery {
  readonly queryLedger: string;
  readonly semantic?: CheckpointSemanticDataset;
  readonly snapshotLedger: string;
  readonly sparql: string;
}

function prepareCheckpointQuery(
  options: QueryAtCheckpointOptions,
  queryLedger: string
): PreparedCheckpointQuery {
  const { checkpoint, client, definition } = options;
  if (client.ledger !== definition.ledger || checkpoint.ledger !== definition.ledger) {
    throw new Error("Client, checkpoint, and definition must name the same ledger");
  }
  const snapshotLedger = checkpointLedger(checkpoint);
  if (
    (checkpoint.semantic === undefined) !== (checkpoint.semanticMaterialization === undefined) ||
    (checkpoint.semantic !== undefined &&
      checkpoint.semanticMaterialization !== checkpoint.semantic.id)
  ) {
    throw new Error("Checkpoint semantic materialization receipt is incomplete");
  }
  const semantic =
    checkpoint.semantic === undefined || options.query.requiresSemantic !== true
      ? undefined
      : {
          graph: checkpoint.semantic.graph,
          name: `${definition.ledger}#${checkpoint.semantic.graph}`,
          source: `${queryLedger}#${checkpoint.semantic.graph}`,
        };
  if (options.query.requiresSemantic === true && semantic === undefined) {
    throw new Error("Checkpoint query requires a complete semantic materialization");
  }
  let sparql = "";
  if (options.query.kind === "jsonld") {
    assertNoQueryTimeRules(options.query.body);
    assertJsonLdDatasetIsKernelOwned(options.query.body);
  } else {
    sparql = options.query.build(queryLedger, checkpoint, semantic);
    assertSparqlUsesOnlyQueryLedger(sparql, queryLedger, semantic);
  }
  if (checkpoint.definitionHash !== inquiryDefinitionHash(definition)) {
    throw new Error("Supplied inquiry checkpoint belongs to a different definition");
  }
  return {
    queryLedger,
    ...(semantic === undefined ? {} : { semantic }),
    snapshotLedger,
    sparql,
  };
}

async function assertSuppliedCheckpointVerified(options: QueryAtCheckpointOptions): Promise<void> {
  const { checkpoint, client, definition } = options;
  await assertSingleCheckpointCompletion(
    client,
    definition,
    checkpoint.id,
    checkpoint.transaction,
    checkpoint.t
  );
  const recordedEvidence = await readCheckpointEvidence(client, definition, checkpoint);
  if (
    (recordedEvidence.evidenceVersion ?? "checkpoint-evidence-v1") !== checkpoint.evidenceVersion ||
    recordedEvidence.observedCommit !== checkpoint.observedCommit ||
    recordedEvidence.historyGeneration !== checkpoint.historyGeneration ||
    recordedEvidence.frameAttestation !== checkpoint.frameAttestation ||
    recordedEvidence.frameGeneration !== checkpoint.frameGeneration ||
    recordedEvidence.frameObservation !== checkpoint.frameObservation ||
    recordedEvidence.sessionGeneration !== checkpoint.sessionGeneration ||
    recordedEvidence.semanticMaterialization !== checkpoint.semanticMaterialization ||
    JSON.stringify(recordedEvidence.projectionGenerations) !==
      JSON.stringify(checkpoint.projectionGenerations)
  ) {
    throw new Error("Supplied inquiry checkpoint does not match its immutable Fluree evidence");
  }
  const recordedSemantic = await readCheckpointSemanticMaterialization(
    client,
    definition,
    checkpoint
  );
  if (JSON.stringify(recordedSemantic) !== JSON.stringify(checkpoint.semantic)) {
    throw new Error("Supplied inquiry checkpoint has a conflicting semantic materialization");
  }
  if (
    checkpoint.evidenceHash !==
      inquiryCheckpointEvidenceHash(definition, checkpoint.modelHash, recordedEvidence) ||
    checkpoint.id !== inquiryCheckpointIri(definition, checkpoint.modelHash, recordedEvidence)
  ) {
    throw new Error("Supplied inquiry checkpoint does not match its content identity");
  }
}

async function executeVerifiedCheckpointQuery(
  options: QueryAtCheckpointOptions,
  prepared: PreparedCheckpointQuery
): Promise<CheckpointQueryResult> {
  const { checkpoint, client, definition } = options;
  const { queryLedger, semantic, snapshotLedger, sparql } = prepared;
  const rules = await storedRuleIds(client, definition, checkpoint);
  const executeStarted = performance.now();
  const queryHash =
    options.query.kind === "jsonld"
      ? evidenceHash(
          JSON.stringify({
            body: options.query.body,
            kind: options.query.kind,
            namedGraphs: options.query.namedGraphs ?? {},
            requiresSemantic: options.query.requiresSemantic ?? false,
          })
        )
      : evidenceHash(sparql);
  let response: unknown;
  if (options.query.kind === "jsonld") {
    if (semantic !== undefined && options.query.namedGraphs?.semantic !== undefined) {
      throw new Error("Named graph alias 'semantic' is reserved by the inquiry checkpoint");
    }
    const fromNamed = Object.fromEntries(
      Object.entries({
        ...(semantic === undefined ? {} : { semantic: semantic.graph }),
        ...(options.query.namedGraphs ?? {}),
      }).map(([alias, graph]) => {
        if (!/^[A-Za-z][A-Za-z0-9_-]*$/u.test(alias)) {
          throw new Error(`Named graph alias '${alias}' is invalid`);
        }
        sparqlIri(graph, `named graph '${alias}'`);
        return [
          alias,
          {
            "@id": queryLedger,
            "@graph": graph,
          },
        ];
      })
    );
    response = await client.query(
      {
        ...options.query.body,
        from: queryLedger,
        ...(Object.keys(fromNamed).length === 0 ? {} : { fromNamed }),
        reasoning: "none",
        opts: {
          ...(isRecord(options.query.body.opts) ? options.query.body.opts : {}),
          meta: true,
        },
      },
      true
    );
  } else {
    response = await client.sparql(sparql, true);
  }
  assertReasoningComplete({
    reasoning: trackedReasoning(response),
  } satisfies Pick<TrackedFlureeResponse, "reasoning">);
  const executeMs = performance.now() - executeStarted;
  return {
    ledger: definition.ledger,
    queryLedger,
    snapshotLedger,
    inquiryCheckpoint: checkpoint,
    queryHash,
    rules,
    response,
    timings: { prepareMs: 0, proofMs: 0, executeMs, totalMs: executeMs },
  };
}

/**
 * Execute a query only after replacing its dataset with an immutable checkpoint.
 *
 * SPARQL remains authored by the repository query adapter; the kernel admits
 * only the exact checkpoint `FROM` ledger and no alternate graph source.
 */
export async function queryAtCheckpoint(
  options: QueryAtCheckpointOptions
): Promise<CheckpointQueryResult> {
  const started = performance.now();
  const prepareStarted = performance.now();
  const prepared = prepareCheckpointQuery(options, checkpointLedger(options.checkpoint));
  const prepareMs = performance.now() - prepareStarted;
  const proofStarted = performance.now();
  await assertSuppliedCheckpointVerified(options);
  const proofMs = performance.now() - proofStarted;
  const result = await executeVerifiedCheckpointQuery(options, prepared);
  return {
    ...result,
    timings: {
      ...result.timings,
      prepareMs,
      proofMs,
      totalMs: performance.now() - started,
    },
  };
}

function assertCurrentHeadAtCheckpoint(
  info: FlureeLedgerInfo,
  checkpoint: InquiryCheckpoint,
  phase: "before" | "after"
): void {
  if (
    info.ledger !== checkpoint.ledger ||
    info.commitT !== checkpoint.t ||
    info.indexT !== checkpoint.t
  ) {
    throw new Error(
      `Current Fluree head changed ${phase} checkpoint query: expected ${checkpoint.ledger} commit_t=index_t=${String(
        checkpoint.t
      )}, observed ${info.ledger} commit_t=${String(info.commitT)} index_t=${String(info.indexT)}`
    );
  }
}

function assertSameCurrentHead(before: FlureeLedgerInfo, after: FlureeLedgerInfo): void {
  if (
    before.ledger !== after.ledger ||
    before.commitT !== after.commitT ||
    before.indexT !== after.indexT ||
    before.commitId !== after.commitId ||
    before.indexId !== after.indexId
  ) {
    throw new Error("Current Fluree head identity changed after checkpoint query");
  }
}

/**
 * Resolve and prove the latest checkpoint, then query the exactly matching current head.
 *
 * Historical `@t` replay remains available through `queryAtCheckpoint`; this
 * path admits a current result only when pre- and post-query head observations
 * both equal the immutable checkpoint and each other.
 */
export async function queryCurrentInquiryCheckpoint(
  options: QueryCurrentInquiryCheckpointOptions
): Promise<CheckpointQueryResult> {
  const started = performance.now();
  const proofStarted = performance.now();
  const checkpoint = await resolveInquiryCheckpoint(options.client, options.definition);
  const before = await options.client.info();
  assertCurrentHeadAtCheckpoint(before, checkpoint, "before");
  const proofMs = performance.now() - proofStarted;
  const prepareStarted = performance.now();
  const query = typeof options.query === "function" ? options.query(checkpoint) : options.query;
  const queryOptions: QueryAtCheckpointOptions = {
    client: options.client,
    definition: options.definition,
    checkpoint,
    query,
  };
  const prepared = prepareCheckpointQuery(queryOptions, options.definition.ledger);
  const prepareMs = performance.now() - prepareStarted;
  const result = await executeVerifiedCheckpointQuery(queryOptions, prepared);
  const after = await options.client.info();
  assertCurrentHeadAtCheckpoint(after, checkpoint, "after");
  assertSameCurrentHead(before, after);
  return {
    ...result,
    timings: {
      ...result.timings,
      prepareMs,
      proofMs,
      totalMs: performance.now() - started,
    },
    currentHead: { before, after },
  };
}
