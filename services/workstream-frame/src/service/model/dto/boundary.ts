/**
 * @fileoverview Boundary schemas — one gate in the frame's shape.
 *
 * @remarks
 * A boundary's identity is distinct from its position. Callers declare only
 * what a boundary requires; the frame assigns the identity. Clearance is then
 * recorded against that identity rather than against an ordinal, so reshaping a
 * frame cannot silently re-point history at a different gate.
 */
import { type Static, Type } from "typebox";

/** What a caller declares when shaping a frame. */
export const BoundaryInputSchema = Type.Object(
  {
    requires: Type.String({
      minLength: 1,
      maxLength: 200,
      description: "Tag an item must carry before it may clear this boundary.",
    }),
  },
  { additionalProperties: false, description: "One declared boundary." }
);

/** Structural type for a declared boundary. */
export type BoundaryInput = Static<typeof BoundaryInputSchema>;

/** One boundary as it exists in the frame, carrying its durable identity. */
export const BoundarySchema = Type.Object(
  {
    key: Type.String({
      minLength: 1,
      description: "Durable boundary identity. Clearance names this, never an index.",
    }),
    requires: Type.String({
      minLength: 1,
      description: "Tag an item must carry before it may clear this boundary.",
    }),
  },
  { additionalProperties: false, description: "One boundary in the frame's shape." }
);

/** Structural type for one boundary. */
export type BoundarySpec = Static<typeof BoundarySchema>;
