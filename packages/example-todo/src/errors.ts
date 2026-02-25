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
