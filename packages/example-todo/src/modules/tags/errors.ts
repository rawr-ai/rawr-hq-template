/**
 * @fileoverview Tag-module ORPC boundary errors.
 *
 * @remarks
 * Keep only caller-actionable boundary errors here.
 * Internal subsystem errors are not part of this contract by default.
 */
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";

export const DUPLICATE_TAG = {
  status: 409,
  message: "Tag already exists",
  data: schema(
    Type.Object(
      {
        name: Type.Optional(Type.String({ minLength: 1 })),
      },
      { additionalProperties: false },
    ),
  ),
} as const;
