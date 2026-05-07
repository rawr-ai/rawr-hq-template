/**
 * @fileoverview Shared ORPC boundary error definitions for the todo package.
 *
 * @remarks
 * Export individual reusable error definitions directly. Procedures can import
 * these and pass them to `.errors(...)` without an intermediate map wrapper.
 */
import { schema } from "@rawr/hq-sdk";
import type { ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";

const ResourceNotFoundData = schema(
  Type.Object(
    {
      entity: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Entity name that was not found (for example Task or Tag).",
        }),
      ),
      id: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Identifier associated with the missing entity.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Context payload for RESOURCE_NOT_FOUND boundary errors.",
    },
  ),
);

const ReadOnlyModeData = schema(
  Type.Object(
    {
      path: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Procedure path that was blocked while read-only mode was enabled.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Context payload for READ_ONLY_MODE boundary errors.",
    },
  ),
);

const AssignmentLimitReachedData = schema(
  Type.Object(
    {
      taskId: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Task id that hit the configured assignment limit.",
        }),
      ),
      maxAssignmentsPerTask: Type.Optional(
        Type.Number({
          minimum: 1,
          description: "Configured per-task assignment ceiling.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Context payload for ASSIGNMENT_LIMIT_REACHED boundary errors.",
    },
  ),
);

export const RESOURCE_NOT_FOUND: ErrorMapItem<typeof ResourceNotFoundData> = {
  status: 404,
  message: "Resource not found",
  data: ResourceNotFoundData,
} as const;

export const READ_ONLY_MODE: ErrorMapItem<typeof ReadOnlyModeData> = {
  status: 409,
  message: "Write operations are blocked while read-only mode is enabled",
  data: ReadOnlyModeData,
} as const;

export const ASSIGNMENT_LIMIT_REACHED: ErrorMapItem<typeof AssignmentLimitReachedData> = {
  status: 409,
  message: "Task reached the configured assignment limit",
  data: AssignmentLimitReachedData,
} as const;
