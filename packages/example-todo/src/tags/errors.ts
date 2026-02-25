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
