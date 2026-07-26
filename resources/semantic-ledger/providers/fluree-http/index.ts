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
 *   follow through a proposal.
 * - Time travel is a suffix on the ledger reference — `ws:main@t:1`. A bare
 *   `t` field at query top level is silently ignored, which is a quiet trap.
 *   `@iso:`, `@recorded:`, and `@commit:` are honoured in the same position.
 * - Reads and writes both go out as SPARQL, so one term renderer escapes every
 *   value that reaches the server. A proposal is `INSERT … WHERE …`, its
 *   precondition being the `WHERE` clause the substrate evaluates atomically
 *   with the insert; a `WHERE` holding only `FILTER NOT EXISTS` groups yields
 *   one solution, so insert-if-absent needs no positive pattern.
 * - A proposal's identity travels as `Idempotency-Key`, under which the server
 *   replays a stored response byte-for-byte. That is what makes resending a
 *   lost offer safe, and it is also why an identity answers for one attempt
 *   rather than for one intent: a refusal is replayed too, never re-evaluated.
 * - Both outcomes return 200. `commit.hash` against the identity every
 *   flake-less transaction reports is the only sound discriminator — `t` is the
 *   ledger's head at processing time and advances whenever anyone commits, and
 *   `tx-id` digests the request body, so it is identical across ledgers and
 *   across distinct commits.
 * - `branch` and `merge` take a *bare family name* in `ledger`, unlike every
 *   other endpoint, which takes `name:branch`. Passing the qualified form
 *   yields `name:branch:branch` and a nameservice error.
 * - `POST /drop-branch` does drop a single branch, and `drop` removes an entire
 *   family. The port exposes neither: a line that should no longer be preferred
 *   is superseded by recording that it was. That is a choice about meaning, not
 *   a limit of the substrate.
 *
 * This server accepts unrecognised request keys silently — no warning, no 400.
 * A top-level `t` is discarded; reasoning is a top-level `reasoning` key. Treat
 * a 200 as evidence that a request was *accepted*, never that a feature was
 * *applied*, and establish every capability with a differential rather than a
 * status code.
 *
 * `./README.md` documents the substrate this adapter is built on — the route
 * inventory, addressing and time, conditional writes, search, reasoning, and
 * the traps each of those carries. Read it before extending this adapter.
 *
 * @agents
 * Vendor mechanics belong here. Work-stream meaning does not.
 */
import { createHash } from "node:crypto";
import {
  type Binding,
  type GraphNode,
  type GraphProperty,
  type GuardAbsence,
  type LedgerHead,
  type LedgerMergePreview,
  type LedgerMergeReceipt,
  type LedgerReceipt,
  type SemanticLedgerFailure,
  type SemanticLedgerPort,
  semanticLedgerFailure,
  type Term,
  type TriplePattern,
  term,
  type WriteGuard,
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

/** One send: either the server answered it, or the answer was lost. */
type Attempt =
  | Readonly<{ outcome: "answered"; status: number; body: string }>
  | Readonly<{ outcome: "unanswered"; detail: string }>;

/** What the server recorded for one identity on one ledger. */
interface SubmissionRecord {
  readonly state?: string;
  readonly commit_id?: string;
  readonly t?: number;
  readonly detail?: { readonly flake_count?: number };
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Longest identity the server carries in an `Idempotency-Key`.
 *
 * @remarks
 * The cap is in bytes rather than characters because that is how the server
 * measures it, and a character is not a byte.
 */
const IDENTITY_LIMIT_BYTES = 128;

/** Measures an identity against a cap that is stated in bytes. */
const utf8 = new TextEncoder();

/** How long an offer already in flight is waited on, and how often. */
const IN_FLIGHT_POLLS = 3;
const IN_FLIGHT_POLL_MS = 200;

/** RFC 4648 base32, lowercase and unpadded — what the multibase prefix `b` names. */
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function base32(bytes: Uint8Array): string {
  let encoded = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      encoded += BASE32_ALPHABET.charAt((buffer >> bits) & 0b11111);
    }
  }
  return bits === 0 ? encoded : encoded + BASE32_ALPHABET.charAt((buffer << (5 - bits)) & 0b11111);
}

/**
 * The commit identity every transaction that produced no flakes reports.
 *
 * @remarks
 * It is `CIDv1(ContentKind::Commit, sha256(""))`: the seven-byte header
 * `018180c0011220` — CID version 1, the commit multicodec, and a 32-byte
 * sha2-256 multihash — followed by the digest of the empty byte string.
 * Deriving it from those parts and checking the result against what the server
 * returns means a substrate whose content tag moves fails here, loudly, instead
 * of every write afterwards reporting itself as applied.
 */
function deriveEmptyCommitId(): string {
  const header = [0x01, 0x81, 0x80, 0xc0, 0x01, 0x12, 0x20];
  const digest = createHash("sha256").update(new Uint8Array()).digest();
  const derived = `b${base32(Uint8Array.from([...header, ...digest]))}`;
  if (derived !== "bagaybqabciqohmgeikmpyhautl57jsezn64sij5oihsgjg4tjssjlgi3pbjlqvi") {
    throw new Error(
      `Fluree's flake-less commit identity derives to '${derived}', which is not the identity this server reports`
    );
  }
  return derived;
}

const EMPTY_COMMIT_ID = deriveEmptyCommitId();

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Split a `name:branch` reference into its two parts. */
function splitRef(
  operation: SemanticLedgerFailure["operation"],
  ledger: string
): { family: string; branch: string } {
  const separator = ledger.indexOf(":");
  if (separator <= 0 || separator === ledger.length - 1) {
    throw semanticLedgerFailure(
      operation,
      "InvalidInput",
      `Expected a 'name:branch' reference, received '${ledger}'`
    );
  }
  return { family: ledger.slice(0, separator), branch: ledger.slice(separator + 1) };
}

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

/** One triple, as a SPARQL statement. */
function renderPattern(pattern: TriplePattern): string {
  return `${renderTerm(pattern.subject)} ${renderTerm(pattern.predicate)} ${renderTerm(pattern.object)} .`;
}

/** Lay out the body of one SPARQL block. */
function indent(lines: readonly string[]): string {
  return lines.map((line) => `  ${line}`).join("\n");
}

/**
 * Render one `FILTER NOT EXISTS` group per asserted absence.
 *
 * @remarks
 * A group's witness variable stands for *some* fact under the named predicate
 * and must bind nothing outside its own group. Were it a name the required
 * patterns join on, the group would test whether that one value is absent
 * rather than whether the predicate is, so the names are drawn from outside the
 * set those patterns use.
 */
function renderAbsences(
  absent: readonly GuardAbsence[],
  requires: readonly TriplePattern[]
): readonly string[] {
  const joined = new Set(
    requires
      .flatMap((pattern) => [pattern.subject, pattern.predicate, pattern.object])
      .flatMap((position) => (position.kind === "var" ? [position.name] : []))
  );

  let witness = 0;
  return absent.map((absence) => {
    while (joined.has(`a${witness}`)) witness += 1;
    const subject = renderTerm(term.iri(absence.subject));
    const predicate = renderTerm(term.iri(absence.predicate));
    const name = `a${witness}`;
    witness += 1;
    return `FILTER NOT EXISTS { ${subject} ${predicate} ?${name} }`;
  });
}

/**
 * Render a proposal as one SPARQL update.
 *
 * @remarks
 * The insert template is non-empty and fully ground and carries no delete,
 * which is what makes the flake-less commit identity mean exactly that the
 * precondition matched nothing: every other way to commit no flakes needs an
 * empty or self-cancelling delete, an empty insert, or an unbound variable in
 * the template, and none of those is expressible here.
 */
function renderUpdate(guard: WriteGuard, nodes: readonly GraphNode[]): string {
  const inserted = indent(
    nodes.flatMap((node) =>
      node.properties.map((property) =>
        renderPattern({
          subject: term.iri(node.id),
          predicate: term.iri(property.predicate),
          object: property.object,
        })
      )
    )
  );

  switch (guard.kind) {
    case "unconditional":
      return `INSERT DATA {\n${inserted}\n}`;
    case "conditional": {
      const clause = indent([
        ...guard.requires.map((pattern) => renderPattern(pattern)),
        ...renderAbsences(guard.absent, guard.requires),
      ]);
      return `INSERT {\n${inserted}\n}\nWHERE {\n${clause}\n}`;
    }
  }
}

/**
 * Read what one identity did from the record the server keeps for it.
 *
 * @remarks
 * `state` reports whether the substrate processed the offer, never whether it
 * applied — a refused offer is `committed` too. `detail.flake_count` is what
 * separates them, and it agrees with the commit identity on every case.
 */
function submissionReceipt(
  ledger: string,
  record: SubmissionRecord,
  detail: string
): LedgerReceipt {
  switch (record.state) {
    case "committed": {
      const flakes = record.detail?.flake_count;
      if (typeof record.t !== "number" || typeof flakes !== "number") {
        throw semanticLedgerFailure(
          "propose",
          "BackendFailed",
          `${detail}; the record carried no position or flake count`
        );
      }
      if (flakes === 0) return { applied: false, ledger, t: record.t, reason: "GuardUnmatched" };
      if (record.commit_id === undefined) {
        throw semanticLedgerFailure(
          "propose",
          "BackendFailed",
          `${detail}; an applied record carried no commit identity`
        );
      }
      return { applied: true, ledger, t: record.t, commit: record.commit_id };
    }
    case "unknown":
      // The identity was never executed, so the offer may be made again.
      throw semanticLedgerFailure(
        "propose",
        "TransportFailed",
        `${detail}; the offer never reached the substrate`
      );
    case "failed":
      throw semanticLedgerFailure("propose", "BackendFailed", `${detail}; the offer failed`);
    default:
      throw semanticLedgerFailure(
        "propose",
        "BackendFailed",
        `${detail}; the record reports an unrecognised state '${String(record.state)}'`
      );
  }
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

  /**
   * Send one request, reporting a lost answer rather than raising it.
   *
   * @remarks
   * A request whose answer never arrived may have been executed, so the two
   * cases are distinct outcomes rather than one success and one failure. Only a
   * caller that can establish which of the two happened is entitled to decide
   * what a lost answer means.
   */
  async function attempt(path: string, init: RequestInit): Promise<Attempt> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await doFetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
      return { outcome: "answered", status: response.status, body: await response.text() };
    } catch (cause) {
      return {
        outcome: "unanswered",
        detail: `${path}: ${cause instanceof Error ? cause.message : String(cause)}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function request(
    operation: SemanticLedgerFailure["operation"],
    path: string,
    init: RequestInit
  ): Promise<{ status: number; body: string }> {
    const sent = await attempt(path, init);
    if (sent.outcome === "unanswered") {
      throw semanticLedgerFailure(operation, "TransportFailed", sent.detail);
    }
    return { status: sent.status, body: sent.body };
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

  /**
   * Ask the server what an identity did, once its own answer is unrecoverable.
   *
   * @remarks
   * This is the out-of-band record, and it exists so a lost answer is resolved
   * by asking rather than by guessing or by offering again. An offer still being
   * processed is waited on for a fixed span; past that the outcome is genuinely
   * not yet determinate, and saying so is more honest than waiting longer.
   */
  async function recoverProposal(
    ledger: string,
    identity: string,
    detail: string
  ): Promise<LedgerReceipt> {
    const path = `/v1/fluree/submissions/${encodeURIComponent(identity)}/${encodeURIComponent(ledger)}`;

    for (let poll = 0; poll <= IN_FLIGHT_POLLS; poll += 1) {
      if (poll > 0) await delay(IN_FLIGHT_POLL_MS);
      const { status, body } = await request("propose", path, { method: "GET" });
      rejectOnError("propose", status, body);

      const record = parseJson<SubmissionRecord>("propose", body);
      if (record.state !== "in_flight") return submissionReceipt(ledger, record, detail);
    }

    throw semanticLedgerFailure(
      "propose",
      "TransportFailed",
      `${detail}; the offer was still in flight`
    );
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

    async propose({ ledger, identity, guard, nodes }): Promise<LedgerReceipt> {
      // Both caps are the server's, and stating them here means a violation is
      // named for what it is rather than arriving as a 400 about a request.
      if (utf8.encode(identity).length > IDENTITY_LIMIT_BYTES) {
        throw semanticLedgerFailure(
          "propose",
          "InvalidInput",
          `Identity exceeds ${IDENTITY_LIMIT_BYTES} bytes`
        );
      }
      if (nodes.length === 0) {
        throw semanticLedgerFailure("propose", "InvalidInput", "At least one node is required");
      }

      const path = `/v1/fluree/update?ledger=${encodeURIComponent(ledger)}`;
      const init: RequestInit = {
        method: "POST",
        headers: {
          "Content-Type": "application/sparql-update",
          "Idempotency-Key": identity,
        },
        body: renderUpdate(guard, nodes),
      };

      // A replay under one identity is byte-identical to the original, so an
      // offer whose answer was lost is simply sent again. When the second send
      // is lost too, the record the identity leaves behind settles it.
      let sent = await attempt(path, init);
      if (sent.outcome === "unanswered") sent = await attempt(path, init);
      if (sent.outcome === "unanswered")
        return await recoverProposal(ledger, identity, sent.detail);

      // The identity is spoken for by a different offer, so this one wrote
      // nothing. The position reported is the line's, not this offer's.
      if (
        sent.status === 409 &&
        /err:db\/CommitConflict|idempotency key collision/iu.test(sent.body)
      ) {
        const at = await findHead("propose", ledger);
        if (!at) {
          throw semanticLedgerFailure("propose", "LedgerMissing", `Ledger not found: ${ledger}`);
        }
        return { applied: false, ledger, t: at.t, reason: "AlreadyProposed" };
      }
      rejectOnError("propose", sent.status, sent.body);

      const receipt = parseJson<{ t?: number; commit?: { hash?: string } }>("propose", sent.body);
      if (typeof receipt.t !== "number") {
        throw semanticLedgerFailure("propose", "BackendFailed", "Write receipt carried no `t`");
      }

      const hash = receipt.commit?.hash ?? "";
      if (hash === "") {
        // Only ledger creation reports no commit identity at all, so a write
        // that does leaves its outcome undetermined rather than refused.
        throw semanticLedgerFailure(
          "propose",
          "BackendFailed",
          "Write receipt carried no commit identity"
        );
      }

      // The flake-less commit identity is a sentinel and not a commit, so it is
      // read here and discarded; a refusal has nowhere to carry it.
      return hash === EMPTY_COMMIT_ID
        ? { applied: false, ledger, t: receipt.t, reason: "GuardUnmatched" }
        : { applied: true, ledger, t: receipt.t, commit: hash };
    },

    async select({ ledger, at, query }): Promise<readonly Binding[]> {
      // `@t:` on the ledger reference is the honored time-travel form.
      const source = at === undefined ? ledger : `${ledger}@t:${at}`;
      const projection = query.select.map((name) => `?${name}`).join(" ");
      const patterns = indent(query.where.map((pattern) => renderPattern(pattern)));
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

    async fork({ from, to }): Promise<LedgerHead> {
      const source = splitRef("fork", from);
      const target = splitRef("fork", to);
      if (source.family !== target.family) {
        throw semanticLedgerFailure(
          "fork",
          "InvalidInput",
          `A line may only fork within its own family: '${from}' -> '${to}'`
        );
      }

      const { status, body } = await request("fork", "/v1/fluree/branch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `ledger` here is the bare family name; the branch suffix is rejected.
        body: JSON.stringify({
          ledger: source.family,
          branch: target.branch,
          source: source.branch,
        }),
      });
      rejectOnError("fork", status, body);

      const created = parseJson<{ t?: number }>("fork", body);
      return { ledger: to, t: created.t ?? 0 };
    },

    async merge({ from, into }): Promise<LedgerMergeReceipt> {
      const source = splitRef("merge", from);
      const target = splitRef("merge", into);
      if (source.family !== target.family) {
        throw semanticLedgerFailure(
          "merge",
          "InvalidInput",
          `A line may only merge within its own family: '${from}' -> '${into}'`
        );
      }

      const { status, body } = await request("merge", "/v1/fluree/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledger: source.family,
          source: source.branch,
          target: target.branch,
        }),
      });
      rejectOnError("merge", status, body);

      const receipt = parseJson<{
        new_head_t?: number;
        commits_copied?: number;
        conflict_count?: number;
        fast_forward?: boolean;
      }>("merge", body);

      return {
        ledger: into,
        t: receipt.new_head_t ?? 0,
        copied: receipt.commits_copied ?? 0,
        conflicts: receipt.conflict_count ?? 0,
        fastForward: receipt.fast_forward ?? false,
      };
    },

    async previewMerge({ from, into }): Promise<LedgerMergePreview> {
      const source = splitRef("previewMerge", from);
      const target = splitRef("previewMerge", into);

      const query = new URLSearchParams({ source: source.branch, target: target.branch });
      const { status, body } = await request(
        "previewMerge",
        `/v1/fluree/merge-preview/${encodeURIComponent(source.family)}?${query.toString()}`,
        { method: "GET" }
      );
      rejectOnError("previewMerge", status, body);

      const preview = parseJson<{
        ahead?: { count?: number };
        behind?: { count?: number };
        conflicts?: { count?: number };
        fast_forward?: boolean;
        mergeable?: boolean;
      }>("previewMerge", body);

      return {
        from,
        into,
        ahead: preview.ahead?.count ?? 0,
        behind: preview.behind?.count ?? 0,
        conflicts: preview.conflicts?.count ?? 0,
        fastForward: preview.fast_forward ?? false,
        mergeable: preview.mergeable ?? false,
      };
    },

    async lines({ family }): Promise<readonly LedgerHead[]> {
      // `GET /branch/{family}` is preferred over the ledger list because it
      // reports each line's source, which the ledger list omits.
      const { status, body } = await request(
        "lines",
        `/v1/fluree/branch/${encodeURIComponent(family)}`,
        { method: "GET" }
      );
      rejectOnError("lines", status, body);

      const branches = parseJson<{ branch?: string; t?: number }[]>("lines", body);
      return branches.flatMap((entry) =>
        entry.branch === undefined ? [] : [{ ledger: `${family}:${entry.branch}`, t: entry.t ?? 0 }]
      );
    },
  };
}

export type { GraphProperty };
