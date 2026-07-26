/**
 * @fileoverview In-memory provider for the semantic-ledger resource.
 *
 * @remarks
 * This provider exists to prove the resource contract is genuinely
 * provider-neutral. If the service can run its whole behaviour suite against
 * both this and `fluree-http`, then the contract is real rather than a thin
 * wrapper shaped around one vendor.
 *
 * It stores facts in an append-only log stamped with the position at which they
 * became visible, which is the minimum needed to honour temporal reads. A
 * precondition is evaluated against the facts visible at head in the same call
 * that appends, and each line remembers the outcome it gave every identity, so
 * an offer sent twice is answered once.
 */
import {
  type Binding,
  type GraphNode,
  type GroundTerm,
  type LedgerHead,
  type LedgerMergePreview,
  type LedgerMergeReceipt,
  type LedgerReceipt,
  type SelectQuery,
  type SemanticLedgerPort,
  semanticLedgerFailure,
  type Term,
  type TriplePattern,
  type WriteGuard,
} from "@rawr/resource-semantic-ledger";

/**
 * Longest identity an offer may carry.
 *
 * @remarks
 * The cap is in bytes rather than characters because it bounds what a substrate
 * carries an identity in, and a character is not a byte.
 */
const IDENTITY_LIMIT_BYTES = 128;

/** Measures an identity against a cap that is stated in bytes. */
const utf8 = new TextEncoder();

/** One stored fact. `t` is the position at which it became observable. */
interface Fact {
  readonly subject: string;
  readonly predicate: string;
  readonly object: GroundTerm;
  readonly t: number;
}

/** The outcome one identity was given, kept beside the content it was given for. */
interface AnsweredOffer {
  readonly digest: string;
  readonly receipt: LedgerReceipt;
}

interface LedgerState {
  t: number;
  readonly facts: Fact[];
  /** Outcome already given to each identity offered on this line. */
  readonly offers: Map<string, AnsweredOffer>;
  /** Position in this line's history at which it diverged from its source. */
  readonly forkedAt?: number;
}

/** Ground terms must match exactly; vars always match and may bind. */
function matchTerm(
  pattern: Term,
  value: string,
  bindings: Record<string, string>
): Record<string, string> | null {
  if (pattern.kind === "var") {
    const existing = bindings[pattern.name];
    if (existing !== undefined) return existing === value ? bindings : null;
    return { ...bindings, [pattern.name]: value };
  }
  return pattern.value === value ? bindings : null;
}

function matchFact(
  pattern: TriplePattern,
  fact: Fact,
  bindings: Record<string, string>
): Record<string, string> | null {
  // A ground object term only matches a fact of the same term kind. This keeps
  // the IRI `ex:done` distinct from the literal `"ex:done"`.
  if (pattern.object.kind !== "var" && pattern.object.kind !== fact.object.kind) return null;

  let next = matchTerm(pattern.subject, fact.subject, bindings);
  if (!next) return null;
  next = matchTerm(pattern.predicate, fact.predicate, next);
  if (!next) return null;
  return matchTerm(pattern.object, fact.object.value, next);
}

/**
 * Solve a conjunction of patterns against a set of facts.
 *
 * @remarks
 * Solutions are carried as a frontier of partial bindings: each pattern extends
 * every binding that survives it, so a variable name shared between patterns
 * joins them. An empty conjunction has one solution, the empty binding, which is
 * what makes a precondition asserting only absence something that can hold.
 */
function solve(
  patterns: readonly TriplePattern[],
  visible: readonly Fact[]
): readonly Record<string, string>[] {
  let frontier: Record<string, string>[] = [{}];
  for (const pattern of patterns) {
    const next: Record<string, string>[] = [];
    for (const bindings of frontier) {
      for (const fact of visible) {
        const matched = matchFact(pattern, fact, bindings);
        if (matched) next.push(matched);
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return frontier;
}

/**
 * Decide whether a precondition holds over the facts a proposal is offered
 * against.
 *
 * @remarks
 * A solution satisfies the precondition when no subject it asserts absent
 * carries a fact under the named predicate. Those assertions bind nothing —
 * their witnesses are existential and local — so every solution answers them
 * alike, and the precondition holds exactly when one solution exists and no
 * asserted absence is contradicted.
 */
function guardHolds(guard: WriteGuard, visible: readonly Fact[]): boolean {
  switch (guard.kind) {
    case "unconditional":
      return true;
    case "conditional":
      return (
        solve(guard.requires, visible).length > 0 &&
        guard.absent.every(
          (absence) =>
            !visible.some(
              (fact) => fact.subject === absence.subject && fact.predicate === absence.predicate
            )
        )
      );
  }
}

/** A plain object, whose key order can be normalised. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Render what a proposal offers as a string that ignores property order.
 *
 * @remarks
 * Two offers carry the same content when they assert the same facts under the
 * same precondition, whatever order their author happened to build the objects
 * in, so key order must not reach the comparison. Sequence is left alone: a
 * resend reproduces its own sequence, so normalising it would only widen what
 * counts as one offer.
 */
function contentDigest(guard: WriteGuard, nodes: readonly GraphNode[]): string {
  return JSON.stringify({ guard, nodes }, (_key: string, value: unknown) =>
    isRecord(value)
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, value[key]])
        )
      : value
  );
}

/**
 * Compare two lines since the point they diverged.
 *
 * @remarks
 * A conflict is one subject that both lines wrote after the fork. The provider
 * counts them; deciding what to do about them is not its job.
 */
function divergence(
  source: LedgerState,
  target: LedgerState
): { incoming: Fact[]; targetSince: Fact[]; conflicts: number } {
  const forkPoint = source.forkedAt ?? 0;
  const incoming = source.facts.filter((fact) => fact.t > forkPoint);
  const targetSince = target.facts.filter((fact) => fact.t > forkPoint);
  const targetSubjects = new Set(targetSince.map((fact) => fact.subject));

  return {
    incoming,
    targetSince,
    conflicts: new Set(
      incoming.filter((fact) => targetSubjects.has(fact.subject)).map((fact) => fact.subject)
    ).size,
  };
}

export interface MemorySemanticLedgerOptions {
  /** Seed state, so tests can share one store across several ports. */
  readonly ledgers?: Map<string, LedgerState>;
}

/**
 * Create an in-memory semantic ledger port.
 *
 * @param options - Optional shared backing store.
 */
export function createMemorySemanticLedgerPort(
  options: MemorySemanticLedgerOptions = {}
): SemanticLedgerPort {
  const ledgers = options.ledgers ?? new Map<string, LedgerState>();

  const require = (
    ledger: string,
    operation: "head" | "propose" | "select" | "fork" | "merge"
  ): LedgerState => {
    const state = ledgers.get(ledger);
    if (!state) {
      throw semanticLedgerFailure(operation, "LedgerMissing", `Ledger not found: ${ledger}`);
    }
    return state;
  };

  return {
    async ensureLedger({ ledger }): Promise<LedgerHead> {
      if (!ledger.trim()) {
        throw semanticLedgerFailure("ensureLedger", "InvalidInput", "Ledger name is required");
      }
      const existing = ledgers.get(ledger);
      if (existing) return { ledger, t: existing.t };
      ledgers.set(ledger, { t: 0, facts: [], offers: new Map() });
      return { ledger, t: 0 };
    },

    async head({ ledger }): Promise<LedgerHead> {
      return { ledger, t: require(ledger, "head").t };
    },

    async propose({ ledger, identity, guard, nodes }): Promise<LedgerReceipt> {
      const state = require(ledger, "propose");
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

      const digest = contentDigest(guard, nodes);
      const answered = state.offers.get(identity);
      if (answered) {
        // An identity answers for one offer, and a refusal is an answer: the
        // precondition is not evaluated again, so an offer resent after its
        // justification became true replays the refusal instead of applying.
        // Different content under a taken identity is a different offer, and it
        // is refused rather than given the first one's outcome.
        if (answered.digest === digest) return answered.receipt;
        return { applied: false, ledger, t: state.t, reason: "AlreadyProposed" };
      }

      // Every fact in the log is at or before head, so head's view is the log.
      if (!guardHolds(guard, state.facts)) {
        const refused: LedgerReceipt = {
          applied: false,
          ledger,
          t: state.t,
          reason: "GuardUnmatched",
        };
        state.offers.set(identity, { digest, receipt: refused });
        return refused;
      }

      const t = state.t + 1;
      for (const node of nodes) {
        for (const property of node.properties) {
          state.facts.push({
            subject: node.id,
            predicate: property.predicate,
            object: property.object,
            t,
          });
        }
      }
      state.t = t;

      // Deterministic stand-in for a real commit identity: the provider owns
      // the value's shape, callers only ever treat it as opaque.
      const applied: LedgerReceipt = { applied: true, ledger, t, commit: `memory:${ledger}:${t}` };
      state.offers.set(identity, { digest, receipt: applied });
      return applied;
    },

    async select({ ledger, at, query }): Promise<readonly Binding[]> {
      const state = require(ledger, "select");
      if (at !== undefined && at > state.t) {
        throw semanticLedgerFailure(
          "select",
          "TimeUnreached",
          `Ledger has not reached t=${at}, current t=${state.t}`
        );
      }

      const ceiling = at ?? state.t;
      const visible = state.facts.filter((fact) => fact.t <= ceiling);

      const seen = new Set<string>();
      const rows: Binding[] = [];
      for (const bindings of solve(query.where, visible)) {
        const row: Record<string, string> = {};
        for (const name of query.select) {
          const value = bindings[name];
          if (value !== undefined) row[name] = value;
        }
        const key = JSON.stringify(row);
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push(row);
      }
      return rows;
    },

    async fork({ from, to }): Promise<LedgerHead> {
      const source = require(from, "fork");
      if (ledgers.has(to)) {
        throw semanticLedgerFailure("fork", "InvalidInput", `Line already exists: ${to}`);
      }
      // The new line starts holding every fact the source held, at the same
      // position, and diverges from there. It answers for no offer, because an
      // identity is scoped to the line it was offered on.
      ledgers.set(to, {
        t: source.t,
        facts: [...source.facts],
        offers: new Map(),
        forkedAt: source.t,
      });
      return { ledger: to, t: source.t };
    },

    async previewMerge({ from, into }): Promise<LedgerMergePreview> {
      const { incoming, targetSince, conflicts } = divergence(
        require(from, "merge"),
        require(into, "merge")
      );
      return {
        from,
        into,
        ahead: new Set(incoming.map((fact) => fact.t)).size,
        behind: new Set(targetSince.map((fact) => fact.t)).size,
        conflicts,
        fastForward: targetSince.length === 0,
        mergeable: true,
      };
    },

    async merge({ from, into }): Promise<LedgerMergeReceipt> {
      const source = require(from, "merge");
      const target = require(into, "merge");
      const { incoming, targetSince, conflicts } = divergence(source, target);
      const fastForward = targetSince.length === 0;

      // Replay each source position as its own target position, preserving both
      // the ordering and the commit count a real ledger would report.
      const positions = [...new Set(incoming.map((fact) => fact.t))].sort((a, b) => a - b);
      for (const position of positions) {
        const next = target.t + 1;
        for (const fact of incoming.filter((candidate) => candidate.t === position)) {
          target.facts.push({ ...fact, t: next });
        }
        target.t = next;
      }

      return { ledger: into, t: target.t, copied: positions.length, conflicts, fastForward };
    },

    async lines({ family }): Promise<readonly LedgerHead[]> {
      const prefix = `${family}:`;
      return [...ledgers.entries()]
        .filter(([ledger]) => ledger.startsWith(prefix))
        .map(([ledger, state]) => ({ ledger, t: state.t }))
        .sort((left, right) => left.ledger.localeCompare(right.ledger));
    },
  };
}

export type { GraphNode, SelectQuery };
