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
