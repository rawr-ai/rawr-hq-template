import { ReadonlyObject, Refine, Type, type Static } from "typebox";

import {
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  ReleaseIssueSchema,
  type ArtifactRef,
  type PluginId,
  type ReleaseArtifactRef,
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

const Uint8ArraySchema = Refine(
  Type.Unsafe<Uint8Array>(Type.Unknown()),
  (value) => value instanceof Uint8Array,
  () => "Expected Uint8Array",
);

const ReleaseInputDigestSchema = Type.String({ pattern: "^ri1_[0-9a-f]{64}$" });

export const ReleaseInputRecordInputSchema = Type.Union([
  ReadonlyObject(Type.Object(
    { kind: Type.Literal("encode-body"), body: Type.Unknown() },
  ), { additionalProperties: false }),
  ReadonlyObject(Type.Object(
    { kind: Type.Literal("validate-envelope"), bytes: Uint8ArraySchema },
  ), { additionalProperties: false }),
]);

export const ReleaseInputRecordResultSchema = Type.Union([
  ReadonlyObject(Type.Object(
    {
      ok: Type.Literal(true),
      value: ReadonlyObject(Type.Object(
        {
          releaseInputDigest: ReleaseInputDigestSchema,
          byteLength: Type.Integer({
            minimum: 1,
            maximum: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
          }),
          bytes: Uint8ArraySchema,
        },
      ), { additionalProperties: false }),
    },
  ), { additionalProperties: false }),
  ReadonlyObject(Type.Object(
    {
      ok: Type.Literal(false),
      issues: ReadonlyObject(Type.Array(ReleaseIssueSchema), {
        minItems: 1,
        maxItems: 200_000,
      }),
    },
  ), { additionalProperties: false }),
]);

export type ReleaseInputRecordRequest = Static<typeof ReleaseInputRecordInputSchema>;
export type ReleaseInputRecordResult = Static<typeof ReleaseInputRecordResultSchema>;

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
