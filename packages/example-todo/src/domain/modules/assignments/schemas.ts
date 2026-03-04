/**
 * @fileoverview Assignment entity schema and inferred type.
 *
 * @remarks
 * Assignment is a composite-domain record linking tasks and tags.
 * Keep schema focused on persisted linkage data, not denormalized view models.
 *
 * @agents
 * If you add richer read models (for example embedded task/tag objects), define
 * those as separate procedure output schemas in the router, not by mutating this
 * base entity schema.
 */
import { type Static, Type } from "typebox";

export const AssignmentSchema = Type.Object(
  {
    id: Type.String({
      format: "uuid",
      description: "Stable unique identifier for the assignment row.",
    }),
    taskId: Type.String({
      format: "uuid",
      description: "Identifier of the task being tagged.",
    }),
    tagId: Type.String({
      format: "uuid",
      description: "Identifier of the tag assigned to the task.",
    }),
    createdAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the assignment was created.",
    }),
  },
  {
    additionalProperties: false,
    description: "Canonical persisted task-tag assignment entity.",
  },
);

export type Assignment = Static<typeof AssignmentSchema>;
