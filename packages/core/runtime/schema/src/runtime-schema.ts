import type { Static, TSchema } from "typebox";
import { Validator } from "typebox/schema";
import { Clone } from "typebox/value";

export interface RuntimeRedactionPolicy {
  readonly paths: readonly string[];
}

export interface RuntimeSchemaIssue {
  readonly message: string;
}

export type RuntimeSchemaResult<TValue> =
  | { readonly success: true; readonly value: TValue }
  | { readonly success: false; readonly issues: readonly RuntimeSchemaIssue[] };

export interface RuntimeRedactedShape {
  readonly schema: unknown;
  readonly redaction?: RuntimeRedactionPolicy;
}

export interface RuntimeSchema<TValue = unknown> {
  readonly kind: "runtime.schema";
  readonly serializable: unknown;
  readonly description?: string;
  readonly redaction?: RuntimeRedactionPolicy;

  decode(input: unknown): RuntimeSchemaResult<TValue>;
  validate(input: unknown): RuntimeSchemaResult<TValue>;
  toRedactedShape(): RuntimeRedactedShape;
}

export type RuntimeSchemaValue<TSchema extends RuntimeSchema<unknown>> =
  TSchema extends RuntimeSchema<infer TValue> ? TValue : never;

export const RuntimeSchema = Object.freeze({
  fromTypeBox<const TypeSchema extends TSchema>(
    schema: TypeSchema,
    options: { readonly redaction?: RuntimeRedactionPolicy } = {}
  ): RuntimeSchema<Static<TypeSchema>> {
    const serializable = Clone(schema);
    const validator = new Validator({}, serializable);
    const redaction = options.redaction
      ? Object.freeze({ paths: Object.freeze([...options.redaction.paths]) })
      : undefined;

    const validate = (input: unknown): RuntimeSchemaResult<Static<TypeSchema>> => {
      if (validator.Check(input)) return { success: true, value: input };
      const [, errors] = validator.Errors(input);
      return {
        success: false,
        issues: Object.freeze(errors.map(({ message }) => Object.freeze({ message }))),
      };
    };

    return Object.freeze({
      kind: "runtime.schema" as const,
      serializable,
      redaction,
      decode: validate,
      validate,
      toRedactedShape: () =>
        Object.freeze({
          schema: Clone(serializable),
          redaction,
        }),
    });
  },
});
