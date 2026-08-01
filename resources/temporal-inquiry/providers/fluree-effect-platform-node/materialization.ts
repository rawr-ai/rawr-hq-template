import type { InquiryDefinition } from "./definition";
import {
  type FlureeClient,
  FlureeHttpError,
  type FlureeLedgerInfo,
  type JsonObject,
  type JsonValue,
} from "./fluree-client";
import { evidenceHash, inquiryIri, semanticGraphIri, sparqlIri } from "./namespaces";
import { sparqlPragmas, sparqlTokens } from "./sparql";

export const MATERIALIZATION_LEDGER_TOKEN = "__QUERY_LEDGER__";
const MAX_MATERIALIZED_NODES = 100_000;
const MAX_MATERIALIZED_BYTES = 64 * 1024 * 1024;

export interface SemanticMaterialization {
  readonly id: string;
  readonly graph: string;
  readonly queryHash: string;
  readonly contentHash: string;
  readonly modelHash: string;
  readonly baseT: number;
  readonly materializedT: number;
  readonly nodeCount: number;
}

type MaterializationClient = Pick<
  FlureeClient,
  "info" | "ledger" | "sparql" | "updateGraph" | "waitForIndex"
>;

export interface RefreshSemanticMaterializationOptions {
  readonly client: MaterializationClient;
  readonly definition: InquiryDefinition;
  readonly modelHash: string;
  readonly query: string;
}

interface ConstructGraph {
  readonly context?: JsonObject;
  readonly nodes: readonly JsonObject[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function trackedResult(value: unknown): unknown {
  return isRecord(value) && "result" in value ? value.result : value;
}

function assertReasoningWasNotCapped(value: unknown): void {
  if (isRecord(value) && isRecord(value.reasoning) && value.reasoning.capped === true) {
    throw new Error(
      `Fluree semantic materialization was capped (${
        typeof value.reasoning.capped_reason === "string"
          ? value.reasoning.capped_reason
          : "unknown limit"
      })`
    );
  }
}

function assertNoBlankNode(value: JsonValue, path: string): void {
  if (typeof value === "string") {
    if (value.startsWith("_:")) {
      throw new Error(`Semantic materialization must not contain a blank node at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoBlankNode(entry, `${path}[${String(index)}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === "@list") {
      throw new Error(`Semantic materialization must not contain an RDF list at ${path}`);
    }
    if (entry !== undefined) assertNoBlankNode(entry, `${path}.${key}`);
  }
}

function assertGroundValue(value: JsonValue, path: string): void {
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => assertGroundValue(entry, `${path}[${String(index)}]`));
    }
    return;
  }
  const keys = Object.keys(value);
  if ("@value" in value) {
    if (keys.some((key) => !["@value", "@type", "@language"].includes(key))) {
      throw new Error(`Semantic materialization contains an invalid literal object at ${path}`);
    }
    return;
  }
  if (typeof value["@id"] === "string") {
    if (keys.some((key) => key !== "@id")) {
      throw new Error(`Semantic materialization contains a nested node at ${path}`);
    }
    return;
  }
  throw new Error(`Semantic materialization contains an implicit blank node at ${path}`);
}

function constructGraph(value: unknown, label: string): ConstructGraph {
  const result = trackedResult(value);
  if (!isRecord(result)) {
    throw new Error(`Fluree returned an invalid JSON-LD graph for ${label}`);
  }
  const rawContext = result["@context"];
  if (rawContext !== undefined && (!isRecord(rawContext) || !isJsonValue(rawContext))) {
    throw new Error(`Fluree returned an invalid JSON-LD @context for ${label}`);
  }
  const rawGraph = result["@graph"];
  if (
    !Array.isArray(rawGraph) ||
    !rawGraph.every((node): node is JsonObject => isRecord(node) && isJsonValue(node))
  ) {
    throw new Error(`Fluree returned an invalid JSON-LD @graph for ${label}`);
  }
  const nodes = rawGraph.map((node, index) => {
    if ("@context" in node || "@graph" in node) {
      throw new Error(
        `Semantic materialization node ${String(index)} must be a direct ground JSON-LD node`
      );
    }
    if (typeof node["@id"] !== "string" || node["@id"] === "") {
      throw new Error(`Semantic materialization node ${String(index)} requires one ground @id`);
    }
    assertNoBlankNode(node as JsonObject, `${label}.@graph[${String(index)}]`);
    for (const [key, entry] of Object.entries(node)) {
      if (key !== "@id" && entry !== undefined) {
        assertGroundValue(entry, `${label}.@graph[${String(index)}].${key}`);
      }
    }
    return node;
  });
  if (nodes.length > MAX_MATERIALIZED_NODES) {
    throw new Error(
      `Semantic materialization exceeds the ${String(MAX_MATERIALIZED_NODES)} node limit`
    );
  }
  if (new TextEncoder().encode(JSON.stringify(result)).length > MAX_MATERIALIZED_BYTES) {
    throw new Error(
      `Semantic materialization exceeds the ${String(MAX_MATERIALIZED_BYTES)} byte limit`
    );
  }
  return {
    ...(rawContext === undefined ? {} : { context: rawContext as JsonObject }),
    nodes,
  };
}

function mergeContexts(
  previous: JsonObject | undefined,
  next: JsonObject | undefined
): JsonObject | undefined {
  if (previous === undefined) return next;
  if (next === undefined) return previous;
  const merged: Record<string, JsonValue | undefined> = { ...previous };
  for (const [term, definition] of Object.entries(next)) {
    if (term in merged && JSON.stringify(merged[term]) !== JSON.stringify(definition)) {
      throw new Error(`Semantic materialization contexts disagree on '${term}'`);
    }
    merged[term] = definition;
  }
  return merged;
}

function canonicalJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value
      .map(canonicalJson)
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, JsonValue] => entry[1] !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalJson(entry)])
  );
}

function canonicalContextJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(canonicalContextJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, JsonValue] => entry[1] !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalContextJson(entry)])
  );
}

function graphHash(graph: ConstructGraph): string {
  return evidenceHash(
    JSON.stringify({
      ...(graph.context === undefined ? {} : { "@context": canonicalContextJson(graph.context) }),
      "@graph": canonicalJson(graph.nodes),
    })
  );
}

function trackedT(response: unknown, label: string): number {
  const value = isRecord(response) ? response.t : undefined;
  const t =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(t) || t < 0) {
    throw new Error(`Fluree did not return an exact transaction time for ${label}`);
  }
  return t;
}

function queryPrologue(query: string): string {
  return query
    .split(/\r?\n/u)
    .filter((line) => /^\s*(?:BASE|PREFIX)\s+/iu.test(line))
    .join("\n");
}

function buildMaterializationQuery(query: string, ledger: string): string {
  const tokens = sparqlTokens(query);
  const placeholderOffsets = tokens.flatMap((token, index) =>
    token.kind === "placeholder" && token.value === MATERIALIZATION_LEDGER_TOKEN ? [index] : []
  );
  if (
    placeholderOffsets.length !== 1 ||
    tokens[placeholderOffsets[0] - 1]?.kind !== "word" ||
    tokens[placeholderOffsets[0] - 1]?.value !== "FROM"
  ) {
    throw new Error(
      `Semantic materialization must contain exactly one ${MATERIALIZATION_LEDGER_TOKEN}`
    );
  }
  const pragmas = sparqlPragmas(query);
  if (pragmas.length !== 1 || pragmas[0] !== "REASONING: DATALOG") {
    throw new Error("Semantic materialization must select native Datalog reasoning");
  }
  const words = tokens.filter((token) => token.kind === "word").map((token) => token.value);
  if (words.filter((word) => word === "CONSTRUCT").length !== 1) {
    throw new Error("Semantic materialization must be a SPARQL CONSTRUCT query");
  }
  if (words.filter((word) => word === "FROM").length !== 1) {
    throw new Error("Semantic materialization must use exactly one kernel-owned FROM source");
  }
  const alternate = words.find((word) =>
    ["SERVICE", "GRAPH", "NAMED", "USING", "WITH", "LOAD", "COPY", "MOVE", "ADD"].includes(word)
  );
  if (alternate !== undefined) {
    throw new Error(`Semantic materialization must not use ${alternate}`);
  }
  const built = query.replace(
    MATERIALIZATION_LEDGER_TOKEN,
    sparqlIri(ledger, "semantic materialization ledger")
  );
  if (sparqlTokens(built).some((token) => token.kind === "placeholder")) {
    throw new Error("Semantic materialization contains an unresolved template token");
  }
  return built;
}

function existingGraphQuery(query: string, ledger: string, graph: string): string {
  const prologue = queryPrologue(query);
  return `# PRAGMA reasoning: none
${prologue === "" ? "" : `${prologue}\n`}
CONSTRUCT {
  ?subject ?predicate ?object .
}
FROM ${sparqlIri(`${ledger}#${graph}`, "semantic materialization graph source")}
WHERE {
  ?subject ?predicate ?object .
}`;
}

function sameLedgerHead(left: FlureeLedgerInfo, right: FlureeLedgerInfo): boolean {
  return (
    left.ledger === right.ledger &&
    left.commitT === right.commitT &&
    left.indexT === right.indexT &&
    left.commitId === right.commitId &&
    left.indexId === right.indexId
  );
}

function assertIndexedHead(info: FlureeLedgerInfo, label: string): void {
  if (info.commitT !== info.indexT) {
    throw new Error(
      `${label} requires one fully indexed Fluree head; observed commit_t=${String(
        info.commitT
      )} index_t=${String(info.indexT)}`
    );
  }
}

function isMissingNamedGraph(error: unknown): boolean {
  return (
    error instanceof FlureeHttpError &&
    error.status === 500 &&
    JSON.stringify(error.result).includes("Unknown named graph")
  );
}

export function semanticMaterializationIri(
  definition: InquiryDefinition,
  materialization: Omit<SemanticMaterialization, "id">
): string {
  return inquiryIri(
    definition,
    "model:semantic-materialization",
    evidenceHash(JSON.stringify(materialization))
  );
}

/**
 * Materialize the repository's native Datalog closure into one indexed named graph.
 *
 * Fluree owns rule evaluation and RDF construction. The kernel only brackets
 * that evaluation with immutable-head checks and atomically replaces the
 * previously materialized graph through Fluree's ground JSON-LD update API.
 */
export async function refreshSemanticMaterialization(
  options: RefreshSemanticMaterializationOptions
): Promise<SemanticMaterialization> {
  const { client, definition, modelHash } = options;
  if (client.ledger !== definition.ledger) {
    throw new Error("Semantic materialization client and definition must name the same ledger");
  }
  await client.waitForIndex();
  const before = await client.info();
  assertIndexedHead(before, "Semantic materialization");
  const query = buildMaterializationQuery(options.query, definition.ledger);
  const graph = semanticGraphIri(definition);
  let previousResponse: unknown;
  try {
    previousResponse = await client.sparql(
      existingGraphQuery(options.query, definition.ledger, graph),
      true
    );
  } catch (error) {
    if (!isMissingNamedGraph(error)) throw error;
    previousResponse = { "@graph": [] };
  }
  const nextResponse = await client.sparql(query, true);
  assertReasoningWasNotCapped(nextResponse);
  const afterQueries = await client.info();
  if (!sameLedgerHead(before, afterQueries)) {
    throw new Error("Fluree head changed while semantic materialization was being constructed");
  }

  const previous = constructGraph(previousResponse, "the previous semantic graph");
  const next = constructGraph(nextResponse, "the derived semantic graph");
  if (next.nodes.length === 0) {
    throw new Error("Native Datalog produced an empty semantic materialization");
  }
  const context = mergeContexts(previous.context, next.context);
  let materializedHead = before;
  if (graphHash(previous) !== graphHash(next)) {
    const update = await client.updateGraph({
      graph,
      ...(context === undefined ? {} : { context }),
      ...(previous.nodes.length === 0 ? {} : { delete: previous.nodes }),
      insert: next.nodes,
      tracked: true,
    });
    const updateT = trackedT(update, "semantic materialization publication");
    await client.waitForIndex();
    materializedHead = await client.info();
    assertIndexedHead(materializedHead, "Semantic materialization publication");
    if (materializedHead.commitT !== updateT) {
      throw new Error("Fluree head changed after semantic materialization publication");
    }
  }
  const committedResponse = await client.sparql(
    existingGraphQuery(
      options.query,
      `${definition.ledger}@t:${String(materializedHead.commitT)}`,
      graph
    ),
    true
  );
  const committed = constructGraph(committedResponse, "the committed semantic materialization");
  if (graphHash(committed) !== graphHash(next)) {
    throw new Error(
      "Committed semantic JSON-LD graph does not equal the native Datalog construction"
    );
  }
  const receipt = {
    graph,
    queryHash: evidenceHash(query),
    contentHash: graphHash(committed),
    modelHash,
    baseT: before.commitT,
    materializedT: materializedHead.commitT,
    nodeCount: committed.nodes.length,
  };
  return {
    id: semanticMaterializationIri(definition, receipt),
    ...receipt,
  };
}
