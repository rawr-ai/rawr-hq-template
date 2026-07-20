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
import type { SourceEligibilityIssue } from "../../../../model/dto/releases/content-workspace";

export interface StagedContentWorkspacePolicy {
  readonly locator: string;
  readonly repositoryIdentity: RepositoryIdentity;
  readonly contentAuthority: ContentAuthority;
  readonly remoteName: string;
  readonly remoteUrl: string;
  readonly refName: string;
  readonly releaseInputPath: ReleaseRelativePath;
  readonly pluginRoot: ReleaseRelativePath;
}

export interface StagedContentWorkspaceSnapshot {
  readonly kind: "StagedContentWorkspaceSnapshot";
  readonly repositoryIdentity: RepositoryIdentity;
  readonly refName: string;
  readonly headCommit: GitCommitId;
  readonly headTree: GitTreeId;
  readonly releaseInput: AgentPluginReleaseInput;
  readonly payloads: readonly Readonly<{ pluginId: PluginId; payload: AgentPluginPayload }>[];
  readonly objectBindings: readonly Readonly<{
    path: ReleaseRelativePath;
    objectId: string;
    mode: number;
  }>[];
  readonly stagedBinding: string;
}

export type StagedContentWorkspaceInspection =
  | Readonly<{
    kind: "StagedContentWorkspaceEligible";
    snapshot: StagedContentWorkspaceSnapshot;
  }>
  | Readonly<{
    kind: "StagedContentWorkspaceIneligible";
    issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]];
  }>
  | Readonly<{
    kind: "SourceChanged";
    detail: string;
  }>;
