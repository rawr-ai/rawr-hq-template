export interface ServiceSchema<TValue = unknown> {
  readonly kind: "service.schema";
  readonly id: string;
  parse(value: unknown): TValue;
}

export type ServiceSchemaValue<TSchema extends ServiceSchema<unknown>> =
  TSchema extends ServiceSchema<infer TValue> ? TValue : never;

type ServiceSchemaShape = Record<string, ServiceSchema<unknown>>;

type ServiceSchemaStructValue<TShape extends ServiceSchemaShape> = {
  readonly [TKey in keyof TShape]: ServiceSchemaValue<TShape[TKey]>;
};

function createServiceSchema<TValue>(
  id: string,
  parse: (value: unknown) => TValue,
): ServiceSchema<TValue> {
  return {
    kind: "service.schema",
    id,
    parse,
  };
}

function fail(id: string, expected: string): never {
  throw new Error(`service schema ${id} expected ${expected}.`);
}

export function defineServiceSchema<const TId extends string, TValue>(input: {
  readonly id: TId;
  readonly parse: (value: unknown) => TValue;
}): ServiceSchema<TValue> {
  return createServiceSchema(input.id, input.parse);
}

export const schema = {
  define: defineServiceSchema,

  string(options?: { readonly minLength?: number; readonly id?: string }): ServiceSchema<string> {
    return createServiceSchema(options?.id ?? "service.string", (value) => {
      if (typeof value !== "string") fail(options?.id ?? "service.string", "string");
      if (options?.minLength !== undefined && value.length < options.minLength) {
        fail(options.id ?? "service.string", `string length >= ${options.minLength}`);
      }
      return value;
    });
  },

  number(options?: { readonly min?: number; readonly max?: number; readonly id?: string }): ServiceSchema<number> {
    return createServiceSchema(options?.id ?? "service.number", (value) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        fail(options?.id ?? "service.number", "number");
      }
      if (options?.min !== undefined && value < options.min) {
        fail(options.id ?? "service.number", `number >= ${options.min}`);
      }
      if (options?.max !== undefined && value > options.max) {
        fail(options.id ?? "service.number", `number <= ${options.max}`);
      }
      return value;
    });
  },

  boolean(options?: { readonly id?: string }): ServiceSchema<boolean> {
    return createServiceSchema(options?.id ?? "service.boolean", (value) => {
      if (typeof value !== "boolean") fail(options?.id ?? "service.boolean", "boolean");
      return value;
    });
  },

  optional<TValue>(schema: ServiceSchema<TValue>): ServiceSchema<TValue | undefined> {
    return createServiceSchema(`${schema.id}.optional`, (value) => {
      if (value === undefined) return undefined;
      return schema.parse(value);
    });
  },

  array<TValue>(schema: ServiceSchema<TValue>, options?: { readonly id?: string }): ServiceSchema<readonly TValue[]> {
    return createServiceSchema(options?.id ?? `${schema.id}.array`, (value) => {
      if (!Array.isArray(value)) fail(options?.id ?? `${schema.id}.array`, "array");
      return value.map((item) => schema.parse(item));
    });
  },

  object<const TShape extends ServiceSchemaShape>(
    shape: TShape,
    options?: { readonly id?: string },
  ): ServiceSchema<ServiceSchemaStructValue<TShape>> {
    return createServiceSchema(options?.id ?? "service.object", (value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        fail(options?.id ?? "service.object", "object");
      }
      const source = value as Record<string, unknown>;
      const parsed: Record<string, unknown> = {};
      for (const [key, schema] of Object.entries(shape)) {
        parsed[key] = schema.parse(source[key]);
      }
      return parsed as ServiceSchemaStructValue<TShape>;
    });
  },

  unknown(options?: { readonly id?: string }): ServiceSchema<unknown> {
    return createServiceSchema(options?.id ?? "service.unknown", (value) => value);
  },
} as const;
