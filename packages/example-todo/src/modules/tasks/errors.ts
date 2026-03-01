/**
 * @fileoverview Task-module ORPC boundary errors.
 *
 * @remarks
 * Export individual typed ORPC error definitions directly. Routers should
 * import these and pass them to `.errors(...)` without local wrapper objects.
 */
import { schema } from "@rawr/orpc-standards";
import type { ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";

const InvalidTaskTitleData = schema(
  Type.Object(
    {
      title: Type.Optional(Type.String()),
    },
    { additionalProperties: false },
  ),
);

export const INVALID_TASK_TITLE: ErrorMapItem<typeof InvalidTaskTitleData> = {
  status: 400,
  message: "Invalid task title",
  data: InvalidTaskTitleData,
} as const;
