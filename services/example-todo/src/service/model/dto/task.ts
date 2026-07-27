/**
 * @fileoverview Canonical task record shared across the Todo capability suite.
 *
 * @remarks
 * Tasks owns task operations and policy. The service root owns this inert
 * record vocabulary because task records cross the Tasks, Assignments, and
 * persistence boundaries without transferring operation ownership.
 */
import { type Static, Type } from "typebox";
import { TodoIdentifierSchema } from "./identifier";
import { WorkspaceIdSchema } from "./workspace-id";

/** Structural authority for a persisted task record. */
export const TaskSchema = Type.Object(
  {
    id: TodoIdentifierSchema,
    workspaceId: WorkspaceIdSchema,
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
      { description: "Optional task description value." }
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
  }
);

/** Task record type generated from the canonical TypeBox schema. */
export type Task = Static<typeof TaskSchema>;
