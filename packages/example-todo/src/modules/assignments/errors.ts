/**
 * @fileoverview Assignment-module ORPC boundary errors.
 *
 * @remarks
 * This file defines caller-actionable conflict semantics for assignments.
 */
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";

export const assignmentErrorMap = {
  ALREADY_ASSIGNED: {
    status: 409,
    message: "Task/tag assignment already exists",
    data: schema(
      Type.Object(
        {
          taskId: Type.Optional(Type.String({ minLength: 1 })),
          tagId: Type.Optional(Type.String({ minLength: 1 })),
        },
        { additionalProperties: false },
      ),
    ),
  },
} as const;
