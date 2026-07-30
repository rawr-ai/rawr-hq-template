import { ReadonlyObject, type Static, Type } from "typebox";
import {
  AgentPluginReleaseEnvelopeSchema,
  AgentPluginReleaseSchema,
  BUILDER_PROTOCOL_VERSION,
} from "./agent-plugin-release";
import {
  type DistributionOwnershipIndex,
  DistributionOwnershipIndexRecordSchema,
} from "./distribution-ownership";
import {
  ReleaseDigestSchema,
  ReleaseInputDigestSchema,
  ReleaseSetDigestSchema,
} from "./release-digest";
import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "./release-identity";
import {
  AgentPluginReleaseInputSchema,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  ReleaseInputEnvelopeSchema,
} from "./release-input";
import { NonEmptyReadonlyArray } from "./structural";

declare const agentPluginReleaseSetBrand: unique symbol;

/** Identifies the complete release-set schema admitted by lifecycle policy. */
export const AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION = 1 as const;

/** Bounds one canonical complete release-set envelope before decoding. */
export const MAX_AGENT_PLUGIN_RELEASE_SET_ENVELOPE_BYTES = MAX_RELEASE_INPUT_ENVELOPE_BYTES;

/** Defines one plugin release identity carried by a complete release set. */
export const AgentPluginReleaseSetMemberSchema = ReadonlyObject(
  Type.Object({
    pluginId: PluginIdSchema,
    releaseDigest: ReleaseDigestSchema,
  }),
  { additionalProperties: false }
);

/**
 * Defines the exact construction boundary accepted by complete-set policy.
 *
 * Embedded inputs and releases may be admitted in-memory values or canonical
 * wire records; policy re-verifies either form before deriving the set.
 */
export const AgentPluginReleaseSetConstructionSchema = ReadonlyObject(
  Type.Object({
    releaseInput: Type.Union([AgentPluginReleaseInputSchema, ReleaseInputEnvelopeSchema]),
    releases: ReadonlyObject(
      Type.Array(Type.Union([AgentPluginReleaseSchema, AgentPluginReleaseEnvelopeSchema]), {
        maxItems: MAX_RELEASE_MEMBERS,
        description: "Complete release values that must exactly realize the reviewed input.",
      })
    ),
  }),
  { additionalProperties: false }
);

/** Defines the digest-free complete-set body shared across lifecycle capability modules. */
export const AgentPluginReleaseSetBodySchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION, {
      description: "Schema version governing the canonical release-set body.",
    }),
    builderProtocolVersion: Type.Literal(BUILDER_PROTOCOL_VERSION, {
      description: "Builder protocol that derived this complete release set.",
    }),
    contentAuthority: ContentAuthoritySchema,
    sourceRepository: RepositoryIdentitySchema,
    sourceCommit: GitCommitIdSchema,
    sourceTree: GitTreeIdSchema,
    releaseInputDigest: ReleaseInputDigestSchema,
    ownershipIndex: DistributionOwnershipIndexRecordSchema,
    members: NonEmptyReadonlyArray(AgentPluginReleaseSetMemberSchema, {
      maxItems: MAX_RELEASE_MEMBERS,
      description: "Canonical ordered release identities that completely realize the input.",
    }),
  }),
  { additionalProperties: false }
);

/**
 * Defines the one closed in-memory and wire shape for a complete release set.
 *
 * The set digest verifies the canonical body; it is not a storage address,
 * lookup handle, or provider identity.
 */
export const AgentPluginReleaseSetSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(AGENT_PLUGIN_RELEASE_SET_SCHEMA_VERSION, {
      description: "Schema version governing the canonical release-set envelope.",
    }),
    releaseSetDigest: ReleaseSetDigestSchema,
    body: AgentPluginReleaseSetBodySchema,
  }),
  { additionalProperties: false }
);

/** TypeBox-derived member identity carried by one complete release set. */
export type AgentPluginReleaseSetMember = Static<typeof AgentPluginReleaseSetMemberSchema>;

/** TypeBox-derived construction input accepted by complete-set policy. */
export type AgentPluginReleaseSetConstruction = Static<
  typeof AgentPluginReleaseSetConstructionSchema
>;

/** TypeBox-derived digest-free complete-set body. */
export type AgentPluginReleaseSetBody = Static<typeof AgentPluginReleaseSetBodySchema>;

/** Branded complete set admitted by release-set policy. */
export type AgentPluginReleaseSet = Static<typeof AgentPluginReleaseSetSchema> &
  Readonly<{
    body: AgentPluginReleaseSetBody &
      Readonly<{
        ownershipIndex: DistributionOwnershipIndex;
      }>;
    [agentPluginReleaseSetBrand]: "AgentPluginReleaseSet";
  }>;
