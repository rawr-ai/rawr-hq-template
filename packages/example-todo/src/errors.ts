/**
 * @fileoverview Service-level error definitions and shared ORPC error catalog.
 *
 * @remarks
 * This file is for service-level errors shared across modules. Typical setup:
 * 1) Define shared domain error classes (`NotFoundError`, `DatabaseError`).
 * 2) Define shared ORPC error catalog entries for reusable procedure surfaces.
 * 3) Build reusable ORPC error map from the catalog.
 *
 * Keep module-specific failures in each module's `errors.ts` to avoid turning
 * this file into a cross-domain dumping ground.
 *
 * @agents
 * Add entries here only when the same failure surface is reused across multiple
 * modules/procedures. If usage is local to one procedure, prefer procedure-local
 * error definitions near that procedure for better readability.
 */
import { createOrpcErrorMapFromDomainCatalog } from "@rawr/orpc-standards";
import { Type } from "typebox";

export class NotFoundError extends Error {
  readonly _tag = "NotFoundError" as const;

  constructor(
    readonly entity: string,
    readonly id: string,
  ) {
    super(`${entity} '${id}' not found`);
  }
}

export class DatabaseError extends Error {
  readonly _tag = "DatabaseError" as const;

  constructor(readonly cause: unknown) {
    super("Database operation failed");
  }
}

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
