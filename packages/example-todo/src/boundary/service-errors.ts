/**
 * @fileoverview Shared service-level domain error classes.
 *
 * @remarks
 * This file holds domain failures reused by multiple modules. Keep these errors
 * transport-agnostic and independent from ORPC-specific status/code concerns.
 *
 * @agents
 * Add a class here only when it is reused across module boundaries. Module-only
 * domain errors belong in that module's `errors.ts`.
 */
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
