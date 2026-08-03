import { ReadonlyObject, type TArrayOptions, type TSchema, Type } from "typebox";

type BoundedArrayOptions = Omit<TArrayOptions, "minItems" | "maxItems"> &
  Readonly<{
    minItems?: number;
    maxItems: number;
  }>;

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
  return BoundedReadonlyArray(item, { maxItems: 0 });
}

export function NonEmptyReadonlyArray<const Item extends TSchema>(
  item: Item,
  options: NonEmptyArrayOptions
) {
  if (!Number.isSafeInteger(options.maxItems) || options.maxItems < 1) {
    throw new RangeError("Non-empty array schemas require maxItems >= 1");
  }
  return BoundedReadonlyArray(item, {
    ...options,
    minItems: 1,
  });
}
