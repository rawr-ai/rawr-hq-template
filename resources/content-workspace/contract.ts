import type { Effect } from "effect";

export type GitObjectFormat = "sha1" | "sha256";
export type ContentFileMode = "100644" | "100755";

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

export interface GitWorktreeObjectId {
  readonly path: string;
  readonly objectId: string;
}

/**
 * Raw mechanics for one bounded workspace observation. Semantic owners decide
 * whether the evidence is eligible and construct any derived binding digest.
 */
export interface GitWorkspaceEvidence {
  readonly openingAnchor: GitWorkspaceAnchor;
  readonly openingStatus: Uint8Array;
  readonly openingTrackedFlags: Uint8Array;
  readonly worktreeObjectIds: readonly GitWorktreeObjectId[];
  readonly indexEntries: Uint8Array;
  readonly closingAnchor: GitWorkspaceAnchor;
  readonly closingStatus: Uint8Array;
  readonly closingTrackedFlags: Uint8Array;
}

/** One exact raw Git index binding. Semantic owners classify its contents. */
export interface GitStagedIndexBinding {
  readonly anchor: GitWorkspaceAnchor;
  readonly indexEntries: Uint8Array;
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

export interface ContentTreeEntry {
  readonly path: string;
  readonly mode: ContentFileMode;
  readonly blob: string;
}

export interface MaterializedContentTreeEntry extends ContentTreeEntry {
  readonly bytes: Uint8Array;
}

export interface RemoteContentTree {
  readonly repositoryIdentity: string;
  readonly refName: string;
  readonly sourcePath: string;
  readonly commit: string;
  readonly tree: string;
  readonly objectFormat: GitObjectFormat;
  readonly entries: readonly ContentTreeEntry[];
}

export interface MaterializedRemoteContentTree extends Omit<RemoteContentTree, "entries"> {
  readonly entries: readonly MaterializedContentTreeEntry[];
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
    | "observe-remote"
    | "materialize-remote"
    | "ancestry"
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
  readonly inspectWorkspace: (input: Readonly<{
    locator: string;
  }>) => Effect.Effect<ContentWorkspaceIdentity, ContentWorkspaceFailure, R>;

  readonly inspectGitWorkspace: (input: Readonly<{
    locator: string;
    remoteSelection: GitRemoteSelection;
    refName: string;
  }>) => Effect.Effect<GitWorkspaceAnchor, ContentWorkspaceFailure, R>;

  readonly readGitTree: (input: Readonly<{
    root: string;
    tree: string;
    objectFormat: GitObjectFormat;
    maxBytes: number;
  }>) => Effect.Effect<Uint8Array, ContentWorkspaceFailure, R>;

  readonly readGitBlob: (input: Readonly<{
    root: string;
    blob: string;
    objectFormat: GitObjectFormat;
    maxBytes: number;
  }>) => Effect.Effect<Uint8Array, ContentWorkspaceFailure, R>;

  readonly captureGitWorkspaceEvidence: (input: Readonly<{
    root: string;
    remoteSelection: GitRemoteSelection;
    refName: string;
    admittedPaths: readonly string[];
    consumedRoots: readonly string[];
    objectFormat: GitObjectFormat;
    maxPaths: number;
    maxBytes: number;
  }>) => Effect.Effect<GitWorkspaceEvidence, ContentWorkspaceFailure, R>;

  readonly observeGitStagedIndex: (input: Readonly<{
    locator: string;
    remoteSelection: GitRemoteSelection;
    refName: string;
    materializedPaths: readonly string[];
    materializedRoots: readonly string[];
    maxEntries: number;
    maxIndexBytes: number;
    maxBlobBytes: number;
  }>) => Effect.Effect<GitStagedIndexObservation, ContentWorkspaceFailure, R>;

  readonly readGitBlobAtPath: (input: Readonly<{
    root: string;
    refName: string;
    commit: string;
    tree: string;
    path: string;
    maxBytes: number;
  }>) => Effect.Effect<GitBlobAtPathObservation, ContentWorkspaceFailure, R>;

  readonly isLocalGitAncestor: (input: Readonly<{
    root: string;
    ancestorCommit: string;
    descendantCommit: string;
  }>) => Effect.Effect<boolean, ContentWorkspaceFailure, R>;

  readonly listGitChangedPaths: (input: Readonly<{
    root: string;
    fromCommit: string;
    toCommit: string;
    maxBytes: number;
  }>) => Effect.Effect<Uint8Array, ContentWorkspaceFailure, R>;

  readonly readFile: (input: Readonly<{
    root: string;
    path: string;
    maxBytes: number;
  }>) => Effect.Effect<Uint8Array, ContentWorkspaceFailure, R>;

  readonly readTree: (input: Readonly<{
    root: string;
    path: string;
    objectFormat: GitObjectFormat;
    maxEntries: number;
    maxBytes: number;
  }>) => Effect.Effect<readonly ContentTreeEntry[], ContentWorkspaceFailure, R>;

  readonly observeRemote: (input: Readonly<{
    repositoryIdentity: string;
    refName: string;
    sourcePath: string;
    maxEntries: number;
  }>) => Effect.Effect<RemoteContentTree, ContentWorkspaceFailure, R>;

  readonly materializeRemote: (input: Readonly<{
    repositoryIdentity: string;
    refName: string;
    sourcePath: string;
    maxEntries: number;
    maxBytes: number;
  }>) => Effect.Effect<MaterializedRemoteContentTree, ContentWorkspaceFailure, R>;

  readonly isAncestor: (input: Readonly<{
    repositoryIdentity: string;
    refName: string;
    ancestorCommit: string;
    descendantCommit: string;
  }>) => Effect.Effect<boolean, ContentWorkspaceFailure, R>;

  readonly capture: (input: Readonly<{
    root: string;
    readToken: string;
    paths: readonly string[];
    maxEntries: number;
    maxBytes: number;
  }>) => Effect.Effect<ContentWorkspaceCapture, ContentWorkspaceFailure, R>;

  readonly apply: (input: Readonly<{
    root: string;
    planDigest: string;
    readToken: string;
    captureHandle: string;
    writes: readonly ContentWorkspaceWrite[];
  }>) => Effect.Effect<ContentWorkspaceWriteReceipt, ContentWorkspaceFailure, R>;

  readonly restore: (input: Readonly<{
    root: string;
    planDigest: string;
    readToken: string;
    captureHandle: string;
  }>) => Effect.Effect<ContentWorkspaceWriteReceipt, ContentWorkspaceFailure, R>;

  readonly settle: (input: Readonly<{
    root: string;
    planDigest: string;
    readToken: string;
    captureHandle: string;
  }>) => Effect.Effect<ContentWorkspaceSettleReceipt, ContentWorkspaceFailure, R>;

  readonly release: (input: Readonly<{
    root: string;
    readToken: string;
    captureHandle: string;
    disposition: "NoMutation" | "UnsettledRecovery";
  }>) => Effect.Effect<ContentWorkspaceReleaseReceipt, ContentWorkspaceFailure, R>;
}

/** Promise projection for non-Effect callers; providers bind runtime requirements at the edge. */
export interface ContentWorkspaceAsyncPort {
  readonly inspectWorkspace: (input: Parameters<ContentWorkspaceResource["inspectWorkspace"]>[0]) => Promise<ContentWorkspaceIdentity>;
  readonly readFile: (input: Parameters<ContentWorkspaceResource["readFile"]>[0]) => Promise<Uint8Array>;
  readonly readTree: (input: Parameters<ContentWorkspaceResource["readTree"]>[0]) => Promise<readonly ContentTreeEntry[]>;
  readonly observeRemote: (input: Parameters<ContentWorkspaceResource["observeRemote"]>[0]) => Promise<RemoteContentTree>;
  readonly materializeRemote: (input: Parameters<ContentWorkspaceResource["materializeRemote"]>[0]) => Promise<MaterializedRemoteContentTree>;
  readonly isAncestor: (input: Parameters<ContentWorkspaceResource["isAncestor"]>[0]) => Promise<boolean>;
  readonly capture: (input: Parameters<ContentWorkspaceResource["capture"]>[0]) => Promise<ContentWorkspaceCapture>;
  readonly apply: (input: Parameters<ContentWorkspaceResource["apply"]>[0]) => Promise<ContentWorkspaceWriteReceipt>;
  readonly restore: (input: Parameters<ContentWorkspaceResource["restore"]>[0]) => Promise<ContentWorkspaceWriteReceipt>;
  readonly settle: (input: Parameters<ContentWorkspaceResource["settle"]>[0]) => Promise<ContentWorkspaceSettleReceipt>;
  readonly release: (input: Parameters<ContentWorkspaceResource["release"]>[0]) => Promise<ContentWorkspaceReleaseReceipt>;
}

/** Promise projection of the exact read-only local Git capability set. */
export interface ContentWorkspaceGitReadAsyncPort {
  readonly inspectGitWorkspace: (input: Parameters<ContentWorkspaceResource["inspectGitWorkspace"]>[0]) => Promise<GitWorkspaceAnchor>;
  readonly readGitTree: (input: Parameters<ContentWorkspaceResource["readGitTree"]>[0]) => Promise<Uint8Array>;
  readonly readGitBlob: (input: Parameters<ContentWorkspaceResource["readGitBlob"]>[0]) => Promise<Uint8Array>;
  readonly captureGitWorkspaceEvidence: (input: Parameters<ContentWorkspaceResource["captureGitWorkspaceEvidence"]>[0]) => Promise<GitWorkspaceEvidence>;
  readonly observeGitStagedIndex: (input: Parameters<ContentWorkspaceResource["observeGitStagedIndex"]>[0]) => Promise<GitStagedIndexObservation>;
  readonly readGitBlobAtPath: (input: Parameters<ContentWorkspaceResource["readGitBlobAtPath"]>[0]) => Promise<GitBlobAtPathObservation>;
  readonly isLocalGitAncestor: (input: Parameters<ContentWorkspaceResource["isLocalGitAncestor"]>[0]) => Promise<boolean>;
  readonly listGitChangedPaths: (input: Parameters<ContentWorkspaceResource["listGitChangedPaths"]>[0]) => Promise<Uint8Array>;
}

export type ContentWorkspaceNodeAsyncPort = ContentWorkspaceAsyncPort & ContentWorkspaceGitReadAsyncPort;
