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
 * became visible, which is the minimum needed to honour temporal reads.
 */
import {
  type Binding,
  type GraphNode,
  type GroundTerm,
  type LedgerCommit,
  type LedgerHead,
  type SelectQuery,
  type SemanticLedgerPort,
  semanticLedgerFailure,
  type Term,
  type TriplePattern,
} from "@rawr/resource-semantic-ledger";

/** One stored fact. `t` is the position at which it became observable. */
interface Fact {
  readonly subject: string;
  readonly predicate: string;
  readonly object: GroundTerm;
  readonly t: number;
}

interface LedgerState {
  t: number;
  readonly facts: Fact[];
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

  const require = (ledger: string, operation: "head" | "transact" | "select"): LedgerState => {
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
      ledgers.set(ledger, { t: 0, facts: [] });
      return { ledger, t: 0 };
    },

    async head({ ledger }): Promise<LedgerHead> {
      return { ledger, t: require(ledger, "head").t };
    },

    async transact({ ledger, nodes }): Promise<LedgerCommit> {
      const state = require(ledger, "transact");
      if (nodes.length === 0) {
        throw semanticLedgerFailure("transact", "InvalidInput", "At least one node is required");
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
      const commit = `memory:${ledger}:${t}`;
      return { ledger, t, commit };
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

      // Conjunctive join: carry a frontier of partial bindings through every
      // pattern in turn.
      let frontier: Record<string, string>[] = [{}];
      for (const pattern of query.where) {
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

      const seen = new Set<string>();
      const rows: Binding[] = [];
      for (const bindings of frontier) {
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
  };
}

export type { GraphNode, SelectQuery };
