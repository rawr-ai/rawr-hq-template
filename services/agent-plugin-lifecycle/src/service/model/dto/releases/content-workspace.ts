import type {
  AgentPluginPayload,
  AgentPluginReleaseInput,
  ContentAuthority,
  GitCommitId,
  GitTreeId,
  PluginId,
  ReleaseRelativePath,
  RepositoryIdentity,
} from "../../../shared/release";

export interface ContentWorkspacePolicy {
  readonly locator: string;
  readonly repositoryIdentity: RepositoryIdentity;
  readonly contentAuthority: ContentAuthority;
  readonly remoteName: string;
  readonly remoteUrl: string;
  readonly refName: string;
  readonly sourceCommit: GitCommitId;
  readonly sourceTree: GitTreeId;
  readonly releaseInputPath: ReleaseRelativePath;
  readonly pluginRoot: ReleaseRelativePath;
}

export type StagedGitObjectFormat = "sha1" | "sha256";

export interface StagedWorkspaceAnchorObservation {
  readonly root: string;
  readonly rootDevice: string;
  readonly rootInode: string;
  readonly refName: string;
  readonly commit: string;
  readonly refCommit: string;
  readonly tree: string;
  readonly objectFormat: StagedGitObjectFormat;
  readonly remoteUrls: readonly string[];
}

export interface StagedIndexBindingObservation {
  readonly anchor: StagedWorkspaceAnchorObservation;
  readonly indexEntries: Uint8Array;
}

export interface StagedBlobObservation {
  readonly objectId: string;
  readonly bytes: Uint8Array;
}

export interface StagedIndexObservation {
  readonly opening: StagedIndexBindingObservation;
  readonly blobs: readonly StagedBlobObservation[];
  readonly closing: StagedIndexBindingObservation;
}

export interface StagedIndexObservationRequest {
  readonly locator: string;
  readonly remoteName: string;
  readonly refName: string;
  readonly materializedPaths: readonly string[];
  readonly materializedRoots: readonly string[];
  readonly maxEntries: number;
  readonly maxIndexBytes: number;
  readonly maxBlobBytes: number;
}

export type StagedObservationFailureReason =
  | "Aliased"
  | "InvalidInput"
  | "LimitExceeded"
  | "Unavailable";

export type StagedIndexObservationResult =
  | Readonly<{
    kind: "Observed";
    observation: StagedIndexObservation;
  }>
  | Readonly<{
    kind: "Failed";
    reason: StagedObservationFailureReason;
    detail: string;
  }>;

export interface ContentWorkspaceSnapshot {
  readonly repositoryIdentity: RepositoryIdentity;
  readonly sourceCommit: GitCommitId;
  readonly sourceTree: GitTreeId;
  readonly releaseInput: AgentPluginReleaseInput;
  readonly payloads: readonly Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>[];
  readonly objectBindings: readonly Readonly<{
    path: ReleaseRelativePath;
    objectId: string;
    mode: number;
  }>[];
  readonly eligibilityBinding: string;
}

export type SourceEligibilityIssueCode =
  | "AliasedLocator"
  | "WrongRepository"
  | "WrongRef"
  | "WrongCommit"
  | "WrongTree"
  | "DirtyTrackedWorktree"
  | "DirtyIndex"
  | "UntrackedConsumedPath"
  | "IgnoredConsumedPath"
  | "InvalidTree"
  | "MissingReleaseInput"
  | "ReleaseInputMismatch"
  | "PayloadMismatch"
  | "GitFailure"
  | "SourceChanged";

export interface SourceEligibilityIssue {
  readonly code: SourceEligibilityIssueCode;
  readonly detail: string;
}

export type ContentWorkspaceInspection =
  | Readonly<{ kind: "Eligible"; snapshot: ContentWorkspaceSnapshot }>
  | Readonly<{
    kind: "Ineligible";
    issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]];
  }>;
