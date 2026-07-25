/**
 * @fileoverview Item schema — work moving through the frame.
 *
 * @remarks
 * `position` is derived, never stored: it is the index of the first boundary
 * this item has *not* cleared, computed by walking the current frame against
 * the item's durable clearance facts.
 *
 * That definition is deliberate. Counting clearances gives the same answer only
 * while the frame never changes shape. Deriving position from the frame means
 * an item that gains a new boundary ahead of it correctly moves back to face
 * it — work is measured against the law as the law now stands, which is the
 * behaviour the model exists to have.
 */
import { type Static, Type } from "typebox";

/** One item reconstructed from durable ledger facts. */
export const ItemSchema = Type.Object(
  {
    id: Type.String({ minLength: 1, description: "Caller-facing item identifier." }),
    title: Type.String({ description: "Human-readable item title." }),
    tags: Type.Array(Type.String(), {
      description: "Tags the item carries. Boundaries are cleared by tag.",
    }),
    cleared: Type.Array(Type.String(), {
      description: "Durable identities of every boundary this item has cleared.",
    }),
    position: Type.Number({
      minimum: 0,
      description: "Index of the first boundary not yet cleared. Derived from the frame.",
    }),
    derivedFrom: Type.Union([Type.String(), Type.Null()], {
      description: "Item this one was peeled off from, or null if admitted directly.",
    }),
    grants: Type.Union([Type.String(), Type.Null()], {
      description: "Tag this item grants its parent once resolved.",
    }),
    resolved: Type.Boolean({ description: "Whether a derived item has been resolved." }),
  },
  { additionalProperties: false, description: "One item reconstructed from durable facts." }
);

/** Structural type for one item view. */
export type ItemView = Static<typeof ItemSchema>;
