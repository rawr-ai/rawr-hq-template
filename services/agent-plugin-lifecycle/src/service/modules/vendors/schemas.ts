import { Type } from "typebox";

import type {
  VendorLockRecord,
  VendorProvenanceRecord,
  VendorRecordBinding,
  VendorSourceDeclaration,
  VendorStatusRequest,
  VendorStatusResult,
  VendorUpdateRequest,
  VendorUpdateResult,
} from "./ports";

export const GIT_OBJECT_ID_PATTERN = "^(?:[0-9a-f]{40}|[0-9a-f]{64})$";
export const SHA256_DIGEST_PATTERN = "^sha256_[0-9a-f]{64}$";
export const SOURCE_ID_PATTERN = "^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$";
export const PLUGIN_ID_PATTERN = "^[a-z0-9][a-z0-9._-]{0,127}$";
export const REPOSITORY_IDENTITY_PATTERN = "^[A-Za-z0-9][A-Za-z0-9._:@/+\\-]{0,511}$";
export const CONTENT_AUTHORITY_PATTERN = "^[a-z0-9][a-z0-9._-]{0,127}$";
export const QUALIFIED_HEAD_REF_PATTERN =
  "^refs/heads/(?![./])(?!.*(?:\\.\\.|@\\{|//|[~^:?*\\[\\]\\\\]))(?!.*[./]$)[A-Za-z0-9._/-]+$";
export const CANONICAL_ABSOLUTE_PATH_PATTERN =
  "^/(?!\\.\\.?$)(?!\\.\\.?/)(?!.*?/\\.\\.?(?:/|$))(?!.*//)(?!.*\\\\)[^/\\u0000]+(?:/[^/\\u0000]+)*$";
export const NORMALIZED_RELATIVE_PATH_PATTERN =
  "^(?!/)(?!-)(?!\\.\\.?$)(?!\\.\\.?/)(?!.*?/\\.\\.?(?:/|$))(?!.*//)(?!.*\\\\)[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$";
export const SUPPORTED_BASELINE_PATTERN = "^[^\\u0000-\\u001f\\u007f]+$";
export const STRICT_UTC_RFC3339_PATTERN =
  "^[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$";

const CanonicalAbsolutePathSchema = Type.String({
  minLength: 2,
  maxLength: 16_384,
  pattern: CANONICAL_ABSOLUTE_PATH_PATTERN,
});
const RepositoryIdentitySchema = Type.String({
  minLength: 1,
  maxLength: 512,
  pattern: REPOSITORY_IDENTITY_PATTERN,
});
const ContentAuthoritySchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: CONTENT_AUTHORITY_PATTERN,
});
const QualifiedHeadRefSchema = Type.String({
  minLength: "refs/heads/a".length,
  maxLength: 512,
  pattern: QUALIFIED_HEAD_REF_PATTERN,
});
export const NormalizedRelativePathSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
  pattern: NORMALIZED_RELATIVE_PATH_PATTERN,
});
const SourceIdSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: SOURCE_ID_PATTERN,
});
const GitObjectIdSchema = Type.String({ pattern: GIT_OBJECT_ID_PATTERN });
const Sha256DigestSchema = Type.String({ pattern: SHA256_DIGEST_PATTERN });
const PluginIdSchema = Type.String({ minLength: 1, maxLength: 128, pattern: PLUGIN_ID_PATTERN });
const PositiveCurationRevisionSchema = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
const SupportedBaselineSchema = Type.String({
  minLength: 1,
  maxLength: 4_096,
  pattern: SUPPORTED_BASELINE_PATTERN,
});
const StrictUtcRfc3339Schema = Type.String({
  minLength: "0000-00-00T00:00:00Z".length,
  maxLength: 40,
  pattern: STRICT_UTC_RFC3339_PATTERN,
});

const ContentWorkspaceSchema = Type.Object(
  {
    locator: CanonicalAbsolutePathSchema,
    repositoryIdentity: RepositoryIdentitySchema,
    contentAuthority: ContentAuthoritySchema,
    refName: QualifiedHeadRefSchema,
    sourceCommit: GitObjectIdSchema,
    sourceTree: GitObjectIdSchema,
    releaseInputPath: NormalizedRelativePathSchema,
  },
  { additionalProperties: false },
);

export const VendorSourceIdentitySchema = Type.Object(
  {
    repositoryIdentity: RepositoryIdentitySchema,
    refName: QualifiedHeadRefSchema,
    sourceCommit: GitObjectIdSchema,
    sourceTree: GitObjectIdSchema,
    payloadDigest: Sha256DigestSchema,
  },
  { additionalProperties: false },
);

export const VendorRecordBindingSchema = Type.Unsafe<VendorRecordBinding>(Type.Object(
  {
    id: NormalizedRelativePathSchema,
    protocol: Type.Union([
      Type.Literal("rawr-vendor-source@v1"),
      Type.Literal("rawr-vendor-provenance@v1"),
      Type.Literal("rawr-vendor-lock@v1"),
    ]),
    contentDigest: Sha256DigestSchema,
  },
  { additionalProperties: false },
));

export const VendorSourceDeclarationSchema = Type.Unsafe<VendorSourceDeclaration>(Type.Object(
  {
    schemaVersion: Type.Literal(1),
    sourceId: SourceIdSchema,
    policy: Type.Union([Type.Literal("tracked"), Type.Literal("held")]),
    repositoryIdentity: RepositoryIdentitySchema,
    refName: QualifiedHeadRefSchema,
    sourcePath: NormalizedRelativePathSchema,
    destinationPath: NormalizedRelativePathSchema,
    provenancePath: NormalizedRelativePathSchema,
    lockPath: NormalizedRelativePathSchema,
    curationRevision: PositiveCurationRevisionSchema,
    supportedBaseline: SupportedBaselineSchema,
  },
  { additionalProperties: false },
));

export const VendorLockRecordSchema = Type.Unsafe<VendorLockRecord>(Type.Object(
  {
    schemaVersion: Type.Literal(1),
    sourceId: SourceIdSchema,
    admitted: VendorSourceIdentitySchema,
  },
  { additionalProperties: false },
));

export const VendorProvenanceRecordSchema = Type.Unsafe<VendorProvenanceRecord>(Type.Object(
  {
    schemaVersion: Type.Literal(1),
    sourceId: SourceIdSchema,
    admitted: VendorSourceIdentitySchema,
    importedPayloadDigest: Sha256DigestSchema,
    curationRevision: PositiveCurationRevisionSchema,
    supportedBaseline: SupportedBaselineSchema,
    observedLatest: VendorSourceIdentitySchema,
    observedAt: StrictUtcRfc3339Schema,
    disposition: Type.Union([
      Type.Literal("admitted"),
      Type.Literal("held"),
      Type.Literal("review-required"),
    ]),
  },
  { additionalProperties: false },
));

export const VendorMemberBindingContextSchema = Type.Object(
  {
    memberPluginId: PluginIdSchema,
    declaration: VendorRecordBindingSchema,
    provenance: VendorRecordBindingSchema,
  },
  { additionalProperties: false },
);

export const VendorStatusInputSchema = Type.Unsafe<VendorStatusRequest>(Type.Object(
  { contentWorkspace: ContentWorkspaceSchema },
  { additionalProperties: false },
));

export const VendorUpdateInputSchema = Type.Unsafe<VendorUpdateRequest>(Type.Object(
  {
    contentWorkspace: ContentWorkspaceSchema,
    sourceIds: Type.Array(SourceIdSchema, { minItems: 1, maxItems: 16_384, uniqueItems: true }),
  },
  { additionalProperties: false },
));

const VendorSourceStatusSchema = Type.Object(
  {
    sourceId: SourceIdSchema,
    classification: Type.Union([
      Type.Literal("Current"),
      Type.Literal("UpdateAvailable"),
      Type.Literal("Held"),
      Type.Literal("Diverged"),
      Type.Literal("Invalid"),
      Type.Literal("Unavailable"),
    ]),
    admitted: Type.Union([VendorSourceIdentitySchema, Type.Null()]),
    observed: Type.Union([VendorSourceIdentitySchema, Type.Null()]),
    detail: Type.Optional(Type.String({ minLength: 1, maxLength: 4_096 })),
  },
  { additionalProperties: false },
);

const VendorUpdateIssueSchema = Type.Object(
  {
    code: Type.Union([
      Type.Literal("UndeclaredSource"),
      Type.Literal("HeldSource"),
      Type.Literal("WrongRepository"),
      Type.Literal("WrongRef"),
      Type.Literal("NonFastForward"),
      Type.Literal("UnsupportedLayout"),
      Type.Literal("PayloadMismatch"),
      Type.Literal("LocalDrift"),
      Type.Literal("AuthoringFailed"),
      Type.Literal("RestorationFailed"),
      Type.Literal("CleanupFailed"),
      Type.Literal("RuntimeFailure"),
    ]),
    detail: Type.String({ minLength: 1, maxLength: 4_096 }),
    sourceId: Type.Optional(SourceIdSchema),
  },
  { additionalProperties: false },
);

export const VendorStatusResultSchema = Type.Unsafe<VendorStatusResult>(Type.Union([
  Type.Object(
    {
      kind: Type.Literal("VendorStatus"),
      sources: Type.Array(VendorSourceStatusSchema, { maxItems: 16_384 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("Rejected"),
      issues: Type.Array(VendorUpdateIssueSchema, { minItems: 1, maxItems: 16_384 }),
    },
    { additionalProperties: false },
  ),
]));

export const VendorUpdateResultSchema = Type.Unsafe<VendorUpdateResult>(Type.Union([
  Type.Object(
    {
      kind: Type.Literal("ReadOnlyConverged"),
      sourceIds: Type.Array(SourceIdSchema, { maxItems: 16_384 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("AuthoredReviewableChanges"),
      sourceIds: Type.Array(SourceIdSchema, { maxItems: 16_384 }),
      changedPaths: Type.Array(NormalizedRelativePathSchema, { maxItems: 200_000, uniqueItems: true }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("Rejected"),
      sourceIds: Type.Array(SourceIdSchema, { maxItems: 16_384 }),
      issues: Type.Array(VendorUpdateIssueSchema, { minItems: 1, maxItems: 16_384 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("FailedRestored"),
      sourceIds: Type.Array(SourceIdSchema, { maxItems: 16_384 }),
      restoredPaths: Type.Array(NormalizedRelativePathSchema, { maxItems: 200_000, uniqueItems: true }),
      issues: Type.Array(VendorUpdateIssueSchema, { minItems: 1, maxItems: 16_384 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      kind: Type.Literal("RestorationFailed"),
      sourceIds: Type.Array(SourceIdSchema, { maxItems: 16_384 }),
      unsettledPaths: Type.Array(NormalizedRelativePathSchema, {
        minItems: 1,
        maxItems: 200_000,
        uniqueItems: true,
      }),
      issues: Type.Array(VendorUpdateIssueSchema, { minItems: 1, maxItems: 16_384 }),
    },
    { additionalProperties: false },
  ),
]));
