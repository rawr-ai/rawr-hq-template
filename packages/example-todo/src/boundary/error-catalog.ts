/**
 * @fileoverview Shared ORPC error catalog for service-level reusable procedure errors.
 *
 * @remarks
 * This file defines ORPC-facing error shapes that procedures can reuse. Domain
 * error classes live in `service-errors.ts` and module-local `errors.ts` files.
 *
 * @agents
 * Add entries here only when the same failure surface is reused across multiple
 * modules/procedures. If usage is local to one procedure, prefer procedure-local
 * error definitions near that procedure for better readability.
 */
import { createOrpcErrorMapFromDomainCatalog } from "@rawr/orpc-standards";
import { Type } from "typebox";

const optionalString = Type.Optional(
  Type.String({
    minLength: 1,
  }),
);

export const todoServiceErrorCatalog = {
  RESOURCE_NOT_FOUND: {
    status: 404,
    message: "Resource not found",
    data: Type.Object(
      {
        entity: optionalString,
        id: optionalString,
      },
      { additionalProperties: false },
    ),
  },
  DATABASE_ERROR: {
    status: 500,
    message: "Database operation failed",
    data: Type.Object(
      {
        operation: optionalString,
      },
      { additionalProperties: false },
    ),
  },
} as const;

export const todoServiceErrorMap = createOrpcErrorMapFromDomainCatalog(todoServiceErrorCatalog);
