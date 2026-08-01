import { canonicalLedgerId, SUPPORTED_FLUREE_VERSION } from "./definition";
import { sparqlPragmas } from "./sparql";

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

export interface FlureeClientOptions {
  readonly access?: FlureeClientAccess;
  readonly ledger: string;
  readonly endpoint?: string;
  readonly fetch?: FlureeFetch;
  readonly indexTimeoutMs?: number;
  readonly signal?: AbortSignal;
}

export type FlureeClientAccess = "read" | "write";

export type FlureeFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface FlureeWriteOptions {
  readonly context?: JsonObject;
  readonly graph?: string;
  readonly metadata?: JsonObject;
  readonly opts?: JsonObject;
  readonly tracked?: boolean;
}

/** One atomic replacement of ground JSON-LD nodes in a named graph. */
export type FlureeGraphUpdate = Readonly<{
  context?: JsonObject;
  graph: string;
  tracked?: boolean;
}> &
  (
    | {
        readonly delete: readonly JsonObject[];
        readonly insert?: readonly JsonObject[];
      }
    | {
        readonly delete?: readonly JsonObject[];
        readonly insert: readonly JsonObject[];
      }
  );

export interface TrackedFlureeResponse {
  readonly result: unknown;
  readonly reasoning?: unknown;
  readonly commit?: string;
  readonly transaction?: string;
  readonly t?: number;
}

export interface FlureeLedgerInfo {
  readonly commitId?: string;
  readonly commitT: number;
  readonly indexId?: string;
  readonly indexT: number;
  readonly ledger: string;
}

/** Capability-limited client exposed to bounded read operations. */
export interface FlureeReadClient {
  readonly access: FlureeClientAccess;
  readonly endpoint: string;
  readonly ledger: string;

  info(): Promise<FlureeLedgerInfo>;
  query(body: JsonObject, tracked?: boolean): Promise<unknown>;
  sparql(query: string, tracked?: boolean): Promise<unknown>;
}

function assertFactualJsonLdRead(body: Readonly<Record<string, unknown>>): void {
  if (body.reasoning !== "none") {
    throw new Error("Read-capability JSON-LD queries require reasoning 'none'");
  }
  if (Object.hasOwn(body, "rules")) {
    throw new Error("Read-capability JSON-LD queries must not supply rules");
  }
}

function factualJsonLdReadBody(body: JsonObject): string {
  const serialized = JSON.stringify(body);
  const snapshot: unknown = JSON.parse(serialized);
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("Read-capability JSON-LD query must serialize to one object");
  }
  assertFactualJsonLdRead(snapshot as Readonly<Record<string, unknown>>);
  return serialized;
}

function assertFactualSparqlRead(query: string): void {
  const pragmas = sparqlPragmas(query);
  if (pragmas.length !== 1 || pragmas[0] !== "REASONING: NONE") {
    throw new Error("Read-capability SPARQL queries require exactly one reasoning:none pragma");
  }
}

/** HTTP error preserving the Fluree response body for operator diagnostics. */
export class FlureeHttpError extends Error {
  readonly status: number;
  readonly result: unknown;

  constructor(path: string, response: Response, result: unknown) {
    const detail = typeof result === "string" ? result : JSON.stringify(result);
    super(`${response.status} ${response.statusText} from ${path}: ${detail}`);
    this.name = "FlureeHttpError";
    this.status = response.status;
    this.result = result;
  }
}

function parseBody(text: string): unknown {
  if (text === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ledgerFamily(ledger: string): string {
  const canonical = canonicalLedgerId(ledger);
  return canonical.slice(0, canonical.lastIndexOf(":"));
}

function nonNegativeSafeInteger(value: unknown, field: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Fluree ledger info returned an invalid ${field}`);
  }
  return parsed;
}

function abortableDelay(milliseconds: number, signal: AbortSignal | undefined): Promise<void> {
  if (signal === undefined) {
    return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
  }
  signal.throwIfAborted();
  return new Promise((resolvePromise, rejectPromise) => {
    const onAbort = () => {
      clearTimeout(timeout);
      rejectPromise(signal.reason ?? new DOMException("Operation aborted", "AbortError"));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolvePromise();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function scopedNodes(
  nodes: JsonObject | readonly JsonObject[],
  graph?: string
): readonly JsonObject[] {
  const values = Array.isArray(nodes) ? nodes : [nodes];
  if (graph === undefined) return values;
  return values.map((node) => ({
    ...node,
    "@graph": node["@graph"] ?? graph,
  }));
}

/**
 * Thin transport for the standalone Fluree 4.1.4 HTTP API.
 *
 * It owns endpoint mechanics only; ontology, rules, and product query meaning
 * remain authored outside this class.
 */
export class FlureeClient {
  static readonly runtimeVersion = SUPPORTED_FLUREE_VERSION;

  readonly #access: FlureeClientAccess;
  readonly endpoint: string;
  readonly ledger: string;
  readonly #fetch: FlureeFetch;
  readonly #indexTimeoutMs: number;
  readonly #signal: AbortSignal | undefined;
  #minimumT = 0;

  constructor(options: FlureeClientOptions) {
    this.#access = options.access ?? "write";
    this.endpoint = (options.endpoint ?? "http://127.0.0.1:8091").replace(/\/+$/u, "");
    this.ledger = canonicalLedgerId(options.ledger);
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#indexTimeoutMs = options.indexTimeoutMs ?? 10 * 60_000;
    this.#signal = options.signal;
  }

  get access(): FlureeClientAccess {
    return this.#access;
  }

  #assertWriteAccess(operation: string): void {
    if (this.#access !== "write") {
      throw new Error(`Fluree client has read access; ${operation} requires write access`);
    }
  }

  async #request(
    path: string,
    options: {
      readonly body?: JsonValue | string;
      readonly contentType?: string;
      readonly method?: string;
      readonly serializedBody?: string;
      readonly tracked?: boolean;
    } = {}
  ): Promise<unknown> {
    const contentType = options.contentType ?? "application/json";
    const hasBody = options.body !== undefined || options.serializedBody !== undefined;
    const response = await this.#fetch(`${this.endpoint}/v1/fluree${path}`, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      headers: {
        ...(hasBody ? { "Content-Type": contentType } : {}),
        ...(path === "/query" && this.#minimumT > 0
          ? { "Fluree-Min-T": String(this.#minimumT) }
          : {}),
        ...(options.tracked === true ? { "fluree-track-meta": "true" } : {}),
      },
      body:
        options.serializedBody !== undefined
          ? options.serializedBody
          : options.body === undefined
            ? undefined
            : contentType === "application/json"
              ? JSON.stringify(options.body)
              : String(options.body),
      signal: this.#signal,
    });
    const result = parseBody(await response.text());
    if (!response.ok) throw new FlureeHttpError(path, response, result);
    if (options.tracked !== true) return result;

    const responseObject =
      result !== null && typeof result === "object" && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : undefined;
    const reasoningHeader = response.headers.get("x-fdb-reasoning");
    let headerReasoning: unknown;
    try {
      headerReasoning = reasoningHeader === null ? undefined : JSON.parse(reasoningHeader);
    } catch {
      headerReasoning = reasoningHeader ?? undefined;
    }
    const tHeader = response.headers.get("x-fluree-t");
    const trackedResult =
      responseObject !== undefined && "result" in responseObject ? responseObject.result : result;
    const trackedResultObject =
      trackedResult !== null && typeof trackedResult === "object" && !Array.isArray(trackedResult)
        ? (trackedResult as Record<string, unknown>)
        : undefined;
    const resultCommit =
      trackedResultObject?.commit !== null &&
      typeof trackedResultObject?.commit === "object" &&
      !Array.isArray(trackedResultObject.commit) &&
      typeof (trackedResultObject.commit as Record<string, unknown>).hash === "string"
        ? ((trackedResultObject.commit as Record<string, unknown>).hash as string)
        : typeof trackedResultObject?.commit_id === "string"
          ? trackedResultObject.commit_id
          : undefined;
    const resultTransaction =
      typeof trackedResultObject?.["tx-id"] === "string" ? trackedResultObject["tx-id"] : undefined;
    const resultT = trackedResultObject?.t;
    const t =
      tHeader !== null
        ? Number(tHeader)
        : typeof resultT === "number"
          ? resultT
          : typeof resultT === "string" && resultT.trim() !== ""
            ? Number(resultT)
            : undefined;
    if (typeof t === "number" && Number.isSafeInteger(t) && t >= 0) {
      this.#minimumT = Math.max(this.#minimumT, t);
    }
    return {
      result: trackedResult,
      reasoning: responseObject?.reasoning ?? headerReasoning,
      commit: response.headers.get("x-fluree-commit") ?? resultCommit,
      ...(resultTransaction === undefined ? {} : { transaction: resultTransaction }),
      t,
    } satisfies TrackedFlureeResponse;
  }

  /** Check the standalone process health endpoint. */
  async health(): Promise<boolean> {
    const response = await this.#fetch(`${this.endpoint}/health`, { signal: this.#signal });
    return response.ok;
  }

  /** Read server statistics used to attest the runtime's indexing posture. */
  async stats(): Promise<JsonObject> {
    const result = await this.#request("/stats", { method: "GET" });
    if (result === null || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("Fluree returned an invalid server statistics response");
    }
    return result as JsonObject;
  }

  /** Refuse an endpoint whose resolved background-indexing mode is unexpected. */
  async assertBackgroundIndexing(expected: boolean): Promise<void> {
    const stats = await this.stats();
    if (stats.indexing_enabled !== expected) {
      throw new Error(
        `Fluree background indexing must be ${String(expected)}; server reported ${String(
          stats.indexing_enabled
        )}`
      );
    }
  }

  /** Read the authoritative commit/index position for this ledger branch. */
  async info(): Promise<FlureeLedgerInfo> {
    const result = await this.#request(`/info/${this.ledger}`, { method: "GET" });
    if (result === null || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("Fluree returned an invalid ledger information response");
    }
    const info = result as Record<string, unknown>;
    const ledgerBlock =
      info.ledger !== null && typeof info.ledger === "object" && !Array.isArray(info.ledger)
        ? (info.ledger as Record<string, unknown>)
        : undefined;
    const indexBlock =
      info.index !== null && typeof info.index === "object" && !Array.isArray(info.index)
        ? (info.index as Record<string, unknown>)
        : undefined;
    const ledger = info.ledger_id ?? ledgerBlock?.alias;
    const rawCommitId = info.commitId ?? info.commit_id;
    const rawIndexId = info.indexId ?? info.index_id ?? indexBlock?.id;
    const commitId = rawCommitId === null ? undefined : rawCommitId;
    const indexId = rawIndexId === null ? undefined : rawIndexId;
    if (ledger !== this.ledger) {
      throw new Error("Fluree ledger info returned an invalid ledger_id");
    }
    if (commitId !== undefined && (typeof commitId !== "string" || commitId === "")) {
      throw new Error("Fluree ledger info returned an invalid commit_id");
    }
    if (indexId !== undefined && (typeof indexId !== "string" || indexId === "")) {
      throw new Error("Fluree ledger info returned an invalid index_id");
    }
    return {
      ledger,
      commitT: nonNegativeSafeInteger(
        ledgerBlock?.t ?? info.commit_t ?? ledgerBlock?.["commit-t"] ?? info.t,
        "commit_t"
      ),
      indexT: nonNegativeSafeInteger(
        info.index_t ?? ledgerBlock?.["index-t"] ?? indexBlock?.t,
        "index_t"
      ),
      ...(commitId === undefined ? {} : { commitId }),
      ...(indexId === undefined ? {} : { indexId }),
    };
  }

  /**
   * Wait until native background indexing seals the ledger head observed here.
   *
   * The target is captured once so another writer cannot extend this wait.
   */
  async waitForIndex(timeoutMs = this.#indexTimeoutMs): Promise<FlureeLedgerInfo> {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error("Fluree index wait timeout must be a positive safe integer");
    }
    const target = await this.info();
    const targetT = Math.max(target.commitT, this.#minimumT);
    if (target.indexT >= targetT) return target;
    const started = Date.now();
    let current = target;
    while (Date.now() - started < timeoutMs) {
      await abortableDelay(250, this.#signal);
      current = await this.info();
      if (current.indexT >= targetT) return current;
    }
    throw new Error(
      `Fluree commit and index did not reach t=${String(targetT)} within ${String(
        timeoutMs
      )}ms; last commit_t=${String(current.commitT)} index_t=${String(current.indexT)}`
    );
  }

  /** Wait until the local external process accepts requests. */
  async waitForReady(timeoutMs = 20_000): Promise<void> {
    const started = Date.now();
    let lastError: unknown;
    while (Date.now() - started < timeoutMs) {
      try {
        if (await this.health()) return;
        lastError = new Error("health endpoint was not ready");
      } catch (error) {
        lastError = error;
      }
      await abortableDelay(200, this.#signal);
    }
    throw new Error(
      `Fluree did not become ready at ${this.endpoint}: ${
        lastError instanceof Error ? lastError.message : "timeout"
      }`
    );
  }

  /** Create the configured ledger family, whose default branch is `main`. */
  async createLedger(): Promise<unknown> {
    this.#assertWriteAccess("createLedger");
    return this.#request("/create", {
      body: { ledger: ledgerFamily(this.ledger) },
    });
  }

  /** Hard-drop the configured ledger family. */
  async dropLedger(): Promise<unknown> {
    this.#assertWriteAccess("dropLedger");
    return this.#request("/drop", {
      body: { ledger: ledgerFamily(this.ledger), hard: true },
    });
  }

  /** Execute a JSON-LD query body. */
  async query(body: JsonObject, tracked = false): Promise<unknown> {
    return this.#request(
      "/query",
      this.#access === "read"
        ? { serializedBody: factualJsonLdReadBody(body), tracked }
        : { body, tracked }
    );
  }

  /** Execute an authored SPARQL query without rewriting its semantics. */
  async sparql(query: string, tracked = false): Promise<unknown> {
    if (this.#access === "read") assertFactualSparqlRead(query);
    return this.#request("/query", {
      body: query,
      contentType: "application/sparql-query",
      tracked,
    });
  }

  async #write(
    mode: "insert" | "upsert",
    nodes: JsonObject | readonly JsonObject[],
    options: FlureeWriteOptions = {}
  ): Promise<unknown> {
    this.#assertWriteAccess(mode);
    const values = scopedNodes(nodes, options.graph);
    if (values.length === 0) return undefined;
    return this.#request(`/${mode}?ledger=${encodeURIComponent(this.ledger)}`, {
      body: {
        ...(options.context === undefined ? {} : { "@context": options.context }),
        "@graph": values,
        ...(options.metadata ?? {}),
        ...(options.opts === undefined ? {} : { opts: options.opts }),
      },
      tracked: options.tracked,
    });
  }

  /** Insert exact RDF observation nodes. */
  async insert(
    nodes: JsonObject | readonly JsonObject[],
    options: FlureeWriteOptions = {}
  ): Promise<unknown> {
    return this.#write("insert", nodes, options);
  }

  /** Upsert deterministic RDF observation nodes. */
  async upsert(
    nodes: JsonObject | readonly JsonObject[],
    options: FlureeWriteOptions = {}
  ): Promise<unknown> {
    return this.#write("upsert", nodes, options);
  }

  /** Atomically delete and/or insert ground JSON-LD nodes in one named graph. */
  async updateGraph(update: FlureeGraphUpdate): Promise<unknown> {
    this.#assertWriteAccess("updateGraph");
    const deleteNodes = update.delete?.length === 0 ? undefined : update.delete;
    const insertNodes = update.insert?.length === 0 ? undefined : update.insert;
    if (deleteNodes === undefined && insertNodes === undefined) {
      throw new Error("Fluree graph update requires a non-empty delete or insert clause");
    }
    return this.#request(`/update?ledger=${encodeURIComponent(this.ledger)}`, {
      body: {
        ...(update.context === undefined ? {} : { "@context": update.context }),
        graph: update.graph,
        ...(deleteNodes === undefined ? {} : { delete: deleteNodes }),
        ...(insertNodes === undefined ? {} : { insert: insertNodes }),
      },
      tracked: update.tracked,
    });
  }

  /** Upsert one authored JSON-LD document. */
  async upsertJsonLd(document: JsonObject): Promise<unknown> {
    this.#assertWriteAccess("upsertJsonLd");
    return this.#request(`/upsert?ledger=${encodeURIComponent(this.ledger)}`, {
      body: document,
    });
  }

  /** Upsert one authored TriG document without compiling it in TypeScript. */
  async upsertTrig(trig: string, tracked = false): Promise<unknown> {
    this.#assertWriteAccess("upsertTrig");
    return this.#request(`/upsert?ledger=${encodeURIComponent(this.ledger)}`, {
      body: trig,
      contentType: "application/trig",
      tracked,
    });
  }

  /** Upsert authored Turtle into the default graph used by native SHACL. */
  async upsertTurtle(turtle: string, tracked = false): Promise<unknown> {
    this.#assertWriteAccess("upsertTurtle");
    return this.#request(`/upsert?ledger=${encodeURIComponent(this.ledger)}`, {
      body: turtle,
      contentType: "text/turtle",
      tracked,
    });
  }
}
