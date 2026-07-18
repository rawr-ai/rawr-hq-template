import type {
  AgentPluginPayload,
  AgentPluginReleaseInput,
  ContentAuthority,
  GitCommitId,
  GitTreeId,
  PluginId,
  ReleaseRelativePath,
  RepositoryIdentity,
} from "../../../../shared/release";

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
