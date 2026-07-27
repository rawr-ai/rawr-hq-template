/**
 * @fileoverview Canonical task-tag assignment record for the Todo service.
 *
 * @remarks
 * Assignments owns relation behavior and policy. The service root owns this
 * inert record vocabulary because persistence and the service contract share
 * the same stable assignment facts.
 */
import { type Static, Type } from "typebox";
import { TodoIdentifierSchema } from "./identifier";
import { WorkspaceIdSchema } from "./workspace-id";

/** Structural authority for a persisted task-tag assignment record. */
export const AssignmentSchema = Type.Object(
  {
    id: TodoIdentifierSchema,
    workspaceId: WorkspaceIdSchema,
    taskId: TodoIdentifierSchema,
    tagId: TodoIdentifierSchema,
    createdAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the assignment was created.",
    }),
  },
  {
    additionalProperties: false,
    description: "Canonical persisted task-tag assignment entity.",
  }
);

/** Assignment record type generated from the canonical TypeBox schema. */
export type Assignment = Static<typeof AssignmentSchema>;
