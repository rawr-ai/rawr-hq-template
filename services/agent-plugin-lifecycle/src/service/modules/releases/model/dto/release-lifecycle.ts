import type {
  ArtifactRef,
  PluginId,
  ReleaseArtifactRef,
} from "../../../../shared/release";
import type {
  ContentWorkspacePolicy,
  SourceEligibilityIssue,
} from "../../../../model/dto/releases/content-workspace";
import type { StagedContentWorkspacePolicy } from "./staged-content-workspace";

export type BuildMode =
  | Readonly<{ kind: "targeted"; pluginId: PluginId }>
  | Readonly<{ kind: "complete-set" }>;

export interface AgentPluginCheckRequest {
  readonly contentWorkspace: ContentWorkspacePolicy;
  readonly mode: BuildMode;
}

export type AgentPluginBuildRequest = AgentPluginCheckRequest;

export type RepositoryCheckRequest =
  | Readonly<{
    kind: "staged";
    contentWorkspace: StagedContentWorkspacePolicy;
  }>
  | Readonly<{
    kind: "clean";
    contentWorkspace: ContentWorkspacePolicy;
  }>;

export type RepositoryCheckResult =
  | Readonly<{
    kind: "StagedRepositoryEligible";
    repositoryIdentity: StagedContentWorkspacePolicy["repositoryIdentity"];
    refName: string;
    headCommit: ContentWorkspacePolicy["sourceCommit"];
    headTree: ContentWorkspacePolicy["sourceTree"];
    stagedBinding: string;
  }>
  | Readonly<{
    kind: "CleanRepositoryEligible";
    repositoryIdentity: ContentWorkspacePolicy["repositoryIdentity"];
    refName: string;
    sourceCommit: ContentWorkspacePolicy["sourceCommit"];
    sourceTree: ContentWorkspacePolicy["sourceTree"];
    eligibilityBinding: string;
  }>
  | Readonly<{
    kind: "RepositoryIneligible";
    mode: "staged" | "clean";
    issues: readonly [SourceEligibilityIssue, ...SourceEligibilityIssue[]];
  }>
  | Readonly<{
    kind: "SourceChanged";
    mode: "staged";
    detail: string;
  }>;

export type BuildIssue =
  | Readonly<{ kind: "SourceEligibility"; issue: SourceEligibilityIssue }>
  | Readonly<{ kind: "ReleaseConstruction"; detail: string }>
  | Readonly<{ kind: "ArtifactStore"; detail: string; cleanupFailure?: string }>;

export type CheckResult =
  | Readonly<{
    kind: "EligibleReport";
    mode: BuildMode;
    candidate: ArtifactRef;
    eligibilityBinding: string;
  }>
  | Readonly<{
    kind: "IneligibleReport";
    mode: BuildMode;
    issues: readonly [BuildIssue, ...BuildIssue[]];
  }>;

export type BuildResult =
  | Readonly<{
    kind: "RejectedBeforePublication";
    mode: BuildMode;
    issues: readonly [BuildIssue, ...BuildIssue[]];
  }>
  | Readonly<{
    kind: "PublicationIncomplete";
    mode: Readonly<{ kind: "complete-set" }>;
    newlyPublished: readonly ReleaseArtifactRef[];
    preExisting: readonly ReleaseArtifactRef[];
    requestedSetRefAbsent: true;
    issues: readonly [BuildIssue, ...BuildIssue[]];
  }>
  | Readonly<{
    kind: "PublicationUnsettled";
    mode: BuildMode;
    observedVerifiedReleases: readonly ReleaseArtifactRef[];
    requestedFinalCommit: "Unknown";
    issues: readonly [BuildIssue, ...BuildIssue[]];
  }>
  | Readonly<{
    kind: "Published";
    mode: BuildMode;
    ref: ArtifactRef;
    newlyPublished: readonly ReleaseArtifactRef[];
    preExisting: readonly ReleaseArtifactRef[];
  }>
  | Readonly<{
    kind: "ReadOnlyConverged";
    mode: BuildMode;
    ref: ArtifactRef;
  }>;
