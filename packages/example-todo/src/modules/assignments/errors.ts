/**
 * @fileoverview Assignment-module ORPC boundary errors.
 *
 * @remarks
 * This file defines caller-actionable conflict semantics for assignments.
 */
import { schema } from "@rawr/orpc-standards";
import type { ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";

const AlreadyAssignedData = schema(
  Type.Object(
    {
      taskId: Type.Optional(Type.String({ minLength: 1 })),
      tagId: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
);

export const ALREADY_ASSIGNED: ErrorMapItem<typeof AlreadyAssignedData> = {
  status: 409,
  message: "Task/tag assignment already exists",
  data: AlreadyAssignedData,
} as const;
