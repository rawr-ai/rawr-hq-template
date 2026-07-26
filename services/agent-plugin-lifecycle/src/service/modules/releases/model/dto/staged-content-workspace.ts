import { ReadonlyObject, type Static, Type } from "typebox";
import {
  CanonicalAbsoluteLocatorSchema,
  QualifiedHeadRefSchema,
  RemoteNameSchema,
  RemoteUrlSchema,
  type SourceEligibilityIssue,
} from "#agent-plugin-lifecycle-service/model/dto/releases/content-workspace";
import {
  type AgentPluginPayload,
  type AgentPluginReleaseInput,
  ContentAuthoritySchema,
  type GitCommitId,
  type GitTreeId,
  type PluginId,
  type ReleaseRelativePath,
  ReleaseRelativePathSchema,
  type RepositoryIdentity,
  RepositoryIdentitySchema,
} from "#agent-plugin-lifecycle-service/shared/release/index";

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

type StagedGitObjectFormat = "sha1" | "sha256";

/**
 * Captures the repository anchor whose equality makes a staged observation
 * meaningful to release eligibility.
 */
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

/**
 * Binds one complete staged index byte sequence to the repository anchor seen
 * at the same observation boundary.
 */
export interface StagedIndexBindingObservation {
  readonly anchor: StagedWorkspaceAnchorObservation;
  readonly indexEntries: Uint8Array;
}

interface StagedBlobObservation {
  readonly objectId: string;
  readonly bytes: Uint8Array;
}

/**
 * Holds the opening and closing staged bindings around the exact blobs needed
 * by release policy, allowing the module to reject source movement.
 */
export interface StagedIndexObservation {
  readonly opening: StagedIndexBindingObservation;
  readonly blobs: readonly StagedBlobObservation[];
  readonly closing: StagedIndexBindingObservation;
}

/**
 * Selects the bounded staged index and blob materialization required for one
 * release-policy phase.
 */
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

/**
 * Classifies resource observation failures before release policy maps them to
 * its public eligibility vocabulary.
 */
export type StagedObservationFailureReason =
  | "Aliased"
  | "InvalidInput"
  | "LimitExceeded"
  | "Unavailable";

/**
 * Reports either one complete staged observation or one normalized resource
 * failure to the Releases module.
 */
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
