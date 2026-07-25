/**
 * @fileoverview Fluree HTTP provider for the semantic-ledger resource.
 *
 * @remarks
 * Fluree ships as a Rust binary with an HTTP API; there is no first-party
 * JS/TS client, so this provider is a direct adapter over that API. Verified
 * against `fluree/server:latest` v4.1.4.
 *
 * Mapping decisions worth knowing:
 * - Ledger identity is `name:branch`. `ws:main` and `ws:feature` are two
 *   branches of one ledger and are addressed as separate ledger ids.
 * - `POST /v1/fluree/create` accepts *only* `{ ledger }`. Initial data must
 *   follow through `insert`.
 * - Time travel is a suffix on the ledger reference — `ws:main@t:1`. A bare
 *   `t` field at query top level is silently ignored, which is a quiet trap.
 * - Reads go out as SPARQL because its response envelope is self-describing;
 *   writes go in as JSON-LD because that is the natural insert shape.
 *
 * @agents
 * Vendor mechanics belong here. Work-stream meaning does not.
 */
import {
  type Binding,
  type GraphNode,
  type GraphProperty,
  type LedgerCommit,
  type LedgerHead,
  type SemanticLedgerFailure,
  type SemanticLedgerPort,
  semanticLedgerFailure,
  type Term,
} from "@rawr/resource-semantic-ledger";

export interface FlureeHttpOptions {
  /** Base URL of the Fluree server, for example `http://localhost:8090`. */
  readonly baseUrl: string;
  /** Per-request timeout in milliseconds. */
  readonly timeoutMs?: number;
  /** Injected for tests; defaults to global `fetch`. */
  readonly fetch?: typeof globalThis.fetch;
}

interface LedgerListEntry {
  readonly name: string;
  readonly branch: string;
  readonly t: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function renderTerm(value: Term): string {
  switch (value.kind) {
    case "var":
      return `?${value.name}`;
    case "iri":
      return `<${value.value}>`;
    case "literal":
      return `"${value.value.replace(/\\/gu, "\\\\").replace(/"/gu, '\\"')}"`;
  }
}

/** Group properties by predicate so repeated predicates become JSON-LD arrays. */
function toJsonLdNode(node: GraphNode): Record<string, unknown> {
  const grouped = new Map<string, unknown[]>();
  for (const property of node.properties) {
    const value =
      property.object.kind === "iri" ? { "@id": property.object.value } : property.object.value;
    const bucket = grouped.get(property.predicate);
    if (bucket) bucket.push(value);
    else grouped.set(property.predicate, [value]);
  }

  const jsonLd: Record<string, unknown> = { "@id": node.id };
  for (const [predicate, values] of grouped) {
    jsonLd[predicate] = values.length === 1 ? values[0] : values;
  }
  return jsonLd;
}

/**
 * Create a semantic ledger port backed by a Fluree HTTP server.
 *
 * @param options - Server location and transport settings.
 */
export function createFlureeHttpSemanticLedgerPort(options: FlureeHttpOptions): SemanticLedgerPort {
  const baseUrl = options.baseUrl.replace(/\/+$/u, "");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch = options.fetch ?? globalThis.fetch;

  async function request(
    operation: SemanticLedgerFailure["operation"],
    path: string,
    init: RequestInit
  ): Promise<{ status: number; body: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await doFetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
      return { status: response.status, body: await response.text() };
    } catch (cause) {
      throw semanticLedgerFailure(
        operation,
        "TransportFailed",
        `${path}: ${cause instanceof Error ? cause.message : String(cause)}`
      );
    } finally {
      clearTimeout(timer);
    }
  }

  function parseJson<T>(operation: SemanticLedgerFailure["operation"], body: string): T {
    try {
      return JSON.parse(body) as T;
    } catch {
      throw semanticLedgerFailure(
        operation,
        "BackendFailed",
        `Response was not JSON: ${body.slice(0, 200)}`
      );
    }
  }

  /** Fluree signals failure both by status code and by an `error` field. */
  function rejectOnError(
    operation: SemanticLedgerFailure["operation"],
    status: number,
    body: string
  ): void {
    if (status < 400) return;
    const message = (() => {
      try {
        const parsed = JSON.parse(body) as { error?: unknown };
        return typeof parsed.error === "string" ? parsed.error : body;
      } catch {
        return body;
      }
    })();

    const reason = /has not reached t=/u.test(message)
      ? "TimeUnreached"
      : /not found/iu.test(message)
        ? "LedgerMissing"
        : "BackendFailed";
    throw semanticLedgerFailure(operation, reason, message.slice(0, 400));
  }

  async function listLedgers(
    operation: SemanticLedgerFailure["operation"]
  ): Promise<readonly LedgerListEntry[]> {
    const { status, body } = await request(operation, "/v1/fluree/ledgers", { method: "GET" });
    rejectOnError(operation, status, body);
    return parseJson<LedgerListEntry[]>(operation, body);
  }

  async function findHead(
    operation: SemanticLedgerFailure["operation"],
    ledger: string
  ): Promise<LedgerHead | null> {
    const entry = (await listLedgers(operation)).find(
      (candidate) => `${candidate.name}:${candidate.branch}` === ledger
    );
    return entry ? { ledger, t: entry.t } : null;
  }

  return {
    async ensureLedger({ ledger }): Promise<LedgerHead> {
      if (!ledger.trim()) {
        throw semanticLedgerFailure("ensureLedger", "InvalidInput", "Ledger name is required");
      }

      const existing = await findHead("ensureLedger", ledger);
      if (existing) return existing;

      const { status, body } = await request("ensureLedger", "/v1/fluree/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledger }),
      });

      // Tolerate a concurrent creator rather than failing the caller.
      if (status >= 400 && /exist/iu.test(body)) {
        const raced = await findHead("ensureLedger", ledger);
        if (raced) return raced;
      }
      rejectOnError("ensureLedger", status, body);

      const created = parseJson<{ t?: number }>("ensureLedger", body);
      return { ledger, t: created.t ?? 0 };
    },

    async head({ ledger }): Promise<LedgerHead> {
      const found = await findHead("head", ledger);
      if (!found) {
        throw semanticLedgerFailure("head", "LedgerMissing", `Ledger not found: ${ledger}`);
      }
      return found;
    },

    async transact({ ledger, nodes }): Promise<LedgerCommit> {
      if (nodes.length === 0) {
        throw semanticLedgerFailure("transact", "InvalidInput", "At least one node is required");
      }

      const { status, body } = await request(
        "transact",
        `/v1/fluree/insert?ledger=${encodeURIComponent(ledger)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "@graph": nodes.map(toJsonLdNode) }),
        }
      );
      rejectOnError("transact", status, body);

      const receipt = parseJson<{ t?: number; commit?: { hash?: string } }>("transact", body);
      if (typeof receipt.t !== "number") {
        throw semanticLedgerFailure("transact", "BackendFailed", "Write receipt carried no `t`");
      }
      return { ledger, t: receipt.t, commit: receipt.commit?.hash ?? "" };
    },

    async select({ ledger, at, query }): Promise<readonly Binding[]> {
      // `@t:` on the ledger reference is the honored time-travel form.
      const source = at === undefined ? ledger : `${ledger}@t:${at}`;
      const projection = query.select.map((name) => `?${name}`).join(" ");
      const patterns = query.where
        .map(
          (pattern) =>
            `  ${renderTerm(pattern.subject)} ${renderTerm(pattern.predicate)} ${renderTerm(pattern.object)} .`
        )
        .join("\n");
      const sparql = `SELECT ${projection}\nFROM <${source}>\nWHERE {\n${patterns}\n}`;

      const { status, body } = await request("select", "/v1/fluree/query", {
        method: "POST",
        headers: { "Content-Type": "application/sparql-query" },
        body: sparql,
      });
      rejectOnError("select", status, body);

      const parsed = parseJson<{
        results?: { bindings?: Record<string, { value?: string }>[] };
      }>("select", body);

      return (parsed.results?.bindings ?? []).map((row) => {
        const binding: Record<string, string> = {};
        for (const name of query.select) {
          const value = row[name]?.value;
          if (value !== undefined) binding[name] = value;
        }
        return binding;
      });
    },
  };
}

export type { GraphProperty };
