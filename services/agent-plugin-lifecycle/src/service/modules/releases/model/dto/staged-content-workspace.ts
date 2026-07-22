import { ReadonlyObject, Type, type Static } from "typebox";

import type {
  AgentPluginPayload,
  AgentPluginReleaseInput,
  GitCommitId,
  GitTreeId,
  PluginId,
  ReleaseRelativePath,
  RepositoryIdentity,
} from "../../../../shared/release";
import {
  CanonicalAbsoluteLocatorSchema,
  ContentAuthoritySchema,
  QualifiedHeadRefSchema,
  ReleaseRelativePathSchema,
  RemoteNameSchema,
  RemoteUrlSchema,
  RepositoryIdentitySchema,
  type SourceEligibilityIssue,
} from "../../../../model/dto/releases/content-workspace";

export const StagedContentWorkspacePolicySchema = ReadonlyObject(
  Type.Object({
    locator: CanonicalAbsoluteLocatorSchema,
    repositoryIdentity: RepositoryIdentitySchema,
    contentAuthority: ContentAuthoritySchema,
    remoteName: RemoteNameSchema,
    remoteUrl: RemoteUrlSchema,
    refName: QualifiedHeadRefSchema,
    releaseInputPath: ReleaseRelativePathSchema,
    pluginRoot: ReleaseRelativePathSchema,
  }),
  { additionalProperties: false }
);

export type StagedContentWorkspacePolicy = Static<typeof StagedContentWorkspacePolicySchema>;

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
