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

export interface RuntimeSchemaOptions {
  readonly description?: string;
  readonly redaction?: RuntimeRedactionPolicy;
}

export const RuntimeSchema = Object.freeze({
  fromTypeBox<const TypeSchema extends TSchema>(
    schema: TypeSchema,
    options: RuntimeSchemaOptions = {}
  ): RuntimeSchema<Static<TypeSchema>> {
    const canonical = Clone(schema);
    const validator = new Validator({}, canonical);
    const serializable = Clone(canonical);
    const schemaDescription = (schema as { readonly description?: unknown }).description;
    const description =
      options.description ??
      (typeof schemaDescription === "string" ? schemaDescription : undefined);
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
      ...(description === undefined ? {} : { description }),
      ...(redaction === undefined ? {} : { redaction }),
      decode: validate,
      validate,
      toRedactedShape: () =>
        Object.freeze({
          schema: Clone(canonical),
          ...(redaction === undefined ? {} : { redaction }),
        }),
    });
  },
});
