import { Type, type Static } from "typebox";
import { Compile } from "typebox/compile";
import { Value } from "typebox/value";
import { defineRuntimeSchema } from "../../sdk/runtime/schema";

export const TypeBoxRuntimePayloadSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  redaction: Type.Optional(Type.Literal("none")),
});

export type TypeBoxRuntimePayload = Static<typeof TypeBoxRuntimePayloadSchema>;

const validator = Compile(TypeBoxRuntimePayloadSchema);

export const TypeBoxRuntimeSchemaProbe = defineRuntimeSchema({
  id: "typebox.runtime-payload",
  parse(value: unknown): TypeBoxRuntimePayload {
    if (!validator.Check(value)) {
      throw new Error(
        Value.Errors(TypeBoxRuntimePayloadSchema, value)
          .map((error) => error.message)
          .join("; "),
      );
    }

    return value;
  },
});

export function validateTypeBoxInput(value: unknown) {
  return {
    valueCheck: Value.Check(TypeBoxRuntimePayloadSchema, value),
    compiledCheck: validator.Check(value),
    errorCount: [...Value.Errors(TypeBoxRuntimePayloadSchema, value)].length,
  };
}
