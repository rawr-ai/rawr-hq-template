/**
 * @fileoverview Ledger-backed stream store — the only place work-stream
 * vocabulary meets ledger facts.
 *
 * @remarks
 * Everything here is append-only. Nothing is ever updated or deleted, which is
 * what makes a read at an earlier position a faithful reconstruction rather
 * than the present with some rows hidden.
 *
 * Three consequences follow, and all three are deliberate:
 *
 * - **Transitions are nodes, not literals.** A clearance is a `Clearance` node
 *   naming its item, its boundary, and its time; a resolution is a `Resolution`
 *   node naming its item, its time, and why. Writing them as bare literals
 *   would have been smaller and would have made "how did this item get here"
 *   unanswerable.
 * - **Clearance names a boundary, never an index.** Ordinals shift when a frame
 *   is reshaped; identities do not. This is what lets a frame change without
 *   silently re-pointing history at a different gate.
 * - **Position is derived, never stored.** It is the first boundary the item has
 *   not cleared, computed against the frame as it now stands.
 *
 * The query surface is conjunctive-only. That is a constraint of this
 * repository's ledger contract, kept small so a non-Fluree provider can satisfy
 * it honestly — not a limitation of any one substrate.
 *
 * @agents
 * Keep boundary concerns out of this file. Handlers decide caller-actionable
 * errors from the values returned here.
 */
import { type SemanticLedgerPort, term } from "@rawr/resource-semantic-ledger";
import type { BoundaryInput, BoundarySpec } from "../../model/dto/boundary";
import type { ItemView } from "../../model/dto/item";
import type { StreamView } from "../../model/dto/stream";
import type { TraceEvent } from "../../model/dto/trace";

const NS = "https://rawr.dev/ns/workstream#";

/** Predicate IRIs. One constant per fact kind keeps queries honest. */
const P = {
  kind: `${NS}kind`,
  ofStream: `${NS}ofStream`,
  ofItem: `${NS}ofItem`,
  ofBoundary: `${NS}ofBoundary`,
  index: `${NS}index`,
  key: `${NS}key`,
  requires: `${NS}requires`,
  title: `${NS}title`,
  tag: `${NS}tag`,
  derivedFrom: `${NS}derivedFrom`,
  grants: `${NS}grants`,
  at: `${NS}at`,
  note: `${NS}note`,
  status: `${NS}status`,
  revision: `${NS}revision`,
} as const;

const streamIri = (streamId: string): string => `${NS}stream/${encodeURIComponent(streamId)}`;
const boundaryIri = (streamId: string, key: string): string =>
  `${streamIri(streamId)}/boundary/${key}`;
const itemIri = (streamId: string, itemId: string): string =>
  `${streamIri(streamId)}/item/${encodeURIComponent(itemId)}`;
const clearanceIri = (streamId: string, itemId: string, boundaryKey: string): string =>
  `${itemIri(streamId, itemId)}/cleared/${boundaryKey}`;
const resolutionIri = (streamId: string, itemId: string): string =>
  `${itemIri(streamId, itemId)}/resolution`;
const closureIri = (streamId: string): string => `${streamIri(streamId)}/closure`;
const revisionIri = (revision: string): string => `${NS}revision/${encodeURIComponent(revision)}`;

/** Recover the caller-facing id from a subject IRI. */
const localId = (iri: string): string => decodeURIComponent(iri.slice(iri.lastIndexOf("/") + 1));

/** Stable boundary identity assigned when a frame is shaped. */
const boundaryKeyFor = (index: number): string => `b${index}`;

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
 * @param ledgerRef - Line identity in `name:branch` form, naming one revision.
 */
export function createStreamStore(ledger: SemanticLedgerPort, ledgerRef: string) {
  /** Fetch `subject -> value` pairs for one predicate across one stream. */
  async function pairsFor(
    predicate: string,
    streamId: string,
    at: number | undefined,
    kind: "Item" | "Boundary" | "Clearance" | "Resolution" | "Closure"
  ): Promise<{ subject: string; value: string }[]> {
    const rows = await ledger.select({
      ledger: ledgerRef,
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

  /** Collapse pairs into a single-valued map, last write winning. */
  function single(pairs: { subject: string; value: string }[]): Map<string, string> {
    return new Map(pairs.map((pair) => [pair.subject, pair.value]));
  }

  return {
    async ensureLedger(): Promise<void> {
      await ledger.ensureLedger({ ledger: ledgerRef });
    },

    async head(): Promise<number> {
      return (await ledger.head({ ledger: ledgerRef })).t;
    },

    async streamExists(streamId: string, at?: number): Promise<boolean> {
      const rows = await ledger.select({
        ledger: ledgerRef,
        at,
        query: {
          select: ["s"],
          where: [
            { subject: term.var("s"), predicate: term.iri(P.kind), object: term.literal("Stream") },
          ],
        },
      });
      return rows.some((row) => row.s === streamIri(streamId));
    },

    /** Write the stream node and one node per boundary, in one transaction. */
    async createStream(
      streamId: string,
      boundaries: readonly BoundaryInput[],
      createdAt: string
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerRef,
        nodes: [
          {
            id: streamIri(streamId),
            properties: [
              { predicate: P.kind, object: term.literal("Stream") },
              { predicate: P.title, object: term.literal(streamId) },
              { predicate: P.at, object: term.literal(createdAt) },
            ],
          },
          ...boundaries.map((boundary, index) => ({
            id: boundaryIri(streamId, boundaryKeyFor(index)),
            properties: [
              { predicate: P.kind, object: term.literal("Boundary") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.index, object: term.literal(String(index)) },
              { predicate: P.key, object: term.literal(boundaryKeyFor(index)) },
              { predicate: P.requires, object: term.literal(boundary.requires) },
            ],
          })),
        ],
      });
      return receipt.t;
    },

    async listBoundaries(streamId: string, at?: number): Promise<BoundarySpec[]> {
      const [indexes, keys, requires] = await Promise.all([
        pairsFor(P.index, streamId, at, "Boundary"),
        pairsFor(P.key, streamId, at, "Boundary"),
        pairsFor(P.requires, streamId, at, "Boundary"),
      ]);
      const keyBy = single(keys);
      const requiresBy = single(requires);

      return indexes
        .map((pair) => ({
          index: Number(pair.value),
          key: keyBy.get(pair.subject) ?? "",
          requires: requiresBy.get(pair.subject) ?? "",
        }))
        .sort((left, right) => left.index - right.index)
        .map((boundary) => ({ key: boundary.key, requires: boundary.requires }));
    },

    async admitItem(
      streamId: string,
      itemId: string,
      title: string,
      tags: readonly string[],
      createdAt: string
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerRef,
        nodes: [
          {
            id: itemIri(streamId, itemId),
            properties: [
              { predicate: P.kind, object: term.literal("Item") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.title, object: term.literal(title) },
              { predicate: P.at, object: term.literal(createdAt) },
              ...tags.map((tag) => ({ predicate: P.tag, object: term.literal(tag) })),
            ],
          },
        ],
      });
      return receipt.t;
    },

    async itemExists(streamId: string, itemId: string, at?: number): Promise<boolean> {
      const rows = await ledger.select({
        ledger: ledgerRef,
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

    /**
     * Record that one item cleared one boundary.
     *
     * @remarks
     * The subject IRI is derived from item and boundary, so re-clearing the
     * same boundary rewrites an identical node instead of accumulating
     * duplicates. That is what keeps `push` idempotent.
     */
    async recordCleared(
      streamId: string,
      itemId: string,
      boundaryKey: string,
      at: string
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerRef,
        nodes: [
          {
            id: clearanceIri(streamId, itemId, boundaryKey),
            properties: [
              { predicate: P.kind, object: term.literal("Clearance") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.ofItem, object: term.iri(itemIri(streamId, itemId)) },
              { predicate: P.ofBoundary, object: term.iri(boundaryIri(streamId, boundaryKey)) },
              { predicate: P.at, object: term.literal(at) },
            ],
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
        ledger: ledgerRef,
        nodes: [
          {
            id: itemIri(streamId, childId),
            properties: [
              { predicate: P.kind, object: term.literal("Item") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.title, object: term.literal(title) },
              { predicate: P.at, object: term.literal(createdAt) },
              { predicate: P.derivedFrom, object: term.iri(itemIri(streamId, parentId)) },
              { predicate: P.grants, object: term.literal(grants) },
            ],
          },
        ],
      });
      return receipt.t;
    },

    /** Close the loop: record the resolution and grant its tag to the parent. */
    async resolveDerived(
      streamId: string,
      childId: string,
      parentId: string,
      grants: string,
      at: string,
      note: string | undefined
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerRef,
        nodes: [
          {
            id: resolutionIri(streamId, childId),
            properties: [
              { predicate: P.kind, object: term.literal("Resolution") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.ofItem, object: term.iri(itemIri(streamId, childId)) },
              { predicate: P.at, object: term.literal(at) },
              ...(note === undefined ? [] : [{ predicate: P.note, object: term.literal(note) }]),
            ],
          },
          {
            id: itemIri(streamId, parentId),
            properties: [{ predicate: P.tag, object: term.literal(grants) }],
          },
        ],
      });
      return receipt.t;
    },

    /** Seal the stream against further work. Reads keep working forever. */
    async closeStream(streamId: string, at: string, note: string | undefined): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerRef,
        nodes: [
          {
            id: closureIri(streamId),
            properties: [
              { predicate: P.kind, object: term.literal("Closure") },
              { predicate: P.ofStream, object: term.iri(streamIri(streamId)) },
              { predicate: P.at, object: term.literal(at) },
              ...(note === undefined ? [] : [{ predicate: P.note, object: term.literal(note) }]),
            ],
          },
        ],
      });
      return receipt.t;
    },

    /** Read the closure fact, if the stream has been sealed. */
    async readClosure(
      streamId: string,
      at?: number
    ): Promise<{ closedAt: string | null; closedNote: string | null }> {
      const [times, notes] = await Promise.all([
        pairsFor(P.at, streamId, at, "Closure"),
        pairsFor(P.note, streamId, at, "Closure"),
      ]);
      const iri = closureIri(streamId);
      return {
        closedAt: single(times).get(iri) ?? null,
        closedNote: single(notes).get(iri) ?? null,
      };
    },

    /**
     * Assemble every item in the stream from its constituent facts.
     *
     * @param streamId - Stream to read.
     * @param boundaries - Frame to derive position against.
     * @param at - Observe the ledger as it stood at this position.
     */
    async listItems(
      streamId: string,
      boundaries: readonly BoundarySpec[],
      at?: number
    ): Promise<ItemView[]> {
      const [titles, tags, derivedFrom, grants, clearedItem, clearedBoundary, resolvedItem] =
        await Promise.all([
          pairsFor(P.title, streamId, at, "Item"),
          pairsFor(P.tag, streamId, at, "Item"),
          pairsFor(P.derivedFrom, streamId, at, "Item"),
          pairsFor(P.grants, streamId, at, "Item"),
          pairsFor(P.ofItem, streamId, at, "Clearance"),
          pairsFor(P.ofBoundary, streamId, at, "Clearance"),
          pairsFor(P.ofItem, streamId, at, "Resolution"),
        ]);

      const tagsBy = group(tags);
      const derivedBy = single(derivedFrom);
      const grantsBy = single(grants);
      const boundaryByClearance = single(clearedBoundary);

      // Fold clearance nodes into `item -> boundary keys`.
      const clearedBy = new Map<string, Set<string>>();
      for (const { subject, value } of clearedItem) {
        const boundaryOf = boundaryByClearance.get(subject);
        if (boundaryOf === undefined) continue;
        const bucket = clearedBy.get(value) ?? new Set<string>();
        bucket.add(localId(boundaryOf));
        clearedBy.set(value, bucket);
      }

      const resolvedItems = new Set(resolvedItem.map((pair) => pair.value));

      return titles
        .map((pair) => {
          const derivedFromIri = derivedBy.get(pair.subject);
          const cleared = clearedBy.get(pair.subject) ?? new Set<string>();

          // Position is the first boundary this item has not cleared, measured
          // against the frame as it now stands.
          let position = 0;
          while (position < boundaries.length && cleared.has(boundaries[position]?.key ?? "")) {
            position += 1;
          }

          return {
            id: localId(pair.subject),
            title: pair.value,
            tags: [...new Set(tagsBy.get(pair.subject) ?? [])].sort(),
            cleared: [...cleared].sort(),
            position,
            derivedFrom: derivedFromIri === undefined ? null : localId(derivedFromIri),
            grants: grantsBy.get(pair.subject) ?? null,
            resolved: resolvedItems.has(pair.subject),
          } satisfies ItemView;
        })
        .sort((left, right) => left.id.localeCompare(right.id));
    },

    /** Assemble the whole stream: its frame, its items, and its closure. */
    async readStream(streamId: string, at?: number): Promise<StreamView> {
      const boundaries = await this.listBoundaries(streamId, at);
      const [items, closure] = await Promise.all([
        this.listItems(streamId, boundaries, at),
        this.readClosure(streamId, at),
      ]);
      return { streamId, boundaries, items, ...closure };
    },

    /**
     * Reconstruct one item's trajectory from its durable transitions.
     *
     * @remarks
     * Every event carries its own recorded time, so this is one read rather
     * than a walk across ledger positions.
     */
    async traceItem(
      streamId: string,
      itemId: string,
      boundaries: readonly BoundarySpec[],
      at?: number
    ): Promise<TraceEvent[]> {
      const [
        itemTimes,
        derivedFrom,
        grants,
        clearedItem,
        clearedBoundary,
        clearedAt,
        resolvedItem,
        resolvedAt,
        resolvedNote,
      ] = await Promise.all([
        pairsFor(P.at, streamId, at, "Item"),
        pairsFor(P.derivedFrom, streamId, at, "Item"),
        pairsFor(P.grants, streamId, at, "Item"),
        pairsFor(P.ofItem, streamId, at, "Clearance"),
        pairsFor(P.ofBoundary, streamId, at, "Clearance"),
        pairsFor(P.at, streamId, at, "Clearance"),
        pairsFor(P.ofItem, streamId, at, "Resolution"),
        pairsFor(P.at, streamId, at, "Resolution"),
        pairsFor(P.note, streamId, at, "Resolution"),
      ]);

      const subject = itemIri(streamId, itemId);
      const requiresByKey = new Map(
        boundaries.map((boundary) => [boundary.key, boundary.requires])
      );
      const events: TraceEvent[] = [];

      const admittedAt = single(itemTimes).get(subject);
      if (admittedAt !== undefined) {
        const parent = single(derivedFrom).get(subject);
        events.push({
          at: admittedAt,
          kind: "admitted",
          boundary: null,
          requires: single(grants).get(subject) ?? null,
          subject: parent === undefined ? null : localId(parent),
          note: null,
        });
      }

      const boundaryByClearance = single(clearedBoundary);
      const timeByClearance = single(clearedAt);
      for (const pair of clearedItem) {
        if (pair.value !== subject) continue;
        const key = localId(boundaryByClearance.get(pair.subject) ?? "");
        events.push({
          at: timeByClearance.get(pair.subject) ?? "",
          kind: "cleared",
          boundary: key,
          requires: requiresByKey.get(key) ?? null,
          subject: null,
          note: null,
        });
      }

      // Children peeled off this item are part of its story, not only theirs.
      for (const pair of single(derivedFrom)) {
        if (pair[1] !== subject) continue;
        events.push({
          at: single(itemTimes).get(pair[0]) ?? "",
          kind: "peeled-off",
          boundary: null,
          requires: single(grants).get(pair[0]) ?? null,
          subject: localId(pair[0]),
          note: null,
        });
      }

      const timeByResolution = single(resolvedAt);
      const noteByResolution = single(resolvedNote);
      for (const pair of resolvedItem) {
        if (pair.value !== subject) continue;
        events.push({
          at: timeByResolution.get(pair.subject) ?? "",
          kind: "resolved",
          boundary: null,
          requires: single(grants).get(subject) ?? null,
          subject: null,
          note: noteByResolution.get(pair.subject) ?? null,
        });
      }

      return events.sort((left, right) => left.at.localeCompare(right.at));
    },

    /** Record what was decided about a candidate revision. */
    async recordRevisionStatus(
      revision: string,
      status: "promoted" | "abandoned",
      at: string,
      note: string | undefined
    ): Promise<number> {
      const receipt = await ledger.transact({
        ledger: ledgerRef,
        nodes: [
          {
            id: revisionIri(revision),
            properties: [
              { predicate: P.kind, object: term.literal("Revision") },
              { predicate: P.revision, object: term.literal(revision) },
              { predicate: P.status, object: term.literal(status) },
              { predicate: P.at, object: term.literal(at) },
              ...(note === undefined ? [] : [{ predicate: P.note, object: term.literal(note) }]),
            ],
          },
        ],
      });
      return receipt.t;
    },

    /** Read every recorded revision disposition from this line. */
    async readRevisionStatuses(): Promise<Map<string, "promoted" | "abandoned">> {
      const rows = await ledger.select({
        ledger: ledgerRef,
        query: {
          select: ["r", "v"],
          where: [
            { subject: term.var("s"), predicate: term.iri(P.revision), object: term.var("r") },
            { subject: term.var("s"), predicate: term.iri(P.status), object: term.var("v") },
          ],
        },
      });
      const statuses = new Map<string, "promoted" | "abandoned">();
      for (const row of rows) {
        if (row.r === undefined) continue;
        if (row.v === "promoted" || row.v === "abandoned") statuses.set(row.r, row.v);
      }
      return statuses;
    },
  };
}

/** Structural type of the ledger-backed stream store. */
export type StreamStore = ReturnType<typeof createStreamStore>;
