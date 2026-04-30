export interface RuntimeSchema<TValue = unknown> {
  readonly kind: "runtime.schema";
  readonly id: string;
  readonly redacted?: boolean;
  parse(value: unknown): TValue;
}

export type RuntimeSchemaValue<TSchema extends RuntimeSchema<unknown>> =
  TSchema extends RuntimeSchema<infer TValue> ? TValue : never;

export namespace RuntimeSchema {
  export type Infer<TSchema extends RuntimeSchema<unknown>> =
    RuntimeSchemaValue<TSchema>;
}

type RuntimeSchemaShape = Record<string, RuntimeSchema<unknown>>;

type RuntimeSchemaStructValue<TShape extends RuntimeSchemaShape> = {
  readonly [TKey in keyof TShape]: RuntimeSchemaValue<TShape[TKey]>;
};

function createRuntimeSchema<TValue>(
  id: string,
  parse: (value: unknown) => TValue,
  options?: { readonly redacted?: boolean },
): RuntimeSchema<TValue> {
  return {
    kind: "runtime.schema",
    id,
    redacted: options?.redacted,
    parse,
  };
}

function fail(id: string, expected: string): never {
  throw new Error(`RuntimeSchema ${id} expected ${expected}.`);
}

export function defineRuntimeSchema<const TId extends string, TValue>(input: {
  readonly id: TId;
  readonly parse: (value: unknown) => TValue;
  readonly redacted?: boolean;
}): RuntimeSchema<TValue> {
  return createRuntimeSchema(input.id, input.parse, {
    redacted: input.redacted,
  });
}

export const RuntimeSchema = {
  define: defineRuntimeSchema,

  string(options?: { readonly minLength?: number; readonly id?: string }): RuntimeSchema<string> {
    return createRuntimeSchema(options?.id ?? "runtime.string", (value) => {
      if (typeof value !== "string") fail(options?.id ?? "runtime.string", "string");
      if (options?.minLength !== undefined && value.length < options.minLength) {
        fail(options.id ?? "runtime.string", `string length >= ${options.minLength}`);
      }
      return value;
    });
  },

  redactedString(options?: { readonly minLength?: number; readonly id?: string }): RuntimeSchema<string> {
    const schema = RuntimeSchema.string({
      id: options?.id ?? "runtime.redacted-string",
      minLength: options?.minLength,
    });
    return createRuntimeSchema(schema.id, schema.parse, { redacted: true });
  },

  number(options?: { readonly min?: number; readonly max?: number; readonly id?: string }): RuntimeSchema<number> {
    return createRuntimeSchema(options?.id ?? "runtime.number", (value) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        fail(options?.id ?? "runtime.number", "number");
      }
      if (options?.min !== undefined && value < options.min) {
        fail(options.id ?? "runtime.number", `number >= ${options.min}`);
      }
      if (options?.max !== undefined && value > options.max) {
        fail(options.id ?? "runtime.number", `number <= ${options.max}`);
      }
      return value;
    });
  },

  boolean(options?: { readonly id?: string }): RuntimeSchema<boolean> {
    return createRuntimeSchema(options?.id ?? "runtime.boolean", (value) => {
      if (typeof value !== "boolean") fail(options?.id ?? "runtime.boolean", "boolean");
      return value;
    });
  },

  literal<const TValue extends string | number | boolean | null>(
    expected: TValue,
    options?: { readonly id?: string },
  ): RuntimeSchema<TValue> {
    return createRuntimeSchema(options?.id ?? `runtime.literal.${String(expected)}`, (value) => {
      if (value !== expected) fail(options?.id ?? "runtime.literal", JSON.stringify(expected));
      return expected;
    });
  },

  optional<TValue>(schema: RuntimeSchema<TValue>): RuntimeSchema<TValue | undefined> {
    return createRuntimeSchema(`${schema.id}.optional`, (value) => {
      if (value === undefined) return undefined;
      return schema.parse(value);
    }, { redacted: schema.redacted });
  },

  array<TValue>(schema: RuntimeSchema<TValue>, options?: { readonly id?: string }): RuntimeSchema<readonly TValue[]> {
    return createRuntimeSchema(options?.id ?? `${schema.id}.array`, (value) => {
      if (!Array.isArray(value)) fail(options?.id ?? `${schema.id}.array`, "array");
      return value.map((item) => schema.parse(item));
    }, { redacted: schema.redacted });
  },

  struct<const TShape extends RuntimeSchemaShape>(
    shape: TShape,
    options?: { readonly id?: string },
  ): RuntimeSchema<RuntimeSchemaStructValue<TShape>> {
    return createRuntimeSchema(options?.id ?? "runtime.struct", (value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        fail(options?.id ?? "runtime.struct", "object");
      }
      const source = value as Record<string, unknown>;
      const parsed: Record<string, unknown> = {};
      for (const [key, schema] of Object.entries(shape)) {
        parsed[key] = schema.parse(source[key]);
      }
      return parsed as RuntimeSchemaStructValue<TShape>;
    });
  },

  unknown(options?: { readonly id?: string }): RuntimeSchema<unknown> {
    return createRuntimeSchema(options?.id ?? "runtime.unknown", (value) => value);
  },
} as const;
