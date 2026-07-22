import {
  type Static,
  type TArray,
  type TCodec,
  type TConstructor,
  type TIntersect,
  type TObject,
  type TProperties,
  type TRecord,
  type TRefine,
  type TSchema,
  type TTuple,
  type TUnion,
  Type,
} from "typebox";
import { Value } from "typebox/value";

type OverlappingKeys<Left, Right> = Extract<keyof Left, keyof Right>;
export type Disjoint<Left, Right> = [OverlappingKeys<Left, Right>] extends [never]
  ? unknown
  : never;

export class SchemaPropertyCollision extends Error {
  readonly keys: readonly string[];

  constructor(keys: readonly string[]) {
    super(`Schema property keys overlap: ${keys.join(", ")}`);
    this.name = "SchemaPropertyCollision";
    this.keys = keys;
  }
}

export class SchemaExecutableNotPortable extends Error {
  readonly paths: readonly string[];

  constructor(paths: readonly string[]) {
    super(`Portable schemas cannot contain executable values: ${paths.join(", ")}`);
    this.name = "SchemaExecutableNotPortable";
    this.paths = paths;
  }
}

export class DataNotPortable extends Error {
  readonly paths: readonly string[];

  constructor(paths: readonly string[]) {
    super(`Durable data is not portable: ${paths.join(", ")}`);
    this.name = "DataNotPortable";
    this.paths = paths;
  }
}

export interface StructuralIssue {
  readonly keyword: string;
  readonly schemaPath: string;
  readonly instancePath: string;
  readonly message: string;
}

export type StructuralDecodeResult<Value> =
  | { readonly kind: "Valid"; readonly value: Value }
  | { readonly kind: "Invalid"; readonly issues: readonly StructuralIssue[] };

export type JsonPrimitive = boolean | null | number | string;
export type PortableData =
  | JsonPrimitive
  | readonly PortableData[]
  | { readonly [key: string]: PortableData };
export type JsonValue = PortableData;

type IsAny<Value> = 0 extends 1 & Value ? true : false;

type ToPortable<Value> = Value extends JsonPrimitive
  ? Value
  : Value extends readonly (infer Entry)[]
    ? readonly ToPortable<Entry>[]
    : Value extends abstract new (
          ...arguments_: never[]
        ) => unknown
      ? never
      : Value extends (...arguments_: never[]) => unknown
        ? never
        : Value extends object
          ? Extract<keyof Value, symbol> extends never
            ? { readonly [Key in keyof Value]: ToPortable<Value[Key]> }
            : never
          : never;

export type Portable<Value> =
  IsAny<Value> extends true
    ? never
    : unknown extends Value
      ? never
      : [Value] extends [ToPortable<Value>]
        ? unknown
        : never;

type SomeSchemaContainsExecutable<Schemas extends readonly TSchema[]> = true extends {
  readonly [Index in keyof Schemas]: Schemas[Index] extends TSchema
    ? SchemaContainsExecutable<Schemas[Index]>
    : false;
}[number]
  ? true
  : false;

type SomePropertyContainsExecutable<Properties extends TProperties> = true extends {
  readonly [Key in keyof Properties]: SchemaContainsExecutable<Properties[Key]>;
}[keyof Properties]
  ? true
  : false;

type SchemaContainsExecutable<Schema extends TSchema> = Schema extends
  | TRefine
  | TCodec
  | TConstructor
  ? true
  : Schema extends TObject<infer Properties>
    ? SomePropertyContainsExecutable<Properties>
    : Schema extends TArray<infer Item>
      ? SchemaContainsExecutable<Item>
      : Schema extends TTuple<infer Items>
        ? SomeSchemaContainsExecutable<Items>
        : Schema extends TUnion<infer Members>
          ? SomeSchemaContainsExecutable<Members>
          : Schema extends TIntersect<infer Members>
            ? SomeSchemaContainsExecutable<Members>
            : Schema extends TRecord<string, infer Value>
              ? SchemaContainsExecutable<Value>
              : false;

export type PortableSchema<Schema extends TSchema> =
  true extends SchemaContainsExecutable<Schema>
    ? never
    : IsAny<Static<Schema>> extends true
      ? never
      : unknown extends Static<Schema>
        ? never
        : [Static<Schema>] extends [ToPortable<Static<Schema>>]
          ? unknown
          : never;

export type DeepReadonly<Value> = Value extends JsonPrimitive | undefined
  ? Value
  : Value extends readonly (infer Entry)[]
    ? readonly DeepReadonly<Entry>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : never;

export function closedObject<const Generic extends TProperties, const Subject extends TProperties>(
  generic: Generic,
  subject: Subject & Disjoint<Generic, Subject>
): TObject<Generic & Subject> {
  const subjectKeys = new Set(Reflect.ownKeys(subject));
  const collisions = Reflect.ownKeys(generic)
    .filter((key) => subjectKeys.has(key))
    .map(String)
    .sort();

  if (collisions.length > 0) {
    throw new SchemaPropertyCollision(collisions);
  }

  const executablePaths = findExecutableSchemaPaths({ generic, subject });
  if (executablePaths.length > 0) {
    throw new SchemaExecutableNotPortable(executablePaths);
  }

  return Type.Object(Object.assign({}, generic, subject), {
    additionalProperties: false,
  });
}

function findExecutableSchemaPaths(
  value: unknown,
  path = "$",
  seen: WeakSet<object> = new WeakSet()
): readonly string[] {
  if (typeof value === "function") {
    return [path];
  }
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return [];
  }

  const schemaKind = Reflect.get(value, "~kind");
  if (schemaKind === "Constructor" || schemaKind === "Function") {
    return [path];
  }

  seen.add(value);
  return Reflect.ownKeys(value).flatMap((key) =>
    findExecutableSchemaPaths(
      Reflect.get(value, key),
      `${path}/${typeof key === "symbol" ? (key.description ?? "symbol") : key}`,
      seen
    )
  );
}

export function decodeStructural<const Schema extends TSchema>(
  schema: Schema,
  input: unknown
): StructuralDecodeResult<Static<Schema>> {
  const portableIssues = findPortableDataIssues(input);
  if (portableIssues.length > 0) {
    return {
      kind: "Invalid",
      issues: portableIssues.map((instancePath) => ({
        keyword: "portable",
        schemaPath: "",
        instancePath,
        message: "Value must contain only finite, acyclic portable data.",
      })),
    };
  }

  if (Value.Check(schema, input)) {
    return { kind: "Valid", value: input };
  }

  return {
    kind: "Invalid",
    issues: Value.Errors(schema, input).map((issue) => ({
      keyword: issue.keyword,
      schemaPath: issue.schemaPath,
      instancePath: issue.instancePath,
      message: issue.message,
    })),
  };
}

export function snapshot<const ValueType>(
  value: ValueType & Portable<ValueType>
): DeepReadonly<ValueType>;
export function snapshot(value: unknown): unknown {
  const portableIssues = findPortableDataIssues(value);
  if (portableIssues.length > 0) {
    throw new DataNotPortable(portableIssues);
  }
  return deepFreeze(Value.Clone(value));
}

export function isPortableData(value: unknown): value is PortableData {
  return findPortableDataIssues(value).length === 0;
}

function findPortableDataIssues(
  value: unknown,
  path = "$",
  ancestors: WeakSet<object> = new WeakSet()
): readonly string[] {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return [];
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? [] : [path];
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    return [path];
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && prototype !== Array.prototype) {
    return [path];
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      const elementKeys = ownKeys.filter((key) => key !== "length");
      const invalidKeys = elementKeys.filter(
        (key) => typeof key !== "string" || !isArrayIndexKey(key, value.length)
      );
      if (invalidKeys.length > 0) {
        return invalidKeys.map((key) => `${path}/${String(key)}`);
      }
      if (elementKeys.length !== value.length) {
        return [path];
      }

      return elementKeys.flatMap((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          descriptor === undefined ||
          descriptor.enumerable !== true ||
          !("value" in descriptor)
        ) {
          return [`${path}/${String(key)}`];
        }
        return findPortableDataIssues(descriptor.value, `${path}/${String(key)}`, ancestors);
      });
    }

    return Reflect.ownKeys(value).flatMap((key) => {
      if (typeof key !== "string") {
        return [`${path}/${String(key)}`];
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || descriptor.enumerable !== true || !("value" in descriptor)) {
        return [`${path}/${key}`];
      }
      return findPortableDataIssues(descriptor.value, `${path}/${key}`, ancestors);
    });
  } finally {
    ancestors.delete(value);
  }
}

function isArrayIndexKey(key: string, length: number): boolean {
  const index = Number(key);
  return Number.isInteger(index) && index >= 0 && index < length && String(index) === key;
}

function deepFreeze(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return value;
  }

  seen.add(value);

  for (const nested of Object.values(value)) {
    deepFreeze(nested, seen);
  }

  return Object.freeze(value);
}
