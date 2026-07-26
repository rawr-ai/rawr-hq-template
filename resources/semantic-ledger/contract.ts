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
 * Six properties are load-bearing and every provider must honour them:
 * 1. Writes are append-only and produce a monotonically increasing `t`.
 * 2. A read at `t = N` observes exactly the facts written at or before `N`.
 * 3. A forked line begins with the source's facts and diverges independently;
 *    neither line observes the other's writes until they are merged.
 * 4. There is no delete. Nothing in this port removes a fact or a line — a line
 *    that should no longer be preferred is superseded by recording that it was,
 *    which is a semantic owner's decision and not a mechanic here.
 * 5. A write carries a precondition the substrate evaluates atomically with it.
 *    A precondition may require that facts are present and that subjects are
 *    absent; it never removes anything, so property 4 stands.
 * 6. A write reports a determinate outcome. It applied, or it was refused and
 *    nothing was written. A provider that cannot tell the two apart cannot
 *    satisfy this contract, and a position is not the discriminator: another
 *    writer advances it whether or not this write applied.
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

/**
 * A subject that must carry no fact under the named predicate.
 *
 * @remarks
 * This is a precondition's negative half. It asserts absence; it never removes
 * anything. Every store able to answer "does this key exist" can honour it,
 * which is why absence is spelled directly rather than as an optional join
 * followed by a test on an unbound variable — that shape is expressible only
 * over a graph.
 */
export interface GuardAbsence {
  /** Subject whose absence is asserted. */
  readonly subject: string;
  /** Predicate that witnesses the subject's existence. */
  readonly predicate: string;
}

/**
 * The precondition a proposal carries.
 *
 * @remarks
 * `unconditional` is spelled out rather than implied by omission, so a write
 * that depends on nothing is visible in the source text of whoever wrote it.
 */
export type WriteGuard =
  | Readonly<{ kind: "unconditional" }>
  | Readonly<{
      /** Patterns that must all match. Shared variable names join across them. */
      kind: "conditional";
      requires: readonly TriplePattern[];
      /** Subjects that must carry no fact under the named predicate. */
      absent: readonly GuardAbsence[];
    }>;

/** Why a proposal wrote nothing. */
export type WriteRefusal =
  /** The precondition did not hold when the substrate evaluated it. */
  | "GuardUnmatched"
  /** The identity already carries a different proposal. Nothing was written. */
  | "AlreadyProposed";

/** Receipt for a proposal the substrate applied. */
export interface LedgerApplied {
  readonly applied: true;
  readonly ledger: string;
  /** Position the facts became observable at. */
  readonly t: number;
  /** Provider-owned opaque identity of the commit that carried them. */
  readonly commit: string;
}

/**
 * Receipt for a proposal the substrate refused.
 *
 * @remarks
 * There is deliberately no `commit` here. A refusal has no commit to name, and
 * a substrate that returns a placeholder in that position must discard it
 * rather than pass it on: a value that is not a commit identity must never
 * occupy one.
 */
export interface LedgerRefused {
  readonly applied: false;
  readonly ledger: string;
  /**
   * The line's position when the precondition was evaluated.
   *
   * @remarks
   * This is not a position this proposal produced. Comparing it against a
   * position read earlier reports another writer's commit as this proposal's
   * success, which is precisely the mistake `applied` exists to prevent.
   */
  readonly t: number;
  readonly reason: WriteRefusal;
}

/** The determinate outcome of one proposal. */
export type LedgerReceipt = LedgerApplied | LedgerRefused;

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
    | "propose"
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

  /**
   * Offer facts under a precondition and an identity.
   *
   * @remarks
   * The substrate evaluates `guard` atomically with the write. When it does not
   * hold, nothing is written and the receipt says so — that is an answer, not a
   * failure, and the caller's response is to read what is true rather than to
   * offer again. Every precondition here asserts that facts are present or that
   * subjects are absent, and since nothing is ever retracted, a refusal states
   * something that will not stop being the case.
   *
   * `identity` is honoured per ledger and closes exactly one window: a response
   * that never arrived. Offering the same identity again with the same facts
   * yields the first offer's outcome instead of a second write. It does not make
   * a stale decision safe — that is the precondition's work.
   *
   * @param input.identity - Stable across resends of one offer. At most 128 bytes.
   */
  readonly propose: (
    input: Readonly<{
      ledger: string;
      identity: string;
      guard: WriteGuard;
      nodes: readonly GraphNode[];
    }>
  ) => Promise<LedgerReceipt>;

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
