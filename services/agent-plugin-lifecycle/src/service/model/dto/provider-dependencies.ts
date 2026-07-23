import {
  NativeAgentProviderIdSchema,
  NativeMarketplaceSourceSchema,
} from "@rawr/resource-native-agent-provider";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import {
  CanonicalChannelSelectionSchema,
  CurrentMainSelectionLocatorSchema,
} from "./current-main-selection";
import {
  CanonicalAbsoluteLocatorSchema,
  ContentAuthoritySchema,
  ContentWorkspacePolicySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "./releases/content-workspace";
import { NonEmptyReadonlyArray } from "./structural";
import {
  type OwnershipIdentity,
  type PayloadDigest,
  PayloadManifestEntrySchema,
  type ReleaseDigest,
  type ReleaseInputDigest,
  MAX_RELEASE_MEMBERS,
  MAX_OWNERSHIP_CLAIMS,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  type ReleaseSetDigest,
  parseOwnershipIdentity,
} from "../../shared/release";

const MAX_SELECTED_ISSUES = 256;
const MAX_SELECTED_ISSUE_DETAIL = 4_096;

const OwnershipIdentitySchema = Type.Unsafe<OwnershipIdentity>(
  Refine(
    Type.String({
      minLength: 1,
      maxLength: 512,
      pattern: "^[a-z0-9@][a-z0-9@._:/-]*$",
    }),
    (value) => parseOwnershipIdentity(value).ok,
    () => "Expected a canonical ownership identity"
  )
);
const PayloadDigestSchema = Type.Unsafe<PayloadDigest>(
  Type.String({ pattern: "^pd1_[0-9a-f]{64}$" })
);
const ReleaseDigestSchema = Type.Unsafe<ReleaseDigest>(
  Type.String({ pattern: "^rd1_[0-9a-f]{64}$" })
);
export const ReleaseInputDigestSchema = Type.Unsafe<ReleaseInputDigest>(
  Type.String({ pattern: "^ri1_[0-9a-f]{64}$" })
);
export const ReleaseSetDigestSchema = Type.Unsafe<ReleaseSetDigest>(
  Type.String({ pattern: "^rs1_[0-9a-f]{64}$" })
);
const MarketplaceIdentitySchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: "^[a-z0-9][a-z0-9_-]*$",
});

export const SelectedContentFileSchema = PayloadManifestEntrySchema;

export const SelectedContentMemberSchema = Refine(
  ReadonlyObject(
    Type.Object({
      pluginId: PluginIdSchema,
      aliases: Type.Unsafe<readonly OwnershipIdentity[]>(
        Type.Array(OwnershipIdentitySchema, { maxItems: MAX_OWNERSHIP_CLAIMS })
      ),
      payloadDigest: PayloadDigestSchema,
      releaseDigest: ReleaseDigestSchema,
      manifest: Type.Unsafe<readonly Static<typeof SelectedContentFileSchema>[]>(
        Type.Array(SelectedContentFileSchema, {
          minItems: 1,
          maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
        })
      ),
    }),
    { additionalProperties: false }
  ),
  (member) =>
    isCanonicalDistinctOrder(member.aliases) &&
    isCanonicalDistinctOrder(member.manifest.map((file) => file.path)),
  () => "Selected aliases and manifest paths must be distinct and canonically ordered"
);

const selectedContentProperties = {
  contentAuthority: ContentAuthoritySchema,
  repositoryIdentity: RepositoryIdentitySchema,
  sourceCommit: GitCommitIdSchema,
  sourceTree: GitTreeIdSchema,
  releaseInputDigest: ReleaseInputDigestSchema,
  marketplace: ReadonlyObject(
    Type.Object({
      identity: MarketplaceIdentitySchema,
      source: NativeMarketplaceSourceSchema,
    }),
    { additionalProperties: false }
  ),
  members: Type.Unsafe<readonly Static<typeof SelectedContentMemberSchema>[]>(
    Type.Array(SelectedContentMemberSchema, {
      minItems: 1,
      maxItems: MAX_RELEASE_MEMBERS,
    })
  ),
};

const SelectedContentStructuralSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      ...selectedContentProperties,
      selectionKind: Type.Literal("targeted"),
      releaseSetDigest: Type.Null(),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      ...selectedContentProperties,
      selectionKind: Type.Literal("complete-set"),
      releaseSetDigest: ReleaseSetDigestSchema,
    }),
    { additionalProperties: false }
  ),
]);

export const SelectedContentSchema = Refine(
  SelectedContentStructuralSchema,
  (content) =>
    (content.marketplace.source.kind !== "git" ||
      content.marketplace.source.revision === content.sourceCommit) &&
    isCanonicalDistinctOrder(content.members.map((member) => member.pluginId)) &&
    content.members.reduce((total, member) => total + member.aliases.length, 0) <=
      MAX_OWNERSHIP_CLAIMS,
  () =>
    "Selected members must be canonically ordered, ownership-bounded, and pin the selected Git commit"
);

export const SelectedContentTestModeSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("targeted"),
      pluginIds: NonEmptyReadonlyArray(PluginIdSchema, { maxItems: MAX_RELEASE_MEMBERS }),
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(Type.Object({ kind: Type.Literal("complete-set") }), {
    additionalProperties: false,
  }),
]);

export const SelectedContentIssueCodeSchema = Type.Union([
  Type.Literal("SourceIneligible"),
  Type.Literal("SourceReadFailed"),
  Type.Literal("ReleaseConstructionFailed"),
  Type.Literal("SelectionMismatch"),
]);

export const SelectedContentIssueSchema = ReadonlyObject(
  Type.Object({
    code: SelectedContentIssueCodeSchema,
    detail: Type.String({ minLength: 1, maxLength: MAX_SELECTED_ISSUE_DETAIL }),
  }),
  { additionalProperties: false }
);

export const SelectedContentResolutionSchema = Type.Union([
  ReadonlyObject(
    Type.Object({ kind: Type.Literal("Selected"), content: SelectedContentSchema }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("Rejected"),
      issues: NonEmptyReadonlyArray(SelectedContentIssueSchema, {
        maxItems: MAX_SELECTED_ISSUES,
      }),
    }),
    { additionalProperties: false }
  ),
]);

export const SelectedContentWorkspaceResolutionInputSchema = ReadonlyObject(
  Type.Object({
    contentWorkspace: ContentWorkspacePolicySchema,
    mode: SelectedContentTestModeSchema,
  }),
  { additionalProperties: false }
);

export const SelectedContentChannelResolutionInputSchema = ReadonlyObject(
  Type.Object({
    locator: CurrentMainSelectionLocatorSchema,
    selection: CanonicalChannelSelectionSchema,
  }),
  { additionalProperties: false }
);

export const NativeProviderSessionTargetSchema = ReadonlyObject(
  Type.Object({
    provider: NativeAgentProviderIdSchema,
    home: CanonicalAbsoluteLocatorSchema,
  }),
  { additionalProperties: false }
);

export const NativeProviderSessionObservationSchema = ReadonlyObject(
  Type.Object({
    provider: NativeAgentProviderIdSchema,
    executablePath: CanonicalAbsoluteLocatorSchema,
    home: CanonicalAbsoluteLocatorSchema,
  }),
  { additionalProperties: false }
);

export type SelectedContentFile = Static<typeof SelectedContentFileSchema>;
export type SelectedContentMember = Static<typeof SelectedContentMemberSchema>;
export type SelectedContent = Static<typeof SelectedContentSchema>;
export type SelectedContentTestMode = Static<typeof SelectedContentTestModeSchema>;
export type SelectedContentIssueCode = Static<typeof SelectedContentIssueCodeSchema>;
export type SelectedContentIssue = Static<typeof SelectedContentIssueSchema>;
export type SelectedContentResolution = Static<typeof SelectedContentResolutionSchema>;
export type SelectedContentWorkspaceResolutionInput = Static<
  typeof SelectedContentWorkspaceResolutionInputSchema
>;
export type SelectedContentChannelResolutionInput = Static<
  typeof SelectedContentChannelResolutionInputSchema
>;
export type NativeProviderSessionTarget = Static<typeof NativeProviderSessionTargetSchema>;
export type NativeProviderSessionObservation = Static<
  typeof NativeProviderSessionObservationSchema
>;

function isCanonicalDistinctOrder(values: readonly string[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) return false;
  }
  return true;
}
