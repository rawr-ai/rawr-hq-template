import { ReadonlyObject, type Static, Type } from "typebox";

import { NonEmptyReadonlyArray } from "../../../../model/dto/structural";
import {
  CanonicalAbsolutePathSchema,
  ContentAuthoritySchema,
  GitObjectIdSchema,
  NormalizedRelativePathSchema,
  QualifiedHeadRefSchema,
  RepositoryIdentitySchema,
  SourceIdSchema,
  VendorSourceIdentitySchema,
} from "./vendor-records";

const MAX_VENDOR_SOURCES = 16_384;
const MAX_VENDOR_PATHS = 200_000;
const MAX_PUBLIC_ISSUE_DETAIL_LENGTH = 4_096;

const ReadonlyVendorSourceIdentitySchema = ReadonlyObject(VendorSourceIdentitySchema, {
  additionalProperties: false,
});

export const VendorContentWorkspaceRefSchema = ReadonlyObject(
  Type.Object({
    locator: CanonicalAbsolutePathSchema,
    repositoryIdentity: RepositoryIdentitySchema,
    contentAuthority: ContentAuthoritySchema,
    refName: QualifiedHeadRefSchema,
    sourceCommit: GitObjectIdSchema,
    sourceTree: GitObjectIdSchema,
    releaseInputPath: NormalizedRelativePathSchema,
  }),
  { additionalProperties: false }
);

export const VendorStatusInputSchema = ReadonlyObject(
  Type.Object({ contentWorkspace: VendorContentWorkspaceRefSchema }),
  { additionalProperties: false }
);

export const VendorUpdateInputSchema = ReadonlyObject(
  Type.Object({
    contentWorkspace: VendorContentWorkspaceRefSchema,
    sourceIds: ReadonlyObject(Type.Array(SourceIdSchema), {
      minItems: 1,
      maxItems: MAX_VENDOR_SOURCES,
      uniqueItems: true,
    }),
  }),
  { additionalProperties: false }
);

export const VendorSourceStatusSchema = ReadonlyObject(
  Type.Object({
    sourceId: SourceIdSchema,
    classification: Type.Union([
      Type.Literal("Current"),
      Type.Literal("UpdateAvailable"),
      Type.Literal("Held"),
      Type.Literal("Diverged"),
      Type.Literal("Invalid"),
      Type.Literal("Unavailable"),
    ]),
    admitted: Type.Union([ReadonlyVendorSourceIdentitySchema, Type.Null()]),
    observed: Type.Union([ReadonlyVendorSourceIdentitySchema, Type.Null()]),
    detail: Type.Optional(Type.String({ minLength: 1, maxLength: MAX_PUBLIC_ISSUE_DETAIL_LENGTH })),
  }),
  { additionalProperties: false }
);

export const VendorUpdateIssueSchema = ReadonlyObject(
  Type.Object({
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
    detail: Type.String({ minLength: 1, maxLength: MAX_PUBLIC_ISSUE_DETAIL_LENGTH }),
    sourceId: Type.Optional(SourceIdSchema),
  }),
  { additionalProperties: false }
);

export const VendorStatusResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("VendorStatus"),
      sources: ReadonlyObject(Type.Array(VendorSourceStatusSchema), {
        maxItems: MAX_VENDOR_SOURCES,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("Rejected"),
      issues: NonEmptyReadonlyArray(VendorUpdateIssueSchema, {
        maxItems: MAX_VENDOR_SOURCES,
      }),
    }),
    { additionalProperties: false }
  ),
]);

export const VendorUpdateResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("ReadOnlyConverged"),
      sourceIds: ReadonlyObject(Type.Array(SourceIdSchema), {
        maxItems: MAX_VENDOR_SOURCES,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("AuthoredReviewableChanges"),
      sourceIds: ReadonlyObject(Type.Array(SourceIdSchema), {
        maxItems: MAX_VENDOR_SOURCES,
      }),
      changedPaths: ReadonlyObject(Type.Array(NormalizedRelativePathSchema), {
        maxItems: MAX_VENDOR_PATHS,
        uniqueItems: true,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("Rejected"),
      sourceIds: ReadonlyObject(Type.Array(SourceIdSchema), {
        maxItems: MAX_VENDOR_SOURCES,
      }),
      issues: NonEmptyReadonlyArray(VendorUpdateIssueSchema, {
        maxItems: MAX_VENDOR_SOURCES,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("FailedRestored"),
      sourceIds: ReadonlyObject(Type.Array(SourceIdSchema), {
        maxItems: MAX_VENDOR_SOURCES,
      }),
      restoredPaths: ReadonlyObject(Type.Array(NormalizedRelativePathSchema), {
        maxItems: MAX_VENDOR_PATHS,
        uniqueItems: true,
      }),
      issues: NonEmptyReadonlyArray(VendorUpdateIssueSchema, {
        maxItems: MAX_VENDOR_SOURCES,
      }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("RestorationFailed"),
      sourceIds: ReadonlyObject(Type.Array(SourceIdSchema), {
        maxItems: MAX_VENDOR_SOURCES,
      }),
      unsettledPaths: ReadonlyObject(Type.Array(NormalizedRelativePathSchema), {
        minItems: 1,
        maxItems: MAX_VENDOR_PATHS,
        uniqueItems: true,
      }),
      issues: NonEmptyReadonlyArray(VendorUpdateIssueSchema, {
        maxItems: MAX_VENDOR_SOURCES,
      }),
    }),
    { additionalProperties: false }
  ),
]);

export type VendorContentWorkspaceRef = Static<typeof VendorContentWorkspaceRefSchema>;
export type VendorStatusRequest = Static<typeof VendorStatusInputSchema>;
export type VendorUpdateRequest = Static<typeof VendorUpdateInputSchema>;
export type VendorSourceStatus = Static<typeof VendorSourceStatusSchema>;
export type VendorUpdateIssue = Static<typeof VendorUpdateIssueSchema>;
export type VendorStatusResult = Static<typeof VendorStatusResultSchema>;
export type VendorUpdateResult = Static<typeof VendorUpdateResultSchema>;
