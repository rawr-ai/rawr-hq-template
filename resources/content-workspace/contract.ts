import type { Effect } from "effect";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";

/** Maximum regular-file entries admitted by one disposable tree materialization. */
export const MAX_DISPOSABLE_CONTENT_TREE_ENTRIES = 262_144;

/** Maximum aggregate bytes admitted by one disposable tree materialization. */
export const MAX_DISPOSABLE_CONTENT_TREE_BYTES = 128 * 1_024 * 1_024;

/** Maximum parent-root length admitted by disposable tree materialization. */
export const MAX_DISPOSABLE_CONTENT_TREE_PARENT_LENGTH = 16_384;

/** Maximum stable root length after the provider appends its caller-owned child name. */
export const MAX_DISPOSABLE_CONTENT_TREE_ROOT_LENGTH =
  MAX_DISPOSABLE_CONTENT_TREE_PARENT_LENGTH + 256;

export type GitObjectFormat = "sha1" | "sha256";

const ContentRelativePathSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: 4_096,
    description: "Canonical provider-neutral repository-relative path",
  }),
  (value) =>
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(value) &&
    value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."),
  () => "Expected a canonical repository-relative path"
);

const GitObjectIdSchema = Type.String({
  minLength: 40,
  maxLength: 64,
  pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$",
  description: "Lowercase SHA-1 or SHA-256 Git object identifier",
});

/** Portable Git modes admitted for regular content-workspace files. */
export const ContentFileModeSchema = Type.Union([Type.Literal("100644"), Type.Literal("100755")], {
  description: "Portable Git mode for one regular content-workspace file",
});

/** Structural schema for one provider-neutral regular Git tree fact. */
export const ContentTreeEntrySchema = ReadonlyObject(
  Type.Object({
    path: ContentRelativePathSchema,
    mode: ContentFileModeSchema,
    blob: GitObjectIdSchema,
  }),
  { additionalProperties: false }
);

/** Provider-neutral regular-file mode derived from the content-workspace schema authority. */
export type ContentFileMode = Static<typeof ContentFileModeSchema>;

/** Provider-neutral regular Git tree fact derived from the resource-owned schema authority. */
export type ContentTreeEntry = Static<typeof ContentTreeEntrySchema>;

const DisposableContentTreeBytesSchema = Refine(
  Type.Unsafe<Uint8Array>(
    Type.Unknown({
      description: "Exact bytes for one disposable regular file",
    })
  ),
  (value) => value instanceof Uint8Array && value.byteLength <= MAX_DISPOSABLE_CONTENT_TREE_BYTES,
  () => "Expected a Uint8Array within the disposable tree byte bound"
);

const DisposableContentTreeMaxEntriesSchema = Type.Integer({
  minimum: 1,
  maximum: MAX_DISPOSABLE_CONTENT_TREE_ENTRIES,
  description: "Maximum regular files the caller permits in the disposable tree",
});

const DisposableContentTreeMaxBytesSchema = Type.Integer({
  minimum: 1,
  maximum: MAX_DISPOSABLE_CONTENT_TREE_BYTES,
  description: "Maximum aggregate bytes the caller permits in the disposable tree",
});

const DisposableContentTreeDirectoryNameSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: 255,
    description: "Canonical direct-child name reserved by the caller for one disposable tree",
  }),
  (value) =>
    value !== "." &&
    value !== ".." &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/u.test(value),
  () => "Expected one canonical filesystem child name"
);

/** Structural schema for one exact disposable regular-file entry. */
export const DisposableContentTreeEntrySchema = ReadonlyObject(
  Type.Object({
    path: ContentRelativePathSchema,
    mode: ContentFileModeSchema,
    bytes: DisposableContentTreeBytesSchema,
  }),
  { additionalProperties: false }
);

/** Structural schema for one bounded caller-owned disposable tree request. */
export const MaterializeContentTreeInputSchema = ReadonlyObject(
  Type.Object({
    parentRoot: Type.String({
      minLength: 1,
      maxLength: MAX_DISPOSABLE_CONTENT_TREE_PARENT_LENGTH,
      description: "Normalized non-root absolute directory that owns the disposable tree lifetime",
    }),
    directoryName: DisposableContentTreeDirectoryNameSchema,
    entries: ReadonlyObject(Type.Array(DisposableContentTreeEntrySchema), {
      maxItems: MAX_DISPOSABLE_CONTENT_TREE_ENTRIES,
      description: "Exact regular-file entries in canonical path order",
    }),
    maxEntries: DisposableContentTreeMaxEntriesSchema,
    maxBytes: DisposableContentTreeMaxBytesSchema,
  }),
  { additionalProperties: false }
);

/** Structural schema for the caller-owned disposable tree root. */
export const MaterializedContentTreeSchema = ReadonlyObject(
  Type.Object({
    root: Type.String({
      minLength: 1,
      maxLength: MAX_DISPOSABLE_CONTENT_TREE_ROOT_LENGTH,
      description: "Stable direct child retained until the caller removes its disposable parent",
    }),
  }),
  { additionalProperties: false }
);

/** Exact regular-file entry derived from the disposable-tree schema authority. */
export type DisposableContentTreeEntry = Static<typeof DisposableContentTreeEntrySchema>;

/** Bounded disposable-tree request derived from the resource schema authority. */
export type MaterializeContentTreeInput = Static<typeof MaterializeContentTreeInputSchema>;

/** Caller-owned disposable-tree result derived from the resource schema authority. */
export type MaterializedContentTree = Static<typeof MaterializedContentTreeSchema>;

/** Six-octal-digit mode reported by Git for one staged index entry. */
export const GitStagedIndexModeSchema = Type.String({
  pattern: "^[0-7]{6}$",
  description: "Six-octal-digit Git index mode",
});

/** Conflict stage reported by Git for one staged index entry. */
export const GitStagedIndexStageSchema = Type.Union(
  [Type.Literal(0), Type.Literal(1), Type.Literal(2), Type.Literal(3)],
  { description: "Git index stage where zero is resolved and one through three are conflicts" }
);

/** Structural schema for one provider-neutral staged Git index fact. */
export const GitStagedIndexEntrySchema = ReadonlyObject(
  Type.Object({
    path: ContentRelativePathSchema,
    mode: GitStagedIndexModeSchema,
    objectId: GitObjectIdSchema,
    stage: GitStagedIndexStageSchema,
  }),
  { additionalProperties: false }
);

/** Provider-neutral Git index mode derived from the resource schema authority. */
export type GitStagedIndexMode = Static<typeof GitStagedIndexModeSchema>;

/** Provider-neutral Git index stage derived from the resource schema authority. */
export type GitStagedIndexStage = Static<typeof GitStagedIndexStageSchema>;

/** Provider-neutral staged Git index fact derived from the resource schema authority. */
export type GitStagedIndexEntry = Static<typeof GitStagedIndexEntrySchema>;

/** Native Git classification retained for one tracked path without exposing its tag encoding. */
export const GitTrackedPathStatusSchema = Type.Union(
  [Type.Literal("Cached"), Type.Literal("SkipWorktree"), Type.Literal("Unmerged")],
  { description: "Provider-neutral status reported by Git for one tracked path" }
);

/** Structural schema for one provider-neutral tracked-path flag fact. */
export const GitTrackedPathFlagSchema = ReadonlyObject(
  Type.Object({
    path: ContentRelativePathSchema,
    status: GitTrackedPathStatusSchema,
    assumeUnchanged: Type.Boolean({
      description: "Whether Git marks this tracked path assume-unchanged",
    }),
  }),
  { additionalProperties: false }
);

/** Provider-neutral tracked-path status derived from the resource schema authority. */
export type GitTrackedPathStatus = Static<typeof GitTrackedPathStatusSchema>;

/** Provider-neutral tracked-path flag fact derived from the resource schema authority. */
export type GitTrackedPathFlag = Static<typeof GitTrackedPathFlagSchema>;

export type GitRemoteSelection =
  | Readonly<{ kind: "All" }>
  | Readonly<{ kind: "Named"; remoteName: string }>;

export interface ContentWorkspaceIdentity {
  readonly root: string;
  readonly refName: string;
  readonly commit: string;
  readonly tree: string;
  readonly objectFormat: GitObjectFormat;
  readonly remoteUrls: readonly string[];
}

/** Exact read-only Git observation. No field grants mutation authority. */
export interface GitWorkspaceAnchor extends ContentWorkspaceIdentity {
  readonly rootDevice: string;
  readonly rootInode: string;
  readonly refCommit: string;
}

/** Exact full-ref observation, independent of the checked-out branch and worktree bytes. */
export interface GitRefObservation extends ContentWorkspaceIdentity {}

export interface GitWorktreeObjectId {
  readonly path: string;
  readonly objectId: string;
}

/** Bytes for one exact blob returned by a bounded Git batch read. */
export interface GitBlobObservation {
  readonly blob: string;
  readonly bytes: Uint8Array;
}

/**
 * Raw mechanics for one bounded workspace observation. Semantic owners decide
 * whether the evidence is eligible and construct any derived binding digest.
 */
export interface GitWorkspaceEvidence {
  readonly openingAnchor: GitWorkspaceAnchor;
  readonly openingStatus: Uint8Array;
  /**
   * Tracked-path facts in deterministic path, status, and flag order.
   *
   * Cached and skip-worktree paths occur once; an unmerged path may repeat up
   * to three times to preserve its native index-stage cardinality.
   */
  readonly openingTrackedFlags: readonly GitTrackedPathFlag[];
  readonly worktreeObjectIds: readonly GitWorktreeObjectId[];
  readonly indexEntries: Uint8Array;
  readonly closingAnchor: GitWorkspaceAnchor;
  readonly closingStatus: Uint8Array;
  /** Closing observation with the same ordering and cardinality contract as the opening facts. */
  readonly closingTrackedFlags: readonly GitTrackedPathFlag[];
}

/**
 * One exact typed Git index binding.
 *
 * Entries are unique by path and stage, ordered by path and then numeric
 * stage, and retain provider-neutral facts for semantic owners to classify.
 */
export interface GitStagedIndexBinding {
  readonly anchor: GitWorkspaceAnchor;
  readonly entries: readonly GitStagedIndexEntry[];
}

/** Bytes for one regular blob named by the opening Git index binding. */
export interface GitStagedBlobObservation {
  readonly objectId: string;
  readonly bytes: Uint8Array;
}

/**
 * Read-only staged-index mechanics. Opening and closing bindings surround all
 * blob reads so the semantic owner can reject a mixed observation.
 */
export interface GitStagedIndexObservation {
  readonly opening: GitStagedIndexBinding;
  readonly blobs: readonly GitStagedBlobObservation[];
  readonly closing: GitStagedIndexBinding;
}

export interface GitBlobAtPathObservation {
  readonly refCommit: string;
  readonly commit: string;
  readonly tree: string;
  readonly blob: string;
  readonly bytes: Uint8Array;
}

export interface MaterializedContentTreeEntry extends ContentTreeEntry {
  readonly bytes: Uint8Array;
}

export interface ContentWorkspaceCapture {
  /** Provider-owned opaque capability; callers cannot construct restore authority. */
  readonly handle: string;
  /** Opaque correlation value supplied by the semantic owner. */
  readonly readToken: string;
  readonly paths: readonly string[];
}

export interface ReplaceContentFile {
  readonly kind: "ReplaceFile";
  readonly path: string;
  readonly mode: ContentFileMode;
  readonly bytes: Uint8Array;
}

export interface ReplaceContentTree {
  readonly kind: "ReplaceTree";
  readonly path: string;
  readonly entries: readonly MaterializedContentTreeEntry[];
}

export type ContentWorkspaceWrite = ReplaceContentFile | ReplaceContentTree;

export interface ContentWorkspaceWriteReceipt {
  /** Opaque correlation values supplied by the semantic owner. */
  readonly planDigest: string;
  readonly readToken: string;
  readonly outcome: "Applied" | "Converged" | "Restored";
  readonly changedPaths: readonly string[];
}

export interface ContentWorkspaceSettleReceipt {
  readonly planDigest: string;
  readonly readToken: string;
  readonly outcome: "Settled";
  readonly handle: string;
}

export interface ContentWorkspaceReleaseReceipt {
  readonly readToken: string;
  readonly outcome: "ReleasedUnmutated" | "ReleasedUnsettled";
  readonly handle: string;
}

export type ContentWorkspaceFailureReason =
  | "InvalidInput"
  | "Missing"
  | "Aliased"
  | "UnsupportedEntry"
  | "LimitExceeded"
  | "IdentityChanged"
  | "GitFailed"
  | "FilesystemFailed"
  | "CleanupFailed"
  | "InvalidHandle"
  | "HandleConsumed"
  | "HandleState"
  | "WrongRoot"
  | "WrongToken"
  | "WrongPlan";

export interface ContentWorkspaceFailure {
  readonly _tag: "ContentWorkspaceFailure";
  readonly operation:
    | "inspect"
    | "inspect-git-ref"
    | "inspect-git-workspace"
    | "read-git-tree"
    | "read-git-blob"
    | "capture-git-evidence"
    | "observe-git-staged-index"
    | "read-git-blob-at-path"
    | "local-git-ancestry"
    | "list-git-changed-paths"
    | "read-file"
    | "read-tree"
    | "materialize-content-tree"
    | "capture"
    | "apply"
    | "restore"
    | "settle"
    | "release"
    | "cleanup";
  readonly reason: ContentWorkspaceFailureReason;
  readonly path?: string;
  readonly detail: string;
}

export interface ContentWorkspaceResource<R = never> {
  readonly inspectWorkspace: (
    input: Readonly<{
      locator: string;
    }>
  ) => Effect.Effect<ContentWorkspaceIdentity, ContentWorkspaceFailure, R>;

  readonly inspectGitWorkspace: (
    input: Readonly<{
      locator: string;
      remoteSelection: GitRemoteSelection;
      refName: string;
    }>
  ) => Effect.Effect<GitWorkspaceAnchor, ContentWorkspaceFailure, R>;

  readonly inspectGitRef: (
    input: Readonly<{
      locator: string;
      remoteSelection: GitRemoteSelection;
      refName: string;
    }>
  ) => Effect.Effect<GitRefObservation, ContentWorkspaceFailure, R>;

  readonly readGitTree: (
    input: Readonly<{
      root: string;
      tree: string;
      objectFormat: GitObjectFormat;
      paths: readonly string[];
      /** Maximum regular entries allocated and returned by the provider. */
      maxEntries: number;
      /** Maximum native stdout bytes accepted from the Git tree observation. */
      maxBytes: number;
    }>
  ) => Effect.Effect<readonly ContentTreeEntry[], ContentWorkspaceFailure, R>;

  readonly readGitBlob: (
    input: Readonly<{
      root: string;
      blob: string;
      objectFormat: GitObjectFormat;
      maxBytes: number;
    }>
  ) => Effect.Effect<Uint8Array, ContentWorkspaceFailure, R>;

  readonly readGitBlobs: (
    input: Readonly<{
      root: string;
      blobs: readonly string[];
      objectFormat: GitObjectFormat;
      maxBlobs: number;
      maxBlobBytes: number;
      maxTotalBytes: number;
    }>
  ) => Effect.Effect<readonly GitBlobObservation[], ContentWorkspaceFailure, R>;

  readonly captureGitWorkspaceEvidence: (
    input: Readonly<{
      root: string;
      remoteSelection: GitRemoteSelection;
      refName: string;
      admittedPaths: readonly string[];
      consumedRoots: readonly string[];
      objectFormat: GitObjectFormat;
      maxPaths: number;
      /** Per-file bound for each admitted worktree path. */
      maxWorktreeFileBytes: number;
      /** Aggregate bound for all admitted worktree file bytes. */
      maxWorktreeBytes: number;
      /** Independent bound for each Git status, tracked-flag, or index output. */
      maxBytes: number;
    }>
  ) => Effect.Effect<GitWorkspaceEvidence, ContentWorkspaceFailure, R>;

  readonly observeGitStagedIndex: (
    input: Readonly<{
      locator: string;
      remoteSelection: GitRemoteSelection;
      refName: string;
      materializedPaths: readonly string[];
      materializedRoots: readonly string[];
      /** Maximum staged facts allocated and returned by each index observation. */
      maxEntries: number;
      /** Maximum native stdout bytes accepted from each staged index read. */
      maxIndexBytes: number;
      /** Maximum aggregate bytes accepted for the selected regular blobs. */
      maxBlobBytes: number;
    }>
  ) => Effect.Effect<GitStagedIndexObservation, ContentWorkspaceFailure, R>;

  readonly readGitBlobAtPath: (
    input: Readonly<{
      root: string;
      refName: string;
      commit: string;
      tree: string;
      path: string;
      maxBytes: number;
    }>
  ) => Effect.Effect<GitBlobAtPathObservation, ContentWorkspaceFailure, R>;

  readonly isLocalGitAncestor: (
    input: Readonly<{
      root: string;
      ancestorCommit: string;
      descendantCommit: string;
    }>
  ) => Effect.Effect<boolean, ContentWorkspaceFailure, R>;

  readonly listGitChangedPaths: (
    input: Readonly<{
      root: string;
      fromCommit: string;
      toCommit: string;
      maxBytes: number;
    }>
  ) => Effect.Effect<Uint8Array, ContentWorkspaceFailure, R>;

  readonly readFile: (
    input: Readonly<{
      root: string;
      path: string;
      maxBytes: number;
    }>
  ) => Effect.Effect<Uint8Array, ContentWorkspaceFailure, R>;

  readonly readTree: (
    input: Readonly<{
      root: string;
      path: string;
      objectFormat: GitObjectFormat;
      maxEntries: number;
      maxBytes: number;
    }>
  ) => Effect.Effect<readonly ContentTreeEntry[], ContentWorkspaceFailure, R>;

  /**
   * Converges exact regular-file bytes at one named direct child of a
   * caller-owned disposable parent. The caller owns the parent lifetime and
   * serializes live calls that select the same parent and child name.
   */
  readonly materializeContentTree: (
    input: MaterializeContentTreeInput
  ) => Effect.Effect<MaterializedContentTree, ContentWorkspaceFailure, R>;

  readonly capture: (
    input: Readonly<{
      root: string;
      readToken: string;
      paths: readonly string[];
      maxEntries: number;
      maxBytes: number;
    }>
  ) => Effect.Effect<ContentWorkspaceCapture, ContentWorkspaceFailure, R>;

  readonly apply: (
    input: Readonly<{
      root: string;
      planDigest: string;
      readToken: string;
      captureHandle: string;
      writes: readonly ContentWorkspaceWrite[];
    }>
  ) => Effect.Effect<ContentWorkspaceWriteReceipt, ContentWorkspaceFailure, R>;

  readonly restore: (
    input: Readonly<{
      root: string;
      planDigest: string;
      readToken: string;
      captureHandle: string;
    }>
  ) => Effect.Effect<ContentWorkspaceWriteReceipt, ContentWorkspaceFailure, R>;

  readonly settle: (
    input: Readonly<{
      root: string;
      planDigest: string;
      readToken: string;
      captureHandle: string;
    }>
  ) => Effect.Effect<ContentWorkspaceSettleReceipt, ContentWorkspaceFailure, R>;

  readonly release: (
    input: Readonly<{
      root: string;
      readToken: string;
      captureHandle: string;
      disposition: "NoMutation" | "UnsettledRecovery";
    }>
  ) => Effect.Effect<ContentWorkspaceReleaseReceipt, ContentWorkspaceFailure, R>;
}
