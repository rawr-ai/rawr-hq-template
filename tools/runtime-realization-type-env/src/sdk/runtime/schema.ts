export interface RuntimeSchema<TValue = unknown> {
  readonly kind: "runtime.schema";
  readonly id: string;
  parse(value: unknown): TValue;
}

export type RuntimeSchemaValue<TSchema extends RuntimeSchema<unknown>> =
  TSchema extends RuntimeSchema<infer TValue> ? TValue : never;

export namespace RuntimeSchema {
  export type Infer<TSchema extends RuntimeSchema<unknown>> =
    RuntimeSchemaValue<TSchema>;
}

export function defineRuntimeSchema<const TId extends string, TValue>(input: {
  readonly id: TId;
  readonly parse: (value: unknown) => TValue;
}): RuntimeSchema<TValue> {
  return {
    kind: "runtime.schema",
    id: input.id,
    parse: input.parse,
  };
}

export const schema = {
  string<const TId extends string>(id: TId): RuntimeSchema<string> {
    return defineRuntimeSchema({ id, parse: String });
  },

  object<const TId extends string, TValue>(
    id: TId,
  ): RuntimeSchema<TValue> {
    return defineRuntimeSchema({
      id,
      parse: (value) => value as TValue,
    });
  },
};
