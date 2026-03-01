/**
 * @fileoverview Shared ORPC boundary error definitions for the todo package.
 *
 * @remarks
 * This file defines reusable ORPC error entries for failures that are common
 * across modules. Procedures still declare explicit `.errors(...)` maps and
 * choose only the entries they need.
 *
 * Keep this focused on reusable caller-actionable boundary errors. One-off
 * procedure failures should stay local to the procedure router for clarity.
 *
 * @agents
 * Add entries here when two or more procedures across modules share the same
 * boundary failure shape. Do not add internal subsystem failure details as
 * typed boundary API unless callers need to branch on them.
 */
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

export const todoProcedureErrors = {
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
} as const;
