import { Type } from "typebox";

import type {
  VendorStatusRequest,
  VendorStatusResult,
  VendorUpdateRequest,
  VendorUpdateResult,
} from "./ports";
import {
  CANONICAL_ABSOLUTE_PATH_PATTERN,
  CONTENT_AUTHORITY_PATTERN,
  CanonicalAbsolutePathSchema,
  ContentAuthoritySchema,
  GIT_OBJECT_ID_PATTERN,
  GitObjectIdSchema,
  NORMALIZED_RELATIVE_PATH_PATTERN,
  NormalizedRelativePathSchema,
  PLUGIN_ID_PATTERN,
  PluginIdSchema,
  QUALIFIED_HEAD_REF_PATTERN,
  QualifiedHeadRefSchema,
  REPOSITORY_IDENTITY_PATTERN,
  RepositoryIdentitySchema,
  SHA256_DIGEST_PATTERN,
  SOURCE_ID_PATTERN,
  SourceIdSchema,
  SUPPORTED_BASELINE_PATTERN,
  STRICT_UTC_RFC3339_PATTERN,
  VendorLockRecordSchema,
  VendorProvenanceRecordSchema,
  VendorRecordBindingSchema,
  VendorSourceDeclarationSchema,
  VendorSourceIdentitySchema,
} from "./model/dto/vendor-records";

export {
  CANONICAL_ABSOLUTE_PATH_PATTERN,
  CONTENT_AUTHORITY_PATTERN,
  GIT_OBJECT_ID_PATTERN,
  NORMALIZED_RELATIVE_PATH_PATTERN,
  NormalizedRelativePathSchema,
  PLUGIN_ID_PATTERN,
  QUALIFIED_HEAD_REF_PATTERN,
  REPOSITORY_IDENTITY_PATTERN,
  SHA256_DIGEST_PATTERN,
  SOURCE_ID_PATTERN,
  SUPPORTED_BASELINE_PATTERN,
  STRICT_UTC_RFC3339_PATTERN,
  VendorLockRecordSchema,
  VendorProvenanceRecordSchema,
  VendorRecordBindingSchema,
  VendorSourceDeclarationSchema,
  VendorSourceIdentitySchema,
} from "./model/dto/vendor-records";

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
