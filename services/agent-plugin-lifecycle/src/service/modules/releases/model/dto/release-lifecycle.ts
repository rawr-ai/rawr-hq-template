import { ReadonlyObject, Refine, type Static, Type } from "typebox";
import {
  ContentWorkspacePolicySchema,
  QualifiedHeadRefSchema,
  SourceEligibilityIssueSchema,
} from "../../../../model/dto/releases/content-workspace";
import { NonEmptyReadonlyArray } from "../../../../model/dto/structural";
import {
  ArtifactDigestSchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  PluginIdSchema,
  ReleaseDigestSchema,
  ReleaseInputDigestSchema,
  ReleaseIssueSchema,
  ReleaseSetDigestSchema,
  RepositoryIdentitySchema,
} from "../../../../shared/release";
import { StagedContentWorkspacePolicySchema } from "./staged-content-workspace";

export const ReleaseSelectionSchema = Type.Union([
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
    mode: ReleaseSelectionSchema,
  }),
  { additionalProperties: false }
);

export type ReleaseSelection = Static<typeof ReleaseSelectionSchema>;
export type AgentPluginCheckRequest = Static<typeof CheckInputSchema>;

const Uint8ArraySchema = Refine(
  Type.Unsafe<Uint8Array>(Type.Unknown()),
  (value) => value instanceof Uint8Array,
  () => "Expected Uint8Array"
);

const WorkspaceBindingSchema = Type.String({
  minLength: 64,
  maxLength: 64,
  pattern: "^[0-9a-f]{64}$",
});

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

export const ReleaseCheckIssueSchema = Type.Union([
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
]);

const ReleaseCheckIssueListSchema = NonEmptyReadonlyArray(ReleaseCheckIssueSchema, {
  maxItems: 200_000,
});

const DerivedReleaseMemberSchema = ReadonlyObject(
  Type.Object({
    pluginId: PluginIdSchema,
    releaseDigest: ReleaseDigestSchema,
    artifactDigest: ArtifactDigestSchema,
  }),
  { additionalProperties: false }
);

export const ReleaseDerivationIdentitySchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("release"),
      pluginId: PluginIdSchema,
      releaseDigest: ReleaseDigestSchema,
      artifactDigest: ArtifactDigestSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("complete-set"),
      releaseSetDigest: ReleaseSetDigestSchema,
      members: ReadonlyObject(Type.Array(DerivedReleaseMemberSchema), {
        minItems: 1,
        maxItems: MAX_RELEASE_MEMBERS,
      }),
    }),
    { additionalProperties: false }
  ),
]);

export const CheckResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("EligibleReport"),
      derivation: ReleaseDerivationIdentitySchema,
      eligibilityBinding: WorkspaceBindingSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("IneligibleReport"),
      mode: ReleaseSelectionSchema,
      issues: ReleaseCheckIssueListSchema,
    }),
    { additionalProperties: false }
  ),
]);

export type RepositoryCheckRequest = Static<typeof RepositoryCheckInputSchema>;
export type RepositoryCheckResult = Static<typeof RepositoryCheckResultSchema>;
export type ReleaseCheckIssue = Static<typeof ReleaseCheckIssueSchema>;
export type ReleaseDerivationIdentity = Static<typeof ReleaseDerivationIdentitySchema>;
export type CheckResult = Static<typeof CheckResultSchema>;

export function releaseConstructionIssue(
  detail: string
): Extract<ReleaseCheckIssue, { kind: "ReleaseConstruction" }> {
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
