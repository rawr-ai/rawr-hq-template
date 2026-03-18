/**
 * @fileoverview Task entity schema and inferred type.
 *
 * @remarks
 * This module defines the canonical runtime shape for task data in this domain module.
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
    id: Type.String({
      format: "uuid",
      description: "Stable unique identifier for the task.",
    }),
    workspaceId: Type.String({
      minLength: 1,
      description: "Workspace scope that owns this task record.",
    }),
    title: Type.String({
      minLength: 1,
      maxLength: 500,
      description: "Primary task title.",
    }),
    description: Type.Union(
      [
        Type.String({
          maxLength: 2000,
          description: "Optional detailed notes for the task.",
        }),
        Type.Null({
          description: "No description is set for this task.",
        }),
      ],
      { description: "Optional task description value." },
    ),
    completed: Type.Boolean({
      description: "Completion status of the task.",
    }),
    createdAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the task was created.",
    }),
    updatedAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the task was last updated.",
    }),
  },
  {
    additionalProperties: false,
    description: "Canonical persisted task entity.",
  },
);

export type Task = Static<typeof TaskSchema>;
