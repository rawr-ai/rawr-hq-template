/**
 * @fileoverview Shared ORPC procedure error definitions for the todo package boundary.
 *
 * @remarks
 * This file defines reusable ORPC error entries for failures that are common
 * across modules. Procedures still declare explicit `.errors(...)` maps and
 * choose only the entries they need.
 *
 * Keep this focused on reusable boundary errors. One-off procedure failures
 * should stay local to the procedure router for clarity.
 *
 * @agents
 * Add entries here when two or more procedures across modules share the same
 * boundary failure shape. Do not route domain failures through a generic global
 * unwrap/mapping helper; map directly inside procedure handlers.
 */
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

export const todoProcedureErrorMap = {
  RESOURCE_NOT_FOUND: {
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
  },
  DATABASE_ERROR: {
    status: 500,
    message: "Database operation failed",
    data: schema(
      Type.Object(
        {
          operation: optionalString,
        },
        { additionalProperties: false },
      ),
    ),
  },
} as const;
