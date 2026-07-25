/**
 * @fileoverview Item schema — work moving through the frame.
 *
 * @remarks
 * `position` is derived by counting durable `cleared` facts rather than stored
 * as a mutable cursor, which is what keeps a temporal read faithful.
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
    position: Type.Number({
      minimum: 0,
      description: "Count of boundaries this item has cleared. Never decreases.",
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
