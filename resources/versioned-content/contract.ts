import type { Effect } from "effect";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import Schema from "typebox/schema";

/** Maximum repository-locator length admitted by the resource contract. */
export const MAX_VERSIONED_CONTENT_REPOSITORY_IDENTITY_LENGTH = 16_384;

/** Maximum full-ref length admitted by the resource contract. */
export const MAX_VERSIONED_CONTENT_REF_NAME_LENGTH = 1_024;

/** Maximum repository-relative path length admitted by the resource contract. */
export const MAX_VERSIONED_CONTENT_PATH_LENGTH = 4_096;

/** Maximum number of regular files admitted in one bounded tree operation. */
export const MAX_VERSIONED_CONTENT_ENTRIES = 16_384;

/** Maximum byte budget admitted in one bounded materialization operation. */
export const MAX_VERSIONED_CONTENT_BYTES = 64 * 1_024 * 1_024;

/** Maximum diagnostic detail exposed by a versioned-content failure. */
export const MAX_VERSIONED_CONTENT_FAILURE_DETAIL = 4_096;

const REF_PATTERN = /^refs\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u;

const RepositoryIdentitySchema = Type.String({
  minLength: 1,
  maxLength: MAX_VERSIONED_CONTENT_REPOSITORY_IDENTITY_LENGTH,
  description: "Provider-neutral locator for one versioned-content repository",
});
const RefNameSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: MAX_VERSIONED_CONTENT_REF_NAME_LENGTH,
    description: "Caller-selected canonical full ref name",
  }),
  isCanonicalRefName,
  () => "Expected a canonical full ref name"
);
const SourcePathSchema = Refine(
  Type.String({
    maxLength: MAX_VERSIONED_CONTENT_PATH_LENGTH,
    description: "Canonical repository-relative source tree path, or empty for the root tree",
  }),
  (value) => isCanonicalRelativePath(value, true),
  () => "Expected a canonical repository-relative path or the empty root path"
);
const EntryPathSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: MAX_VERSIONED_CONTENT_PATH_LENGTH,
    description: "Canonical repository-relative regular-file path",
  }),
  (value) => isCanonicalRelativePath(value, false),
  () => "Expected a non-empty canonical repository-relative path"
);
const GitObjectIdSchema = Type.String({
  minLength: 40,
  maxLength: 64,
  pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$",
  description: "Lowercase SHA-1 or SHA-256 Git object identifier",
});
const MaxEntriesSchema = Type.Integer({
  minimum: 1,
  maximum: MAX_VERSIONED_CONTENT_ENTRIES,
  description: "Maximum regular-file entries the operation may observe",
});
const MaxBytesSchema = Type.Integer({
  minimum: 1,
  maximum: MAX_VERSIONED_CONTENT_BYTES,
  description: "Maximum aggregate blob bytes the operation may materialize",
});
const BoundedBytesSchema = Refine(
  Type.Unsafe<Uint8Array>(
    Type.Unknown({
      description: "Materialized bytes for one regular Git blob",
    })
  ),
  (value) => value instanceof Uint8Array && value.byteLength <= MAX_VERSIONED_CONTENT_BYTES,
  () => "Expected a Uint8Array within the versioned-content byte bound"
);

/** Git object formats supported by the versioned-content contract. */
export const VersionedContentObjectFormatSchema = Type.Union(
  [Type.Literal("sha1"), Type.Literal("sha256")],
  {
    description: "Git object hash format reported by the selected versioned-content repository",
  }
);

/** Regular-file modes supported by materialized versioned content. */
export const VersionedContentFileModeSchema = Type.Union(
  [Type.Literal("100644"), Type.Literal("100755")],
  {
    description: "Portable Git mode for one regular versioned-content file",
  }
);

/** Structural schema for one exact regular-file tree entry. */
export const VersionedContentTreeEntrySchema = ReadonlyObject(
  Type.Object({
    path: EntryPathSchema,
    mode: VersionedContentFileModeSchema,
    blob: GitObjectIdSchema,
  }),
  { additionalProperties: false }
);

/** Structural schema for one exact regular-file entry and its blob bytes. */
export const MaterializedVersionedContentTreeEntrySchema = ReadonlyObject(
  Type.Object({
    path: EntryPathSchema,
    mode: VersionedContentFileModeSchema,
    blob: GitObjectIdSchema,
    bytes: BoundedBytesSchema,
  }),
  { additionalProperties: false }
);

/** Structural schema for a bounded remote-tree observation request. */
export const ObserveRemoteInputSchema = ReadonlyObject(
  Type.Object({
    repositoryIdentity: RepositoryIdentitySchema,
    refName: RefNameSchema,
    sourcePath: SourcePathSchema,
    maxEntries: MaxEntriesSchema,
  }),
  { additionalProperties: false }
);

/** Structural schema for a bounded remote-tree materialization request. */
export const MaterializeRemoteInputSchema = ReadonlyObject(
  Type.Object({
    repositoryIdentity: RepositoryIdentitySchema,
    refName: RefNameSchema,
    sourcePath: SourcePathSchema,
    maxEntries: MaxEntriesSchema,
    maxBytes: MaxBytesSchema,
  }),
  { additionalProperties: false }
);

/** Structural schema for one exact commit-ancestry request. */
export const AncestryInputSchema = ReadonlyObject(
  Type.Object({
    repositoryIdentity: RepositoryIdentitySchema,
    refName: RefNameSchema,
    ancestorCommit: GitObjectIdSchema,
    descendantCommit: GitObjectIdSchema,
  }),
  { additionalProperties: false }
);

const remoteObservationProperties = {
  repositoryIdentity: RepositoryIdentitySchema,
  refName: RefNameSchema,
  sourcePath: SourcePathSchema,
  commit: GitObjectIdSchema,
  tree: GitObjectIdSchema,
  objectFormat: VersionedContentObjectFormatSchema,
} as const;

/** Structural schema for exact remote Git facts and regular-file entries. */
export const RemoteContentTreeSchema = ReadonlyObject(
  Type.Object({
    ...remoteObservationProperties,
    entries: ReadonlyObject(Type.Array(VersionedContentTreeEntrySchema), {
      maxItems: MAX_VERSIONED_CONTENT_ENTRIES,
      description: "Regular-file entries in canonical path order",
    }),
  }),
  { additionalProperties: false }
);

/** Structural schema for exact remote Git facts with bounded blob bytes. */
export const MaterializedRemoteContentTreeSchema = ReadonlyObject(
  Type.Object({
    ...remoteObservationProperties,
    entries: ReadonlyObject(Type.Array(MaterializedVersionedContentTreeEntrySchema), {
      maxItems: MAX_VERSIONED_CONTENT_ENTRIES,
      description: "Materialized regular-file entries in canonical path order",
    }),
  }),
  { additionalProperties: false }
);

/** Operations that can fail at the versioned-content resource boundary. */
export const VersionedContentOperationSchema = Type.Union(
  [
    Type.Literal("observe-remote"),
    Type.Literal("materialize-remote"),
    Type.Literal("ancestry"),
    Type.Literal("cleanup"),
  ],
  {
    description: "Versioned-content operation associated with a resource failure",
  }
);

/** Provider-neutral mechanical failure reasons. */
export const VersionedContentFailureReasonSchema = Type.Union(
  [
    Type.Literal("InvalidInput"),
    Type.Literal("Missing"),
    Type.Literal("Aliased"),
    Type.Literal("UnsupportedEntry"),
    Type.Literal("LimitExceeded"),
    Type.Literal("CommandFailed"),
    Type.Literal("FilesystemFailed"),
    Type.Literal("CleanupFailed"),
  ],
  {
    description: "Provider-neutral reason for a mechanical versioned-content failure",
  }
);

/** Structural schema for one bounded typed resource failure. */
export const VersionedContentFailureSchema = ReadonlyObject(
  Type.Object({
    _tag: Type.Literal("VersionedContentFailure"),
    operation: VersionedContentOperationSchema,
    reason: VersionedContentFailureReasonSchema,
    path: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: MAX_VERSIONED_CONTENT_REPOSITORY_IDENTITY_LENGTH,
        description: "Path or locator associated with the failed mechanical operation",
      })
    ),
    detail: Type.String({
      minLength: 1,
      maxLength: MAX_VERSIONED_CONTENT_FAILURE_DETAIL,
      description: "Bounded operational failure detail",
    }),
  }),
  { additionalProperties: false }
);

/** Supported Git object format. */
export type VersionedContentObjectFormat = Static<typeof VersionedContentObjectFormatSchema>;

/** Supported regular-file Git mode. */
export type VersionedContentFileMode = Static<typeof VersionedContentFileModeSchema>;

/** One exact regular-file entry in a remote Git tree. */
export type VersionedContentTreeEntry = Static<typeof VersionedContentTreeEntrySchema>;

/** One exact remote tree entry with its bounded blob bytes. */
export type MaterializedVersionedContentTreeEntry = Static<
  typeof MaterializedVersionedContentTreeEntrySchema
>;

/** Input for an exact bounded remote-tree observation. */
export type ObserveRemoteInput = Static<typeof ObserveRemoteInputSchema>;

/** Input for an exact bounded remote-tree materialization. */
export type MaterializeRemoteInput = Static<typeof MaterializeRemoteInputSchema>;

/** Input for an exact remote commit-ancestry query. */
export type AncestryInput = Static<typeof AncestryInputSchema>;

/** Raw Git facts for one caller-selected remote ref and source tree. */
export type RemoteContentTree = Static<typeof RemoteContentTreeSchema>;

/** A remote content tree whose regular blobs were read within the requested bound. */
export type MaterializedRemoteContentTree = Static<typeof MaterializedRemoteContentTreeSchema>;

/** One operation exposed by the versioned-content failure contract. */
export type VersionedContentOperation = Static<typeof VersionedContentOperationSchema>;

/** One provider-neutral mechanical failure reason. */
export type VersionedContentFailureReason = Static<typeof VersionedContentFailureReasonSchema>;

/** Typed mechanical failure owned by the versioned-content resource. */
export type VersionedContentFailure = Static<typeof VersionedContentFailureSchema>;

const versionedContentFailureValidator = Schema.Compile(VersionedContentFailureSchema);

/** Checks an unknown value against the complete versioned-content failure schema. */
export function isVersionedContentFailure(input: unknown): input is VersionedContentFailure {
  return versionedContentFailureValidator.Check(input);
}

function isCanonicalRefName(value: string): boolean {
  return REF_PATTERN.test(value) && !value.includes("..") && !value.endsWith(".");
}

function isCanonicalRelativePath(value: string, allowEmpty: boolean): boolean {
  return (
    (allowEmpty && value === "") ||
    (value.length > 0 &&
      !value.startsWith("/") &&
      !value.endsWith("/") &&
      !value.includes("\\") &&
      !/[\u0000-\u001f\u007f]/u.test(value) &&
      value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."))
  );
}

/** Provider-neutral operations over exact, caller-selected versioned content. */
export interface VersionedContentResource<R = never> {
  readonly observeRemote: (
    input: ObserveRemoteInput
  ) => Effect.Effect<RemoteContentTree, VersionedContentFailure, R>;

  /**
   * Materializes the selected tree with the exact bytes named by each reported
   * blob identifier.
   */
  readonly materializeRemote: (
    input: MaterializeRemoteInput
  ) => Effect.Effect<MaterializedRemoteContentTree, VersionedContentFailure, R>;

  readonly isAncestor: (input: AncestryInput) => Effect.Effect<boolean, VersionedContentFailure, R>;
}
