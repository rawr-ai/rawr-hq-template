/**
 * @fileoverview Ledger-backed stream store — the only place work-stream
 * vocabulary meets ledger facts.
 *
 * @remarks
 * Everything here is append-only. Nothing is ever updated or deleted, which is
 * what makes a read at an earlier `t` a faithful reconstruction rather than a
 * reconstruction of the *current* world with some rows hidden.
 *
 * Two consequences follow, and both are deliberate:
 * - An item's position is *derived* by counting its `cleared` facts, not stored
 *   as a mutable cursor.
 * - "Blocked" is never written down. It is computed from position plus tags, so
 *   it cannot go stale.
 *
 * The query surface is conjunctive-only (no OPTIONAL), so each predicate is
 * fetched separately and assembled in memory. That keeps the resource contract
 * small enough for a non-Fluree provider to satisfy honestly.
 *
 * @agents
 * Keep boundary concerns out of this file. Handlers decide caller-actionable
 * errors from the values returned here.
 */
import { type SemanticLedgerPort, term } from "@rawr/resource-semantic-ledger";
import type { BoundarySpec, ItemView, StreamView } from "../../model/schema";

const NS = "https://rawr.dev/ns/workstream#";

/** Predicate IRIs. One constant per fact kind keeps queries honest. */
const P = {
  kind: `${NS}kind`,
  ofStream: `${NS}ofStream`,
  index: `${NS}index`,
  requires: `${NS}requires`,
  title: `${NS}title`,
  tag: `${NS}tag`,
  cleared: `${NS}cleared`,
  derivedFrom: `${NS}derivedFrom`,
  grants: `${NS}grants`,
  resolved: `${NS}resolved`,
  createdAt: `${NS}createdAt`,
} as const;

const streamIri = (streamId: string): string => `${NS}stream/${encodeURIComponent(streamId)}`;
const boundaryIri = (streamId: string, index: number): string =>
  `${streamIri(streamId)}/boundary/${index}`;
const itemIri = (streamId: string, itemId: string): string =>
  `${streamIri(streamId)}/item/${encodeURIComponent(itemId)}`;

/** Recover the caller-facing id from a subject IRI. */
const localId = (iri: string): string => decodeURIComponent(iri.slice(iri.lastIndexOf("/") + 1));

/**
 * Build the ledger-backed store that translates work-stream vocabulary into
 * append-only facts and back.
 *
 * @remarks
 * The store owns the fact grammar — predicate IRIs, subject identity, and how a
 * view is reassembled from separate predicate reads. It owns no policy: whether
 * an item may advance is decided by handlers, not here.
 *
 * @param ledger - Provisioned capability port. The store never selects a provider.
 * @param ledgerName - Ledger identity in `name:branch` form.
 */
export function createStreamStore(ledger: SemanticLedgerPort, ledgerName: string) {
  /** Fetch `subject -> value` pairs for one predicate across one stream. */
  async function pairsFor(
    predicate: string,
    streamId: string,
    at: number | undefined,
    kind: "Item" | "Boundary"
  ): Promise<{ subject: string; value: string }[]> {
    const rows = await ledger.select({
      ledger: ledgerName,
      at,
      query: {
        select: ["s", "v"],
        where: [
          { subject: term.var("s"), predicate: term.iri(P.kind), object: term.literal(kind) },
          {
            subject: term.var("s"),
            predicate: term.iri(P.ofStream),
            object: term.iri(streamIri(streamId)),
          },
          { subject: term.var("s"), predicate: term.iri(predicate), object: term.var("v") },
        ],
      },
    });
    return rows.flatMap((row) =>
      row.s !== undefined && row.v !== undefined ? [{ subject: row.s, value: row.v }] : []
    );
  }

  /** Group repeated-predicate pairs into a multimap keyed by subject IRI. */
  function group(pairs: { subject: string; value: string }[]): Map<string, string[]> {
    const grouped = new Map<string, string[]>();
    for (const { subject, value } of pairs) {
      const bucket = grouped.get(subject);
      if (bucket) bucket.push(value);
      else grouped.set(subject, [value]);
    }
    return grouped;
  }

  return {
    async ensureLedger(): Promise<void> {
      await ledger.ensureLedger({ ledger: ledgerName });
    },

    async head(): Promise<number> {
      return (await ledger.head({ ledger: ledgerName })).t;
    },

    async streamExists(streamId: string, at?: number): Promise<boolean> {
      const rows = await ledger.select({
        ledger: ledgerName,
        at,
        query: {
          select: ["s"],
          where: [
            {
              subject: term.iri(streamIri(streamId)),
              predicate: term.iri(P.kind),
              object: term.literal("Stream"),
            },
            { subject: term.var("s"), predicate: term.iri(P.kind), object: term.literal("Stream") },
          ],
        },
      });
      return rows.some((row) => row.s === streamIri(streamId));
    },

    /** Write the stream node and one node per boundary, in one transaction. */
    async createStream(
      streamId: string,
      boundaries: readonly BoundarySpec[],
      createdAt: string
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerName,
        nodes: [
          {
            id: streamIri(streamId),
            properties: [
              { predicate: P.kind, object: term.literal("Stream") },
              { predicate: P.title, object: term.literal(streamId) },
              { predicate: P.createdAt, object: term.literal(createdAt) },
            ],
          },
          ...boundaries.map((boundary, index) => ({
            id: boundaryIri(streamId, index),
            properties: [
              { predicate: P.kind, object: term.literal("Boundary") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.index, object: term.literal(String(index)) },
              { predicate: P.requires, object: term.literal(boundary.requires) },
            ],
          })),
        ],
      });
      return receipt.t;
    },

    async listBoundaries(streamId: string, at?: number): Promise<BoundarySpec[]> {
      const [indexes, requires] = await Promise.all([
        pairsFor(P.index, streamId, at, "Boundary"),
        pairsFor(P.requires, streamId, at, "Boundary"),
      ]);
      const requiresBySubject = new Map(requires.map((pair) => [pair.subject, pair.value]));

      return indexes
        .map((pair) => ({
          index: Number(pair.value),
          requires: requiresBySubject.get(pair.subject) ?? "",
        }))
        .sort((left, right) => left.index - right.index)
        .map((boundary) => ({ requires: boundary.requires }));
    },

    async admitItem(
      streamId: string,
      itemId: string,
      title: string,
      tags: readonly string[],
      createdAt: string
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerName,
        nodes: [
          {
            id: itemIri(streamId, itemId),
            properties: [
              { predicate: P.kind, object: term.literal("Item") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.title, object: term.literal(title) },
              { predicate: P.createdAt, object: term.literal(createdAt) },
              ...tags.map((tag) => ({ predicate: P.tag, object: term.literal(tag) })),
            ],
          },
        ],
      });
      return receipt.t;
    },

    async itemExists(streamId: string, itemId: string, at?: number): Promise<boolean> {
      const rows = await ledger.select({
        ledger: ledgerName,
        at,
        query: {
          select: ["s"],
          where: [
            { subject: term.var("s"), predicate: term.iri(P.kind), object: term.literal("Item") },
            {
              subject: term.var("s"),
              predicate: term.iri(P.ofStream),
              object: term.iri(streamIri(streamId)),
            },
          ],
        },
      });
      return rows.some((row) => row.s === itemIri(streamId, itemId));
    },

    /** Append one `cleared` fact. Position is the count of these. */
    async recordCleared(streamId: string, itemId: string, index: number): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerName,
        nodes: [
          {
            id: itemIri(streamId, itemId),
            properties: [{ predicate: P.cleared, object: term.literal(String(index)) }],
          },
        ],
      });
      return receipt.t;
    },

    /** The peel-off: a new item linked to its cause, carrying the tag it owes. */
    async createDerived(
      streamId: string,
      childId: string,
      parentId: string,
      grants: string,
      title: string,
      createdAt: string
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerName,
        nodes: [
          {
            id: itemIri(streamId, childId),
            properties: [
              { predicate: P.kind, object: term.literal("Item") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.title, object: term.literal(title) },
              { predicate: P.createdAt, object: term.literal(createdAt) },
              { predicate: P.derivedFrom, object: term.iri(itemIri(streamId, parentId)) },
              { predicate: P.grants, object: term.literal(grants) },
            ],
          },
        ],
      });
      return receipt.t;
    },

    /** Close the loop: mark the child resolved and grant its tag to the parent. */
    async resolveDerived(
      streamId: string,
      childId: string,
      parentId: string,
      grants: string
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerName,
        nodes: [
          {
            id: itemIri(streamId, childId),
            properties: [{ predicate: P.resolved, object: term.literal("true") }],
          },
          {
            id: itemIri(streamId, parentId),
            properties: [{ predicate: P.tag, object: term.literal(grants) }],
          },
        ],
      });
      return receipt.t;
    },

    /**
     * Assemble every item in the stream from its constituent facts.
     *
     * @param at - Observe the ledger as it stood at this position.
     */
    async listItems(streamId: string, at?: number): Promise<ItemView[]> {
      const [titles, tags, cleared, derivedFrom, grants, resolved] = await Promise.all([
        pairsFor(P.title, streamId, at, "Item"),
        pairsFor(P.tag, streamId, at, "Item"),
        pairsFor(P.cleared, streamId, at, "Item"),
        pairsFor(P.derivedFrom, streamId, at, "Item"),
        pairsFor(P.grants, streamId, at, "Item"),
        pairsFor(P.resolved, streamId, at, "Item"),
      ]);

      const tagsBy = group(tags);
      const clearedBy = group(cleared);
      const derivedBy = new Map(derivedFrom.map((pair) => [pair.subject, pair.value]));
      const grantsBy = new Map(grants.map((pair) => [pair.subject, pair.value]));
      const resolvedBy = new Set(resolved.map((pair) => pair.subject));

      return titles
        .map((pair) => {
          const derivedFromIri = derivedBy.get(pair.subject);
          return {
            id: localId(pair.subject),
            title: pair.value,
            tags: [...new Set(tagsBy.get(pair.subject) ?? [])].sort(),
            // Distinct indices only: re-clearing the same boundary is a no-op,
            // which keeps `push` idempotent.
            position: new Set(clearedBy.get(pair.subject) ?? []).size,
            derivedFrom: derivedFromIri === undefined ? null : localId(derivedFromIri),
            grants: grantsBy.get(pair.subject) ?? null,
            resolved: resolvedBy.has(pair.subject),
          } satisfies ItemView;
        })
        .sort((left, right) => left.id.localeCompare(right.id));
    },

    async readStream(streamId: string, at?: number): Promise<StreamView> {
      const [boundaries, items] = await Promise.all([
        this.listBoundaries(streamId, at),
        this.listItems(streamId, at),
      ]);
      return { streamId, boundaries, items };
    },
  };
}

/** Structural type of the ledger-backed stream store. */
export type StreamStore = ReturnType<typeof createStreamStore>;
