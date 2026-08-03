import { NativeMarketplaceSourceSchema } from "@habitat-ai/rawr-resource-native-agent-provider";
import { ReadonlyObject, type Static, Type } from "typebox";

import {
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  PayloadManifestEntrySchema,
} from "../../../../model/dto/agent-plugin-payload";
import { MAX_OWNERSHIP_CLAIMS } from "../../../../model/dto/distribution-ownership";
import {
  PayloadDigestSchema,
  ReleaseDigestSchema,
  ReleaseInputDigestSchema,
  ReleaseSetDigestSchema,
} from "../../../../model/dto/release-digest";
import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  OwnershipIdentitySchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "../../../../model/dto/release-identity";
import { MAX_RELEASE_MEMBERS } from "../../../../model/dto/release-input";
import { NonEmptyReadonlyArray } from "../../../../model/dto/structural";

const MAX_SELECTED_ISSUES = 256;
const MAX_SELECTED_ISSUE_DETAIL = 4_096;

const MarketplaceIdentitySchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: "^[a-z0-9][a-z0-9_-]*$",
});

/** Describes one payload file whose exact bytes a provider operation must verify. */
export const SelectedContentFileSchema = PayloadManifestEntrySchema;

/**
 * Describes one selected plugin and the immutable ownership and payload facts used during
 * provider convergence.
 */
export const SelectedContentMemberSchema = ReadonlyObject(
  Type.Object({
    pluginId: PluginIdSchema,
    aliases: ReadonlyObject(Type.Array(OwnershipIdentitySchema), {
      maxItems: MAX_OWNERSHIP_CLAIMS,
      uniqueItems: true,
    }),
    payloadDigest: PayloadDigestSchema,
    releaseDigest: ReleaseDigestSchema,
    manifest: ReadonlyObject(Type.Array(SelectedContentFileSchema), {
      minItems: 1,
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
      uniqueItems: true,
    }),
  }),
  { additionalProperties: false }
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
  members: ReadonlyObject(Type.Array(SelectedContentMemberSchema), {
    minItems: 1,
    maxItems: MAX_RELEASE_MEMBERS,
    uniqueItems: true,
  }),
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

/**
 * Defines the complete provider-owned selection that status, test, and sync inspect or
 * converge without becoming a new source authority.
 */
export const SelectedContentSchema = SelectedContentStructuralSchema;

/** Classifies provider-selection failures without leaking resource implementation details. */
export const SelectedContentIssueCodeSchema = Type.Union([
  Type.Literal("SourceIneligible"),
  Type.Literal("SourceReadFailed"),
  Type.Literal("ReleaseConstructionFailed"),
  Type.Literal("SelectionMismatch"),
]);

/** Carries one bounded provider-selection failure to the owning provider operation. */
export const SelectedContentIssueSchema = ReadonlyObject(
  Type.Object({
    code: SelectedContentIssueCodeSchema,
    detail: Type.String({ minLength: 1, maxLength: MAX_SELECTED_ISSUE_DETAIL }),
  }),
  { additionalProperties: false }
);

/** Models the only terminal outcomes of resolving provider-selected content. */
export const SelectedContentResolutionSchema = Type.Union([
  ReadonlyObject(Type.Object({ kind: Type.Literal("Selected"), content: SelectedContentSchema }), {
    additionalProperties: false,
  }),
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

/** One exact file expected in a selected provider plugin payload. */
export type SelectedContentFile = Static<typeof SelectedContentFileSchema>;

/** One selected plugin together with its ownership names and exact payload manifest. */
export type SelectedContentMember = Static<typeof SelectedContentMemberSchema>;

/** Invocation-local desired content used only by provider status, test, and sync. */
export type SelectedContent = Static<typeof SelectedContentSchema>;

/** Stable classification for a provider-selected-content resolution failure. */
export type SelectedContentIssueCode = Static<typeof SelectedContentIssueCodeSchema>;

/** Bounded diagnostic returned when provider-selected content cannot be resolved. */
export type SelectedContentIssue = Static<typeof SelectedContentIssueSchema>;

/** Selected provider content or the exact reasons selection was refused. */
export type SelectedContentResolution = Static<typeof SelectedContentResolutionSchema>;
