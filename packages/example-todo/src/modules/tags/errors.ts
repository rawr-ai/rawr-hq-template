/**
 * @fileoverview Tag-module ORPC boundary errors.
 *
 * @remarks
 * Keep only caller-actionable boundary errors here.
 * Internal subsystem errors are not part of this contract by default.
 */
import { schema } from "@rawr/orpc-standards";
import type { ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";

const DuplicateTagData = schema(
  Type.Object(
    {
      name: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
);

export const DUPLICATE_TAG: ErrorMapItem<typeof DuplicateTagData> = {
  status: 409,
  message: "Tag already exists",
  data: DuplicateTagData,
} as const;
