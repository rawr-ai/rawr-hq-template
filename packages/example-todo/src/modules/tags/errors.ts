/**
 * @fileoverview Tag-module-specific errors and reusable ORPC error definitions.
 *
 * @remarks
 * Keep module-only failure types here (for example duplicates) instead of
 * promoting them into service-level shared errors.
 *
 * @agents
 * Add to this file when the same tag-specific failure is reused by multiple tag
 * procedures. For one-off failures in a single procedure, prefer local error maps.
 */
import { createOrpcErrorMapFromDomainCatalog } from "@rawr/orpc-standards";
import { Type } from "typebox";

export class DuplicateTagError extends Error {
  readonly _tag = "DuplicateTagError" as const;

  constructor(readonly name: string) {
    super(`Tag '${name}' already exists`);
  }
}

export const tagErrorCatalog = {
  DUPLICATE_TAG: {
    status: 409,
    message: "Tag already exists",
    data: Type.Object(
      {
        name: Type.Optional(Type.String({ minLength: 1 })),
      },
      { additionalProperties: false },
    ),
  },
} as const;

export const tagErrorMap = createOrpcErrorMapFromDomainCatalog(tagErrorCatalog);
