import { ReadonlyObject, type Static, type TArrayOptions, type TSchema, Type } from "typebox";

type BoundedArrayOptions = Omit<TArrayOptions, "minItems" | "maxItems"> &
  Readonly<{
    minItems?: number;
    maxItems: number;
  }>;

const controlCharacterPattern = /[\u0000-\u001f\u007f]/u;
const encoder = new TextEncoder();

export const MAX_CANONICAL_ABSOLUTE_PATH_BYTES = 4_096;

type NonEmptyArrayOptions = Omit<TArrayOptions, "minItems" | "maxItems"> &
  Readonly<{
    maxItems: number;
  }>;

export function BoundedReadonlyArray<const Item extends TSchema>(
  item: Item,
  options: BoundedArrayOptions
) {
  if (!Number.isSafeInteger(options.maxItems) || options.maxItems < 0) {
    throw new RangeError("Bounded array schemas require maxItems >= 0");
  }
  if (
    options.minItems !== undefined &&
    (!Number.isSafeInteger(options.minItems) ||
      options.minItems < 0 ||
      options.minItems > options.maxItems)
  ) {
    throw new RangeError("Bounded array schemas require 0 <= minItems <= maxItems");
  }
  const { maxItems, ...schemaOptions } = options;
  return ReadonlyObject(Type.Array(item), {
    ...schemaOptions,
    maxItems,
  });
}

export function EmptyReadonlyArray<const Item extends TSchema>(item: Item) {
  return Type.Unsafe<readonly []>(BoundedReadonlyArray(item, { maxItems: 0 }));
}

export const CanonicalAbsolutePathSchema = Type.String({
  minLength: 1,
  maxLength: MAX_CANONICAL_ABSOLUTE_PATH_BYTES,
});

export function NonEmptyReadonlyArray<const Item extends TSchema>(
  item: Item,
  options: NonEmptyArrayOptions
) {
  if (!Number.isSafeInteger(options.maxItems) || options.maxItems < 1) {
    throw new RangeError("Non-empty array schemas require maxItems >= 1");
  }
  const schema = BoundedReadonlyArray(item, {
    ...options,
    minItems: 1,
  });
  return Type.Unsafe<readonly [Static<Item>, ...Static<Item>[]]>(schema);
}

export function isCanonicalAbsolutePath(
  value: string,
  maxBytes = MAX_CANONICAL_ABSOLUTE_PATH_BYTES
): boolean {
  return (
    value !== "/" &&
    value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("//") &&
    !value.includes("\\") &&
    value.normalize("NFC") === value &&
    !controlCharacterPattern.test(value) &&
    !hasDotSegments(value) &&
    encoder.encode(value).byteLength <= maxBytes
  );
}

function hasDotSegments(value: string): boolean {
  return value.split("/").some((segment) => segment === "." || segment === "..");
}
