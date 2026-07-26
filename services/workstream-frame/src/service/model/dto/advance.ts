/**
 * @fileoverview Advance schema — what one turn of the iterator did to one item.
 */
import { type Static, Type } from "typebox";

/** Outcome of pushing one item through the frame once. */
export const AdvanceSchema = Type.Object(
  {
    itemId: Type.String({ description: "Item the iterator touched." }),
    clearedTo: Type.Number({
      minimum: 0,
      description: "Boundary count the item had cleared when the iterator stopped.",
    }),
    outcome: Type.Union(
      [
        Type.Literal("completed", { description: "Cleared every boundary." }),
        Type.Literal("blocked", { description: "Stopped at a boundary it could not clear." }),
        Type.Literal("waiting", { description: "Blocked with a peel-off already outstanding." }),
        Type.Literal("idle", { description: "A derived item; it advances once resolved." }),
      ],
      { description: "What the iterator concluded for this item." }
    ),
    blockedAt: Type.Union([Type.Number(), Type.Null()], {
      description: "Boundary index that refused the item, or null.",
    }),
    requires: Type.Union([Type.String(), Type.Null()], {
      description: "Tag the refusing boundary demanded, or null.",
    }),
    derivedItemId: Type.Union([Type.String(), Type.Null()], {
      description: "Item peeled off by this push, or null if none was created.",
    }),
  },
  { additionalProperties: false, description: "What the iterator did to one item." }
);

/** Structural type for one advance report entry. */
export type AdvanceView = Static<typeof AdvanceSchema>;
