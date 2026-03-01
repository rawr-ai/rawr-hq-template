/**
 * @fileoverview Task entity schema and inferred type.
 *
 * @remarks
 * This module defines the canonical runtime shape for task data in this domain.
 * Procedure inputs/outputs can be smaller than this shape; entity schema models
 * persisted row shape.
 *
 * @agents
 * Keep schema and type co-located. If you evolve storage fields, update both the
 * schema and all module procedures that expose this entity.
 */
import { type Static, Type } from "typebox";

export const TaskSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    title: Type.String({ minLength: 1, maxLength: 500 }),
    description: Type.Union([Type.String({ maxLength: 2000 }), Type.Null()]),
    completed: Type.Boolean(),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export type Task = Static<typeof TaskSchema>;
