import { Type } from "typebox";

import type {
  AgentPluginCheckRequest,
  BuildResult,
  CheckResult,
  RepositoryCheckRequest,
  RepositoryCheckResult,
} from "./model/dto/release-lifecycle";
import type {
  RetentionResult,
  RetentionSpacePolicyV1,
} from "./model/dto/retention";
import {
  ContentWorkspacePolicySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  QualifiedHeadRefSchema,
  RepositoryIdentitySchema,
  SourceEligibilityIssueSchema,
} from "../../model/dto/releases/content-workspace";
import { StagedContentWorkspacePolicySchema } from "./model/dto/staged-content-workspace";

const ReleaseDigestSchema = Type.String({ pattern: "^rd1_[0-9a-f]{64}$" });
const ArtifactDigestSchema = Type.String({ pattern: "^ad1_[0-9a-f]{64}$" });
const ReleaseSetDigestSchema = Type.String({ pattern: "^rs1_[0-9a-f]{64}$" });
const MechanicalEvidenceDigestSchema = Type.String({ pattern: "^me1_[0-9a-f]{64}$" });

export const BuildModeSchema = Type.Unsafe<AgentPluginCheckRequest["mode"]>(Type.Union([
  Type.Object(
    { kind: Type.Literal("targeted"), pluginId: PluginIdSchema },
    { additionalProperties: false },
  ),
  Type.Object({ kind: Type.Literal("complete-set") }, { additionalProperties: false }),
]));

export const CheckInputSchema = Type.Unsafe<AgentPluginCheckRequest>(Type.Object(
  {
    contentWorkspace: ContentWorkspacePolicySchema,
    mode: BuildModeSchema,
  },
  { additionalProperties: false },
));

export const BuildInputSchema = CheckInputSchema;

export {
  ReleaseInputRefreshInputSchema,
  ReleaseInputRefreshResultSchema,
  ReleaseInputRecordInputSchema,
  ReleaseInputRecordResultSchema,
} from "./model/dto/release-lifecycle";

export const RepositoryCheckInputSchema = Type.Unsafe<RepositoryCheckRequest>(Type.Union([
  Type.Object(
    {
      kind: Type.Literal("staged"),
      contentWorkspace: StagedContentWorkspacePolicySchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("clean"),
      contentWorkspace: ContentWorkspacePolicySchema,
    },
    { additionalProperties: false },
  ),
]));

const ArtifactRefSchema = Type.Union([
  Type.Object(
    {
      kind: Type.Literal("release"),
      releaseDigest: ReleaseDigestSchema,
      artifactDigest: ArtifactDigestSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("complete-set"),
      releaseSetDigest: ReleaseSetDigestSchema,
    },
    { additionalProperties: false },
  ),
]);

const ReleaseArtifactRefSchema = Type.Object(
  {
    kind: Type.Literal("release"),
    releaseDigest: ReleaseDigestSchema,
    artifactDigest: ArtifactDigestSchema,
  },
  { additionalProperties: false },
);

const MechanicalEvidenceHandleSchema = Type.Object(
  {
    kind: Type.Literal("mechanical-evidence"),
    protocolVersion: Type.Literal(1),
    digest: MechanicalEvidenceDigestSchema,
  },
  { additionalProperties: false },
);

const RetentionRefSchema = Type.Union([
  ArtifactRefSchema,
  MechanicalEvidenceHandleSchema,
]);

const RetentionIssueSchema = Type.Object(
  {
    ref: Type.Optional(RetentionRefSchema),
    detail: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const RetentionInventoryEntrySchema = Type.Object(
  {
    ref: RetentionRefSchema,
    storedBytes: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  },
  { additionalProperties: false },
);

export const PlanRetentionInputSchema = Type.Unsafe<RetentionSpacePolicyV1>(Type.Object(
  {
    kind: Type.Literal("space-v1"),
    maximumUnpinnedBytes: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
  },
  { additionalProperties: false },
));

export const PlanRetentionResultSchema = Type.Unsafe<RetentionResult>(Type.Union([
  Type.Object(
    {
      kind: Type.Literal("RetentionPlan"),
      pinned: Type.Array(RetentionRefSchema),
      retained: Type.Array(RetentionInventoryEntrySchema),
      collectible: Type.Array(RetentionInventoryEntrySchema),
      blockedEntries: Type.Array(RetentionIssueSchema),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("BlockedPinnedGraph"),
      issues: Type.Array(RetentionIssueSchema, { minItems: 1 }),
    },
    { additionalProperties: false },
  ),
]));

const SourceEligibilityIssueListSchema = Type.Array(SourceEligibilityIssueSchema, {
  minItems: 1,
  maxItems: 200_000,
});

export const RepositoryCheckResultSchema = Type.Unsafe<RepositoryCheckResult>(Type.Union([
  Type.Object(
    {
      kind: Type.Literal("StagedRepositoryEligible"),
      repositoryIdentity: RepositoryIdentitySchema,
      refName: QualifiedHeadRefSchema,
      headCommit: GitCommitIdSchema,
      headTree: GitTreeIdSchema,
      stagedBinding: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("CleanRepositoryEligible"),
      repositoryIdentity: RepositoryIdentitySchema,
      refName: QualifiedHeadRefSchema,
      sourceCommit: GitCommitIdSchema,
      sourceTree: GitTreeIdSchema,
      eligibilityBinding: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("RepositoryIneligible"),
      mode: Type.Union([Type.Literal("staged"), Type.Literal("clean")]),
      issues: SourceEligibilityIssueListSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("SourceChanged"),
      mode: Type.Literal("staged"),
      detail: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
]));

const BuildIssueSchema = Type.Union([
  Type.Object(
    { kind: Type.Literal("SourceEligibility"), issue: SourceEligibilityIssueSchema },
    { additionalProperties: false },
  ),
  Type.Object(
    { kind: Type.Literal("ReleaseConstruction"), detail: Type.String({ minLength: 1 }) },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("ArtifactStore"),
      detail: Type.String({ minLength: 1 }),
      cleanupFailure: Type.Optional(Type.String({ minLength: 1 })),
    },
    { additionalProperties: false },
  ),
]);

const IssueListSchema = Type.Array(BuildIssueSchema, { minItems: 1, maxItems: 200_000 });
const ReleaseRefListSchema = Type.Array(ReleaseArtifactRefSchema, { maxItems: 1_024 });

export const CheckResultSchema = Type.Unsafe<CheckResult>(Type.Union([
  Type.Object(
    {
      kind: Type.Literal("EligibleReport"),
      mode: BuildModeSchema,
      candidate: ArtifactRefSchema,
      eligibilityBinding: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("IneligibleReport"),
      mode: BuildModeSchema,
      issues: IssueListSchema,
    },
    { additionalProperties: false },
  ),
]));

export const BuildResultSchema = Type.Unsafe<BuildResult>(Type.Union([
  Type.Object(
    {
      kind: Type.Literal("RejectedBeforePublication"),
      mode: BuildModeSchema,
      issues: IssueListSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("PublicationIncomplete"),
      mode: Type.Object({ kind: Type.Literal("complete-set") }, { additionalProperties: false }),
      newlyPublished: ReleaseRefListSchema,
      preExisting: ReleaseRefListSchema,
      requestedSetRefAbsent: Type.Literal(true),
      issues: IssueListSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("PublicationUnsettled"),
      mode: BuildModeSchema,
      observedVerifiedReleases: ReleaseRefListSchema,
      requestedFinalCommit: Type.Literal("Unknown"),
      issues: IssueListSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("Published"),
      mode: BuildModeSchema,
      ref: ArtifactRefSchema,
      newlyPublished: ReleaseRefListSchema,
      preExisting: ReleaseRefListSchema,
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("ReadOnlyConverged"),
      mode: BuildModeSchema,
      ref: ArtifactRefSchema,
    },
    { additionalProperties: false },
  ),
]));
