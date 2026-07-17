import type {
  AgentPluginPayload,
  AgentPluginRelease,
  AgentPluginReleaseInput,
  AgentPluginReleaseSet,
  ArtifactRef,
  ContentAuthority,
  GitCommitId,
  GitTreeId,
  MechanicalEvidenceReader,
  PluginId,
  ReleaseRelativePath,
  RepositoryIdentity,
  VerifiedArtifactSnapshotV1,
} from "../../shared/release";

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

export interface ContentWorkspaceSnapshotReader {
  inspect(policy: ContentWorkspacePolicy): Promise<ContentWorkspaceInspection>;
  revalidate(policy: ContentWorkspacePolicy, eligibilityBinding: string): Promise<ContentWorkspaceInspection>;
}

export interface ArtifactReadIssue {
  readonly code:
    | "InvalidStoreRoot"
    | "MissingEntry"
    | "UnexpectedEntry"
    | "InvalidEntryType"
    | "SharedInode"
    | "ModeMismatch"
    | "DigestMismatch"
    | "MalformedEnvelope"
    | "ReferenceMismatch"
    | "ReadFailure";
  readonly detail: string;
}

export type ArtifactReadResult =
  | Readonly<{ kind: "Verified"; snapshot: VerifiedArtifactSnapshotV1 }>
  | Readonly<{ kind: "Missing"; ref: ArtifactRef }>
  | Readonly<{
    kind: "Mismatch";
    ref: ArtifactRef;
    issues: readonly [ArtifactReadIssue, ...ArtifactReadIssue[]];
  }>;

export interface ArtifactReader {
  read(ref: ArtifactRef): Promise<ArtifactReadResult>;
}

export type ArtifactStoreFailpointEvent =
  | Readonly<{ kind: "AfterStagingFile"; path: string }>
  | Readonly<{ kind: "AfterStagingFlush" }>
  | Readonly<{ kind: "AfterStagingVerification" }>
  | Readonly<{ kind: "BeforeNoReplacePublication" }>
  | Readonly<{ kind: "AfterNoReplacePublication" }>
  | Readonly<{ kind: "AfterFinalVerification" }>;

export type ArtifactStoreFailpoint = (event: ArtifactStoreFailpointEvent) => void | Promise<void>;

export type PublicationGuardResult =
  | Readonly<{ kind: "Allowed" }>
  | Readonly<{ kind: "Rejected"; failure: string }>;

export interface ArtifactPublicationOptions {
  readonly failpoint?: ArtifactStoreFailpoint;
  readonly beforePublication?: () => Promise<PublicationGuardResult>;
}

export type ArtifactPublicationResult =
  | Readonly<{ kind: "Published"; ref: ArtifactRef }>
  | Readonly<{ kind: "ReadOnlyConverged"; ref: ArtifactRef }>
  | Readonly<{
    kind: "Rejected";
    ref: ArtifactRef;
    failure: string;
    cleanupFailure?: string;
  }>
  | Readonly<{
    kind: "Unsettled";
    ref: ArtifactRef;
    failure: string;
    observation: "Verified" | "Missing" | "Mismatch" | "Unknown";
    cleanupFailure?: string;
  }>;

export interface ArtifactStore extends ArtifactReader {
  publishRelease(
    release: AgentPluginRelease,
    options?: ArtifactPublicationOptions,
  ): Promise<ArtifactPublicationResult>;
  publishReleaseSet(
    releaseSet: AgentPluginReleaseSet,
    options?: ArtifactPublicationOptions,
  ): Promise<ArtifactPublicationResult>;
}

export interface ReleaseLifecycleRuntime {
  readonly source: ContentWorkspaceSnapshotReader;
  readonly artifacts: ArtifactStore;
  readonly evidence?: MechanicalEvidenceReader;
}

export type { ResourceArtifactRepositoryOptions } from "./internal/resource-artifact-repository";
