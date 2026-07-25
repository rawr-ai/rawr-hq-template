/**
 * @fileoverview Provisionable capability contract for an append-only temporal
 * graph ledger.
 *
 * @remarks
 * This resource declares *mechanics only*: write facts, read facts, read facts
 * as they stood at an earlier point. It knows nothing about work streams,
 * boundaries, admission, or blocking. Semantic owners (services) decide what
 * the facts mean.
 *
 * The contract is deliberately provider-neutral. It is expressed as a Promise
 * port in the same style as `ContentWorkspaceNodeAsyncPort`, because that is
 * the shape services in this repository actually consume.
 *
 * Four properties are load-bearing and every provider must honour them:
 * 1. Writes are append-only and produce a monotonically increasing `t`.
 * 2. A read at `t = N` observes exactly the facts written at or before `N`.
 * 3. A forked line begins with the source's facts and diverges independently;
 *    neither line observes the other's writes until they are merged.
 * 4. There is no delete. Nothing in this port removes a fact or a line — a line
 *    that should no longer be preferred is superseded by recording that it was,
 *    which is a semantic owner's decision and not a mechanic here.
 *
 * @agents
 * Do not add work-stream vocabulary to this file. If a term only makes sense
 * inside one domain, it belongs in that service, not in this resource.
 */

/**
 * One position in a triple. `var` participates in matching; `iri` and
 * `literal` are ground terms.
 */
export type Term =
  | Readonly<{ kind: "var"; name: string }>
  | Readonly<{ kind: "iri"; value: string }>
  | Readonly<{ kind: "literal"; value: string }>;

/**
 * A term that names a value rather than matching one.
 *
 * @remarks
 * Written facts use ground terms only. A variable can appear in a query, never
 * in something being stored, and the type says so.
 */
export type GroundTerm = Extract<Term, { kind: "iri" } | { kind: "literal" }>;

/**
 * Convenience constructors so callers do not hand-build term objects.
 *
 * @remarks
 * Each constructor returns its precise variant rather than the `Term` union, so
 * a caller building a fact keeps ground-term typing without a cast.
 */
export const term = {
  var: (name: string): Extract<Term, { kind: "var" }> => ({ kind: "var", name }),
  iri: (value: string): Extract<GroundTerm, { kind: "iri" }> => ({ kind: "iri", value }),
  literal: (value: string): Extract<GroundTerm, { kind: "literal" }> => ({
    kind: "literal",
    value,
  }),
} as const;

/** One predicate/object pair attached to a subject. */
export interface GraphProperty {
  readonly predicate: string;
  readonly object: GroundTerm;
}

/**
 * One node to write. `id` is the subject IRI; every property becomes one fact.
 */
export interface GraphNode {
  readonly id: string;
  readonly properties: readonly GraphProperty[];
}

/** One triple pattern in a query. Ground terms filter; vars bind. */
export interface TriplePattern {
  readonly subject: Term;
  readonly predicate: Term;
  readonly object: Term;
}

/**
 * A conjunctive select. Every pattern must match; shared variable names join
 * across patterns.
 */
export interface SelectQuery {
  readonly select: readonly string[];
  readonly where: readonly TriplePattern[];
}

/** One result row. Keys are variable names without the leading `?`. */
export type Binding = Readonly<Record<string, string>>;

/** Current write position of one ledger. */
export interface LedgerHead {
  readonly ledger: string;
  readonly t: number;
}

/** Receipt for one accepted write. */
export interface LedgerCommit {
  readonly ledger: string;
  readonly t: number;
  /** Provider-owned opaque commit identity. Empty when the provider has none. */
  readonly commit: string;
}

/**
 * Outcome of folding one line of facts into another.
 *
 * @remarks
 * `fastForward` is false when the target accepted writes after the fork point,
 * which is the only condition under which `conflicts` can be non-zero. A
 * provider reports conflicts; it never resolves them.
 */
export interface LedgerMergeReceipt {
  /** Line the facts were folded into. */
  readonly ledger: string;
  /** Target position after the merge. */
  readonly t: number;
  /** Facts carried across. Zero means the target already contained them. */
  readonly copied: number;
  /** Subjects written on both lines since the fork point. */
  readonly conflicts: number;
  /** True when the target had not advanced since the fork point. */
  readonly fastForward: boolean;
}

/**
 * What a merge would do, without doing it.
 *
 * @remarks
 * This exists so a semantic owner can gate promotion on the outcome instead of
 * discovering it afterwards. `mergeable` is the provider's opinion, not a
 * guarantee: the lines may diverge further between the preview and the merge.
 */
export interface LedgerMergePreview {
  readonly from: string;
  readonly into: string;
  /** Commits on the source that the target does not have. */
  readonly ahead: number;
  /** Commits on the target that the source does not have. */
  readonly behind: number;
  readonly conflicts: number;
  readonly fastForward: boolean;
  readonly mergeable: boolean;
}

export type SemanticLedgerFailureReason =
  | "InvalidInput"
  | "LedgerMissing"
  | "TimeUnreached"
  | "TransportFailed"
  | "BackendFailed";

/**
 * The one failure shape a provider may reject with.
 *
 * @remarks
 * Providers classify vendor errors into this shape rather than leaking native
 * error types, so a semantic owner can act on `reason` without knowing which
 * provider it holds.
 */
export interface SemanticLedgerFailure {
  readonly _tag: "SemanticLedgerFailure";
  readonly operation:
    | "ensureLedger"
    | "head"
    | "transact"
    | "select"
    | "fork"
    | "merge"
    | "previewMerge"
    | "lines";
  readonly reason: SemanticLedgerFailureReason;
  readonly detail: string;
}

/** Construct the one failure shape providers are allowed to reject with. */
export function semanticLedgerFailure(
  operation: SemanticLedgerFailure["operation"],
  reason: SemanticLedgerFailureReason,
  detail: string
): SemanticLedgerFailure {
  return { _tag: "SemanticLedgerFailure", operation, reason, detail };
}

/**
 * Narrow an unknown thrown value to a provider failure.
 *
 * @remarks
 * Semantic owners use this at their boundary to convert provider failures into
 * their own typed errors, and to rethrow anything they did not cause.
 *
 * @param value - The caught value to classify.
 */
export function isSemanticLedgerFailure(value: unknown): value is SemanticLedgerFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _tag?: unknown })._tag === "SemanticLedgerFailure"
  );
}

/**
 * The provisionable capability. Providers own acquisition, transport, and
 * vendor mechanics; they do not own what the facts mean.
 */
export interface SemanticLedgerPort {
  /** Create the ledger when absent. Must be safe to call repeatedly. */
  readonly ensureLedger: (input: Readonly<{ ledger: string }>) => Promise<LedgerHead>;

  /** Read the current write position. */
  readonly head: (input: Readonly<{ ledger: string }>) => Promise<LedgerHead>;

  /** Append facts. Returns the position they became visible at. */
  readonly transact: (
    input: Readonly<{ ledger: string; nodes: readonly GraphNode[] }>
  ) => Promise<LedgerCommit>;

  /**
   * Read facts. When `at` is supplied, observe the ledger exactly as it stood
   * at that position; otherwise observe head.
   */
  readonly select: (
    input: Readonly<{ ledger: string; at?: number; query: SelectQuery }>
  ) => Promise<readonly Binding[]>;

  /**
   * Start a new line of facts from an existing one.
   *
   * @remarks
   * The new line begins carrying every fact the source held at the fork point.
   * Writes to either line are invisible to the other until they are merged.
   */
  readonly fork: (input: Readonly<{ from: string; to: string }>) => Promise<LedgerHead>;

  /** Fold one line's facts into another. Reports conflicts; never resolves them. */
  readonly merge: (input: Readonly<{ from: string; into: string }>) => Promise<LedgerMergeReceipt>;

  /** Report what a merge would do, changing nothing. */
  readonly previewMerge: (
    input: Readonly<{ from: string; into: string }>
  ) => Promise<LedgerMergePreview>;

  /**
   * List every known line in one family.
   *
   * @param input.family - The name before the `:`, shared by all its lines.
   */
  readonly lines: (input: Readonly<{ family: string }>) => Promise<readonly LedgerHead[]>;
}
