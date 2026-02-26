/**
 * @fileoverview Assignment-module-specific errors and ORPC error map entries.
 *
 * @remarks
 * This file captures assignment-specific conflict semantics that are not shared
 * by all modules.
 *
 * @agents
 * Keep shared failures out of this file. Use service-level shared errors for
 * generic not-found/database cases and keep assignment-specific conflicts here.
 */
import { createOrpcErrorMapFromDomainCatalog } from "@rawr/orpc-standards";
import { Type } from "typebox";

export class AlreadyAssignedError extends Error {
  readonly _tag = "AlreadyAssignedError" as const;

  constructor(
    readonly taskId: string,
    readonly tagId: string,
  ) {
    super(`Task '${taskId}' already has tag '${tagId}'`);
  }
}

export const assignmentErrorCatalog = {
  ALREADY_ASSIGNED: {
    status: 409,
    message: "Task/tag assignment already exists",
    data: Type.Object(
      {
        taskId: Type.Optional(Type.String({ minLength: 1 })),
        tagId: Type.Optional(Type.String({ minLength: 1 })),
      },
      { additionalProperties: false },
    ),
  },
} as const;

export const assignmentErrorMap = createOrpcErrorMapFromDomainCatalog(assignmentErrorCatalog);
