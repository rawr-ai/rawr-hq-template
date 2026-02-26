/**
 * @fileoverview Tag entity schema and inferred type.
 *
 * @remarks
 * Keep this as the canonical shape for tag records. Procedure contracts may be
 * more specific in input form but should resolve to this output entity shape.
 *
 * @agents
 * If tag semantics change (for example color format rules), update this schema
 * and the procedures that accept/normalize input accordingly.
 */
import { type Static, Type } from "typebox";

export const TagSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    name: Type.String({ minLength: 1, maxLength: 50 }),
    color: Type.String({ pattern: "^#[0-9a-fA-F]{6}$" }),
    createdAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export type Tag = Static<typeof TagSchema>;
