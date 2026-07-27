import { NativeMarketplaceSourceSchema } from "@rawr/resource-native-agent-provider";
import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import { NonEmptyReadonlyArray } from "#agent-plugin-lifecycle-service/model/dto/structural";
import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  MAX_OWNERSHIP_CLAIMS,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  MAX_RELEASE_MEMBERS,
  type OwnershipIdentity,
  OwnershipIdentitySchema,
  PayloadDigestSchema,
  PayloadManifestEntrySchema,
  PluginIdSchema,
  ReleaseDigestSchema,
  ReleaseInputDigestSchema,
  ReleaseSetDigestSchema,
  RepositoryIdentitySchema,
} from "#agent-plugin-lifecycle-service/shared/release/index";

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

/**
 * Defines the complete provider-owned selection that status, test, and sync inspect or
 * converge without becoming a new source authority.
 */
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

function isCanonicalDistinctOrder(values: readonly string[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1]! >= values[index]!) return false;
  }
  return true;
}
