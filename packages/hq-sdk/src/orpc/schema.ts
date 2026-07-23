import type { Schema, SchemaIssue } from "@orpc/contract";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

export function typeBoxStandardSchema<T extends TSchema>(
  typeboxSchema: T
): Schema<Static<T>, Static<T>> {
  return {
    "~standard": {
      version: 1,
      vendor: "typebox",
      validate: (value) => {
        if (Value.Check(typeboxSchema, value)) {
          return { value: value as Static<T> };
        }

        const issues = Value.Errors(typeboxSchema, value).map(
          (issue) => ({ message: issue.message }) satisfies SchemaIssue
        );

        return { issues };
      },
    },
    __typebox: typeboxSchema,
  } as Schema<Static<T>, Static<T>>;
}

export function schema<T extends TSchema>(typeboxSchema: T): Schema<Static<T>, Static<T>> {
  return typeBoxStandardSchema(typeboxSchema);
}
