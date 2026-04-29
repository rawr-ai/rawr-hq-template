import { Type, type Static } from "typebox";
import { Compile } from "typebox/compile";
import { Value } from "typebox/value";
import { defineRuntimeSchema } from "../../sdk/runtime/schema";

export const TypeBoxWorkItemInputSchema = Type.Object({
  title: Type.String({ minLength: 1 }),
  description: Type.Optional(Type.String()),
});

export type TypeBoxWorkItemInput = Static<typeof TypeBoxWorkItemInputSchema>;

const validator = Compile(TypeBoxWorkItemInputSchema);

export const TypeBoxRuntimeSchemaProbe = defineRuntimeSchema({
  id: "typebox.work-item-input",
  parse(value: unknown): TypeBoxWorkItemInput {
    if (!validator.Check(value)) {
      throw new Error(
        Value.Errors(TypeBoxWorkItemInputSchema, value)
          .map((error) => error.message)
          .join("; "),
      );
    }

    return value;
  },
});

export function validateTypeBoxInput(value: unknown) {
  return {
    valueCheck: Value.Check(TypeBoxWorkItemInputSchema, value),
    compiledCheck: validator.Check(value),
    errorCount: [...Value.Errors(TypeBoxWorkItemInputSchema, value)].length,
  };
}
