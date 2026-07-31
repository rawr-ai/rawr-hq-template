import type { Effect } from "effect";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import { Validator } from "typebox/schema";

/** Maximum root-path length admitted by one source-inventory observation. */
export const MAX_SOURCE_INVENTORY_ROOT_LENGTH = 16_384;

/** Maximum repository-relative path length admitted by the resource contract. */
export const MAX_SOURCE_INVENTORY_PATH_LENGTH = 4_096;

/** Maximum number of unique visible entry paths admitted by one observation. */
export const MAX_SOURCE_INVENTORY_ENTRIES = 100_000;

/** Maximum diagnostic detail exposed by one source-inventory failure. */
export const MAX_SOURCE_INVENTORY_FAILURE_DETAIL = 4_096;

const SourceInventoryRootSchema = Type.String({
  minLength: 1,
  maxLength: MAX_SOURCE_INVENTORY_ROOT_LENGTH,
  description: "Caller-selected local source root",
});

/** Schema for one canonical, safe, repository-relative visible entry path. */
export const SourceInventoryPathSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: MAX_SOURCE_INVENTORY_PATH_LENGTH,
    description: "Canonical repository-relative visible entry path",
  }),
  isCanonicalRelativePath,
  () => "Expected a canonical safe repository-relative path"
);

const MaxEntriesSchema = Type.Integer({
  minimum: 1,
  maximum: MAX_SOURCE_INVENTORY_ENTRIES,
  description: "Maximum unique visible entry paths the observation may return",
});

/** Structural schema for one bounded source-inventory observation request. */
export const ObserveSourceInventoryInputSchema = ReadonlyObject(
  Type.Object({
    root: SourceInventoryRootSchema,
    maxEntries: MaxEntriesSchema,
  }),
  { additionalProperties: false }
);

const SourceInventoryPathsSchema = ReadonlyObject(Type.Array(SourceInventoryPathSchema), {
  maxItems: MAX_SOURCE_INVENTORY_ENTRIES,
  description: "Unique Git-visible entry paths in canonical order",
});

const SourceInventoryResultStructureSchema = ReadonlyObject(
  Type.Object({
    paths: SourceInventoryPathsSchema,
    trackedNonFilePaths: ReadonlyObject(Type.Array(SourceInventoryPathSchema), {
      maxItems: MAX_SOURCE_INVENTORY_ENTRIES,
      description: "Tracked symlink and Gitlink entry paths in canonical order",
    }),
  }),
  { additionalProperties: false }
);

type SourceInventoryResultStructure = Static<typeof SourceInventoryResultStructureSchema>;

/**
 * Schema for one canonical visible-entry inventory and its tracked non-file
 * subset.
 */
export const SourceInventoryResultSchema = Refine(
  SourceInventoryResultStructureSchema,
  isCanonicalInventory,
  () => "Expected sorted unique paths and a tracked non-file subset"
);

/** Provider-neutral mechanical reasons an inventory observation can fail. */
export const SourceInventoryFailureReasonSchema = Type.Union(
  [
    Type.Literal("InvalidInput"),
    Type.Literal("SetupFailed"),
    Type.Literal("LimitExceeded"),
    Type.Literal("CommandFailed"),
    Type.Literal("InvalidOutput"),
  ],
  {
    description: "Mechanical reason a source inventory could not be observed",
  }
);

/** Structural schema for one bounded typed source-inventory failure. */
export const SourceInventoryFailureSchema = ReadonlyObject(
  Type.Object({
    _tag: Type.Literal("SourceInventoryFailure", {
      description: "Discriminator for one source-inventory failure",
    }),
    reason: SourceInventoryFailureReasonSchema,
    path: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: MAX_SOURCE_INVENTORY_ROOT_LENGTH,
        description: "Local source root associated with the failed operation",
      })
    ),
    detail: Type.String({
      minLength: 1,
      maxLength: MAX_SOURCE_INVENTORY_FAILURE_DETAIL,
      description: "Bounded operational failure detail",
    }),
  }),
  { additionalProperties: false }
);

/** One canonical repository-relative visible entry path. */
export type SourceInventoryPath = Static<typeof SourceInventoryPathSchema>;

/** Input for one bounded visible-entry inventory observation. */
export type ObserveSourceInventoryInput = Static<typeof ObserveSourceInventoryInputSchema>;

/** Canonical visible entry paths and the tracked non-file subset. */
export type SourceInventoryResult = Static<typeof SourceInventoryResultSchema>;

/** One mechanical source-inventory failure reason. */
export type SourceInventoryFailureReason = Static<typeof SourceInventoryFailureReasonSchema>;

/** One bounded typed source-inventory failure. */
export type SourceInventoryFailure = Static<typeof SourceInventoryFailureSchema>;

const sourceInventoryFailureValidator = new Validator({}, SourceInventoryFailureSchema);

/** Checks an unknown value against the complete source-inventory failure contract. */
export function isSourceInventoryFailure(input: unknown): input is SourceInventoryFailure {
  return sourceInventoryFailureValidator.Check(input);
}

/** Provider-neutral capability for observing one local visible-entry inventory. */
export interface SourceInventoryResource<R = never> {
  readonly observe: (
    input: ObserveSourceInventoryInput
  ) => Effect.Effect<SourceInventoryResult, SourceInventoryFailure, R>;
}

function isCanonicalRelativePath(value: string): boolean {
  return (
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("\\") &&
    !/^[A-Za-z]:\//u.test(value) &&
    !/[\u0000-\u001f\u007f]/u.test(value) &&
    value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")
  );
}

function isCanonicalInventory(value: SourceInventoryResultStructure): boolean {
  if (!isStrictlySorted(value.paths) || !isStrictlySorted(value.trackedNonFilePaths)) {
    return false;
  }
  const paths = new Set(value.paths);
  return value.trackedNonFilePaths.every((path) => paths.has(path));
}

function isStrictlySorted(paths: readonly string[]): boolean {
  for (let index = 1; index < paths.length; index += 1) {
    const previous = paths[index - 1];
    const current = paths[index];
    if (previous === undefined || current === undefined || compareText(previous, current) >= 0) {
      return false;
    }
  }
  return true;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
