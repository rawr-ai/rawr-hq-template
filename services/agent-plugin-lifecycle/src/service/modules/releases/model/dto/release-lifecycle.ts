import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import {
  ContentWorkspacePolicySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  QualifiedHeadRefSchema,
  RepositoryIdentitySchema,
  SourceEligibilityIssueSchema,
} from "../../../../model/dto/releases/content-workspace";
import { NonEmptyReadonlyArray } from "../../../../model/dto/structural";
import {
  ArtifactRefSchema,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  ReleaseArtifactRefSchema,
  ReleaseIssueSchema,
} from "../../../../shared/release";
import { StagedContentWorkspacePolicySchema } from "./staged-content-workspace";

export const BuildModeSchema = Type.Union([
  ReadonlyObject(Type.Object({ kind: Type.Literal("targeted"), pluginId: PluginIdSchema }), {
    additionalProperties: false,
  }),
  ReadonlyObject(Type.Object({ kind: Type.Literal("complete-set") }), {
    additionalProperties: false,
  }),
]);

export const CheckInputSchema = ReadonlyObject(
  Type.Object({
    contentWorkspace: ContentWorkspacePolicySchema,
    mode: BuildModeSchema,
  }),
  { additionalProperties: false }
);

export const BuildInputSchema = CheckInputSchema;

export type BuildMode = Static<typeof BuildModeSchema>;
export type AgentPluginCheckRequest = Static<typeof CheckInputSchema>;
export type AgentPluginBuildRequest = Static<typeof BuildInputSchema>;

const Uint8ArraySchema = Refine(
  Type.Unsafe<Uint8Array>(Type.Unknown()),
  (value) => value instanceof Uint8Array,
  () => "Expected Uint8Array"
);

const ReleaseInputDigestSchema = Type.String({ pattern: "^ri1_[0-9a-f]{64}$" });
const WorkspaceBindingSchema = Type.String({
  minLength: 64,
  maxLength: 64,
  pattern: "^[0-9a-f]{64}$",
});

export const MAX_ARTIFACT_STORE_ISSUE_DETAIL_LENGTH = 4_096;
export const MAX_ARTIFACT_STORE_CLEANUP_FAILURE_LENGTH = 4_096;
export const MAX_RELEASE_CONSTRUCTION_ISSUE_DETAIL_LENGTH = 4_096;
export const MAX_RELEASE_SOURCE_CHANGED_DETAIL_LENGTH = 4_096;

const TRUNCATED_RELEASE_DIAGNOSTIC_SUFFIX = "...[truncated]";

export const ReleaseInputRecordInputSchema = Type.Union([
  ReadonlyObject(Type.Object({ kind: Type.Literal("encode-body"), body: Type.Unknown() }), {
    additionalProperties: false,
  }),
  ReadonlyObject(
    Type.Object({ kind: Type.Literal("validate-envelope"), bytes: Uint8ArraySchema }),
    { additionalProperties: false }
  ),
]);

export const ReleaseInputRecordResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      ok: Type.Literal(true),
      value: ReadonlyObject(
        Type.Object({
          releaseInputDigest: ReleaseInputDigestSchema,
          byteLength: Type.Integer({
            minimum: 1,
            maximum: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
          }),
          bytes: Uint8ArraySchema,
        }),
        { additionalProperties: false }
      ),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      ok: Type.Literal(false),
      issues: NonEmptyReadonlyArray(ReleaseIssueSchema, {
        maxItems: 200_000,
      }),
    }),
    { additionalProperties: false }
  ),
]);

export type ReleaseInputRecordRequest = Static<typeof ReleaseInputRecordInputSchema>;
export type ReleaseInputRecordResult = Static<typeof ReleaseInputRecordResultSchema>;

export const ReleaseInputRefreshInputSchema = ReadonlyObject(
  Type.Object({
    contentWorkspace: StagedContentWorkspacePolicySchema,
    memberIds: ReadonlyObject(Type.Array(PluginIdSchema), {
      minItems: 1,
      maxItems: MAX_RELEASE_MEMBERS,
      uniqueItems: true,
    }),
  }),
  { additionalProperties: false }
);

const ReleaseInputRefreshSuccessSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Union([
      Type.Literal("ReleaseInputCandidateReady"),
      Type.Literal("ReleaseInputReadOnlyConverged"),
    ]),
    releaseInputDigest: ReleaseInputDigestSchema,
    byteLength: Type.Integer({
      minimum: 1,
      maximum: MAX_RELEASE_INPUT_ENVELOPE_BYTES,
    }),
    bytes: Uint8ArraySchema,
  }),
  { additionalProperties: false }
);

export const ReleaseInputRefreshResultSchema = Type.Union([
  ReleaseInputRefreshSuccessSchema,
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("RepositoryIneligible"),
      mode: Type.Literal("staged"),
      issues: NonEmptyReadonlyArray(SourceEligibilityIssueSchema, {
        maxItems: 200_000,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("ReleaseInputRejected"),
      issues: NonEmptyReadonlyArray(ReleaseIssueSchema, {
        maxItems: 200_000,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("SourceChanged"),
      mode: Type.Literal("staged"),
      detail: Type.String({
        minLength: 1,
        maxLength: MAX_RELEASE_SOURCE_CHANGED_DETAIL_LENGTH,
      }),
    }),
    { additionalProperties: false }
  ),
]);

export type ReleaseInputRefreshRequest = Static<typeof ReleaseInputRefreshInputSchema>;
export type ReleaseInputRefreshResult = Static<typeof ReleaseInputRefreshResultSchema>;

export const RepositoryCheckInputSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("staged"),
      contentWorkspace: StagedContentWorkspacePolicySchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("clean"),
      contentWorkspace: ContentWorkspacePolicySchema,
    }),
    { additionalProperties: false }
  ),
]);

const SourceEligibilityIssueListSchema = NonEmptyReadonlyArray(SourceEligibilityIssueSchema, {
  maxItems: 200_000,
});

export const RepositoryCheckResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("StagedRepositoryEligible"),
      repositoryIdentity: RepositoryIdentitySchema,
      refName: QualifiedHeadRefSchema,
      headCommit: GitCommitIdSchema,
      headTree: GitTreeIdSchema,
      stagedBinding: WorkspaceBindingSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("CleanRepositoryEligible"),
      repositoryIdentity: RepositoryIdentitySchema,
      refName: QualifiedHeadRefSchema,
      sourceCommit: GitCommitIdSchema,
      sourceTree: GitTreeIdSchema,
      eligibilityBinding: WorkspaceBindingSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("RepositoryIneligible"),
      mode: Type.Union([Type.Literal("staged"), Type.Literal("clean")]),
      issues: SourceEligibilityIssueListSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("SourceChanged"),
      mode: Type.Literal("staged"),
      detail: Type.String({
        minLength: 1,
        maxLength: MAX_RELEASE_SOURCE_CHANGED_DETAIL_LENGTH,
      }),
    }),
    { additionalProperties: false }
  ),
]);

export const BuildIssueSchema = Type.Union([
  ReadonlyObject(
    Type.Object({ kind: Type.Literal("SourceEligibility"), issue: SourceEligibilityIssueSchema }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("ReleaseConstruction"),
      detail: Type.String({
        minLength: 1,
        maxLength: MAX_RELEASE_CONSTRUCTION_ISSUE_DETAIL_LENGTH,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("ArtifactStore"),
      detail: Type.String({
        minLength: 1,
        maxLength: MAX_ARTIFACT_STORE_ISSUE_DETAIL_LENGTH,
      }),
      cleanupFailure: Type.Optional(
        Type.String({
          minLength: 1,
          maxLength: MAX_ARTIFACT_STORE_CLEANUP_FAILURE_LENGTH,
        })
      ),
    }),
    { additionalProperties: false }
  ),
]);

const IssueListSchema = NonEmptyReadonlyArray(BuildIssueSchema, {
  maxItems: 200_000,
});
const ReleaseRefListSchema = ReadonlyObject(Type.Array(ReleaseArtifactRefSchema), {
  maxItems: 1_024,
});

export const CheckResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("EligibleReport"),
      mode: BuildModeSchema,
      candidate: ArtifactRefSchema,
      eligibilityBinding: WorkspaceBindingSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("IneligibleReport"),
      mode: BuildModeSchema,
      issues: IssueListSchema,
    }),
    { additionalProperties: false }
  ),
]);

export const BuildResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("RejectedBeforePublication"),
      mode: BuildModeSchema,
      issues: IssueListSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("PublicationIncomplete"),
      mode: ReadonlyObject(Type.Object({ kind: Type.Literal("complete-set") }), {
        additionalProperties: false,
      }),
      newlyPublished: ReleaseRefListSchema,
      preExisting: ReleaseRefListSchema,
      requestedSetRefAbsent: Type.Literal(true),
      issues: IssueListSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("PublicationUnsettled"),
      mode: BuildModeSchema,
      observedVerifiedReleases: ReleaseRefListSchema,
      requestedFinalCommit: Type.Literal("Unknown"),
      issues: IssueListSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("Published"),
      mode: BuildModeSchema,
      ref: ArtifactRefSchema,
      newlyPublished: ReleaseRefListSchema,
      preExisting: ReleaseRefListSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("ReadOnlyConverged"),
      mode: BuildModeSchema,
      ref: ArtifactRefSchema,
    }),
    { additionalProperties: false }
  ),
]);

export type RepositoryCheckRequest = Static<typeof RepositoryCheckInputSchema>;
export type RepositoryCheckResult = Static<typeof RepositoryCheckResultSchema>;
export type BuildIssue = Static<typeof BuildIssueSchema>;
export type CheckResult = Static<typeof CheckResultSchema>;
export type BuildResult = Static<typeof BuildResultSchema>;

export function artifactStoreBuildIssue(
  detail: string,
  cleanupFailure?: string
): Extract<BuildIssue, { kind: "ArtifactStore" }> {
  return Object.freeze({
    kind: "ArtifactStore",
    detail: boundedReleaseDiagnostic(detail, MAX_ARTIFACT_STORE_ISSUE_DETAIL_LENGTH),
    ...(cleanupFailure === undefined
      ? {}
      : {
          cleanupFailure: boundedReleaseDiagnostic(
            cleanupFailure,
            MAX_ARTIFACT_STORE_CLEANUP_FAILURE_LENGTH
          ),
        }),
  });
}

export function releaseConstructionBuildIssue(
  detail: string
): Extract<BuildIssue, { kind: "ReleaseConstruction" }> {
  return Object.freeze({
    kind: "ReleaseConstruction",
    detail: boundedReleaseDiagnostic(detail, MAX_RELEASE_CONSTRUCTION_ISSUE_DETAIL_LENGTH),
  });
}

export function normalizeReleaseSourceChangedDetail(detail: string): string {
  return boundedReleaseDiagnostic(detail, MAX_RELEASE_SOURCE_CHANGED_DETAIL_LENGTH);
}

function boundedReleaseDiagnostic(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  return `${value.slice(
    0,
    maximumLength - TRUNCATED_RELEASE_DIAGNOSTIC_SUFFIX.length
  )}${TRUNCATED_RELEASE_DIAGNOSTIC_SUFFIX}`;
}
