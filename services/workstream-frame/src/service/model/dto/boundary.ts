/**
 * @fileoverview Boundary schema — one gate in the frame's shape.
 */
import { type Static, Type } from "typebox";

/** One boundary in the frame. Work clears it by carrying the required tag. */
export const BoundarySchema = Type.Object(
  {
    requires: Type.String({
      minLength: 1,
      maxLength: 200,
      description: "Tag an item must carry before it may clear this boundary.",
    }),
  },
  { additionalProperties: false, description: "One boundary in the frame's shape." }
);

/** Structural type for one boundary. */
export type BoundarySpec = Static<typeof BoundarySchema>;
