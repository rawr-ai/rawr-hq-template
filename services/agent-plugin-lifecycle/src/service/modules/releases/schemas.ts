import { Refine, Type } from "typebox";

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
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "../../shared/release";

const ReleaseDigestSchema = Type.String({ pattern: "^rd1_[0-9a-f]{64}$" });
const ArtifactDigestSchema = Type.String({ pattern: "^ad1_[0-9a-f]{64}$" });
const ReleaseSetDigestSchema = Type.String({ pattern: "^rs1_[0-9a-f]{64}$" });
const MechanicalEvidenceDigestSchema = Type.String({ pattern: "^me1_[0-9a-f]{64}$" });

const CanonicalAbsoluteLocatorSchema = Refine(
  Type.String({
    minLength: 2,
    maxLength: 16_384,
    pattern:
      "^/(?!.*//)(?!.*(?:/\\.{1,2})(?:/|$))(?!.*\\\\)(?!.*[\\u0000-\\u001f\\u007f])[^/]+(?:/[^/]+)*$",
  }),
  isCanonicalAbsoluteLocator,
  () => "Expected a canonical non-root absolute workspace locator",
);
const RepositoryIdentitySchema = Refine(
  Type.String({
    minLength: 3,
    maxLength: 512,
    pattern:
      "^(?!file:)[a-z][a-z0-9+.-]*:[a-z0-9][a-z0-9._~-]*(?:/(?!\\.{1,2}(?:/|$))[a-z0-9._~-]+)*$",
  }),
  (value) => parseRepositoryIdentity(value).ok,
  () => "Expected a canonical logical repository identity",
);
const ContentAuthoritySchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: 512,
    pattern: "^[a-z0-9][a-z0-9._:-]*$",
  }),
  (value) => parseContentAuthority(value).ok,
  () => "Expected a canonical content authority",
);
const PluginIdSchema = Refine(
  Type.String({
    minLength: 1,
    maxLength: 512,
    pattern: "^[a-z0-9][a-z0-9._-]*$",
  }),
  (value) => parsePluginId(value).ok,
  () => "Expected a canonical plugin identity",
);
const GitCommitIdSchema = Refine(
  Type.String({ pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$" }),
  (value) => parseGitCommitId(value).ok,
  () => "Expected an exact lowercase Git commit object ID",
);
const GitTreeIdSchema = Refine(
  Type.String({ pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$" }),
  (value) => parseGitTreeId(value).ok,
  () => "Expected an exact lowercase Git tree object ID",
);
const ReleaseRelativePathSchema = Refine(
  Type.String({ minLength: 1, maxLength: 1_024 }),
  (value) => parseReleaseRelativePath(value).ok,
  () => "Expected a canonical POSIX release-relative path",
);
const RemoteNameSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$",
});
const RemoteUrlSchema = Type.String({
  minLength: 1,
  maxLength: 512,
  pattern: "^[^\\u0000-\\u001f\\u007f]+$",
});
const QualifiedHeadRefSchema = Refine(
  Type.String({
    minLength: "refs/heads/a".length,
    maxLength: 512,
    pattern: "^refs/heads/[^\\u0000-\\u0020~^:?*\\\\[]+$",
  }),
  isCanonicalHeadRef,
  () => "Expected a canonical fully qualified branch ref",
);

const ContentWorkspacePolicySchema = Type.Object(
  {
    locator: CanonicalAbsoluteLocatorSchema,
    repositoryIdentity: RepositoryIdentitySchema,
    contentAuthority: ContentAuthoritySchema,
    remoteName: RemoteNameSchema,
    remoteUrl: RemoteUrlSchema,
    refName: QualifiedHeadRefSchema,
    sourceCommit: GitCommitIdSchema,
    sourceTree: GitTreeIdSchema,
    releaseInputPath: ReleaseRelativePathSchema,
    pluginRoot: ReleaseRelativePathSchema,
  },
  { additionalProperties: false },
);

const StagedContentWorkspacePolicySchema = Type.Object(
  {
    locator: CanonicalAbsoluteLocatorSchema,
    repositoryIdentity: RepositoryIdentitySchema,
    contentAuthority: ContentAuthoritySchema,
    remoteName: RemoteNameSchema,
    remoteUrl: RemoteUrlSchema,
    refName: QualifiedHeadRefSchema,
    releaseInputPath: ReleaseRelativePathSchema,
    pluginRoot: ReleaseRelativePathSchema,
  },
  { additionalProperties: false },
);

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

const SourceEligibilityIssueSchema = Type.Object(
  {
    code: Type.Union([
      Type.Literal("AliasedLocator"),
      Type.Literal("WrongRepository"),
      Type.Literal("WrongRef"),
      Type.Literal("WrongCommit"),
      Type.Literal("WrongTree"),
      Type.Literal("DirtyTrackedWorktree"),
      Type.Literal("DirtyIndex"),
      Type.Literal("UntrackedConsumedPath"),
      Type.Literal("IgnoredConsumedPath"),
      Type.Literal("InvalidTree"),
      Type.Literal("MissingReleaseInput"),
      Type.Literal("ReleaseInputMismatch"),
      Type.Literal("PayloadMismatch"),
      Type.Literal("GitFailure"),
      Type.Literal("SourceChanged"),
    ]),
    detail: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

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

function isCanonicalAbsoluteLocator(value: string): boolean {
  if (
    value.length < 2
    || !value.startsWith("/")
    || value.endsWith("/")
    || value.includes("\\")
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) return false;
  return value.split("/").slice(1).every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function isCanonicalHeadRef(value: string): boolean {
  return value.startsWith("refs/heads/")
    && value.length <= 512
    && !/[\u0000-\u0020~^:?*\\[]/u.test(value)
    && !value.includes("..")
    && !value.includes("@{")
    && !value.endsWith("/")
    && !value.endsWith(".")
    && value.split("/").every((part) => part !== "" && !part.startsWith(".") && !part.endsWith(".lock"));
}
