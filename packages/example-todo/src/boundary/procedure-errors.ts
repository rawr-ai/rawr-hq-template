/**
 * @fileoverview Shared ORPC boundary error definitions for the todo package.
 *
 * @remarks
 * Export individual reusable error definitions directly. Procedures can import
 * these and pass them to `.errors(...)` without an intermediate map wrapper.
 */
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

export const RESOURCE_NOT_FOUND = {
  status: 404,
  message: "Resource not found",
  data: schema(
    Type.Object(
      {
        entity: optionalString,
        id: optionalString,
      },
      { additionalProperties: false },
    ),
  ),
} as const;
