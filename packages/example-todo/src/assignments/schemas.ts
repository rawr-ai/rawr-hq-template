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
    id: Type.String({ format: "uuid" }),
    taskId: Type.String({ format: "uuid" }),
    tagId: Type.String({ format: "uuid" }),
    createdAt: Type.String({ format: "date-time" }),
  },
  { additionalProperties: false },
);

export type Assignment = Static<typeof AssignmentSchema>;
