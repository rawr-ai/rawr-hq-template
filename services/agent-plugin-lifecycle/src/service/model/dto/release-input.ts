import { ReadonlyObject, type Static, Type } from "typebox";
import {
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  PAYLOAD_PROTOCOL_VERSION,
  PayloadManifestEntrySchema,
} from "./agent-plugin-payload";
import {
  DeclaredOwnershipClaimsSchema,
  type DistributionOwnershipIndex,
  DistributionOwnershipIndexRecordSchema,
} from "./distribution-ownership";
import {
  ContentDigestSchema,
  PayloadDigestSchema,
  ReleaseInputDigestSchema,
} from "./release-digest";
import {
  ContentAuthoritySchema,
  OwnershipIdentitySchema,
  PluginIdSchema,
  ReleaseRelativePathSchema,
} from "./release-identity";

declare const agentPluginReleaseInputBrand: unique symbol;
declare const completenessWitnessBrand: unique symbol;

/** Identifies the release-input envelope schema admitted by lifecycle policy. */
export const RELEASE_INPUT_SCHEMA_VERSION = 1 as const;

/** Bounds the curated member inventory admitted by one release input. */
export const MAX_RELEASE_MEMBERS = 1_024;

/** Bounds canonical release-input bytes before decoding or operation dispatch. */
export const MAX_RELEASE_INPUT_ENVELOPE_BYTES = 96 * 1024 * 1024;

/** Bounds provenance records before identity and ordering policy runs. */
export const MAX_PROVENANCE_BINDINGS = 16_384;

const MAX_PROVENANCE_PROTOCOL_LENGTH = 512;

const ProvenanceProtocolSchema = Type.String({
  minLength: 1,
  maxLength: MAX_PROVENANCE_PROTOCOL_LENGTH,
  pattern: "^[a-z0-9][a-z0-9._:@/-]*$",
});

/** Defines one immutable provenance binding declared by a release input. */
export const ProvenanceBindingSchema = ReadonlyObject(
  Type.Object({
    id: OwnershipIdentitySchema,
    protocol: ProvenanceProtocolSchema,
    contentDigest: ContentDigestSchema,
  }),
  { additionalProperties: false }
);

/** Defines the canonical payload identity and manifest declared for one member. */
export const DeclaredPayloadSchema = ReadonlyObject(
  Type.Object({
    protocolVersion: Type.Literal(PAYLOAD_PROTOCOL_VERSION),
    manifest: ReadonlyObject(Type.Array(PayloadManifestEntrySchema), {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
    payloadDigest: PayloadDigestSchema,
  }),
  { additionalProperties: false }
);

/** Defines one skill identity and manifest path declared by a release member. */
export const SkillInventoryEntrySchema = ReadonlyObject(
  Type.Object({
    identity: OwnershipIdentitySchema,
    manifestPath: ReleaseRelativePathSchema,
  }),
  { additionalProperties: false }
);

/** Defines one closed agent-plugin member declaration in a release input. */
export const ReleaseMemberDeclarationSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("agent-plugin"),
    pluginId: PluginIdSchema,
    skillInventory: ReadonlyObject(Type.Array(SkillInventoryEntrySchema), {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    }),
    payload: DeclaredPayloadSchema,
    vendor: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
    }),
    curation: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
    }),
  }),
  { additionalProperties: false }
);

/** Defines the complete reviewed source declarations that form release input identity. */
export const ReleaseInputBodySchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(RELEASE_INPUT_SCHEMA_VERSION),
    contentAuthority: ContentAuthoritySchema,
    members: ReadonlyObject(Type.Array(ReleaseMemberDeclarationSchema), {
      minItems: 1,
      maxItems: MAX_RELEASE_MEMBERS,
    }),
    ownershipClaims: DeclaredOwnershipClaimsSchema,
    locks: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
    }),
    qualityPolicies: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
    }),
  }),
  { additionalProperties: false }
);

/** Defines the persisted release-input envelope and its claimed canonical digest. */
export const ReleaseInputEnvelopeSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(RELEASE_INPUT_SCHEMA_VERSION),
    releaseInputDigest: ReleaseInputDigestSchema,
    body: ReleaseInputBodySchema,
  }),
  { additionalProperties: false }
);

/** Defines one member and payload that a complete release set must cover. */
export const ExpectedReleaseMemberSchema = ReadonlyObject(
  Type.Object({
    pluginId: PluginIdSchema,
    payloadDigest: PayloadDigestSchema,
  }),
  { additionalProperties: false }
);

/** Defines the closed persisted structure of a release-input completeness witness. */
export const CompletenessWitnessRecordSchema = ReadonlyObject(
  Type.Object({
    releaseInputDigest: ReleaseInputDigestSchema,
    expectedMembers: ReadonlyObject(Type.Array(ExpectedReleaseMemberSchema), {
      maxItems: MAX_RELEASE_MEMBERS,
    }),
    ownershipIndex: DistributionOwnershipIndexRecordSchema,
  }),
  { additionalProperties: false }
);

/**
 * Defines the closed in-memory release input admitted before wire projection.
 *
 * Ownership and completeness are derived observations, not wire fields, but
 * they remain structurally closed whenever an admitted value is reused.
 */
export const AgentPluginReleaseInputSchema = ReadonlyObject(
  Type.Object({
    ...ReleaseInputEnvelopeSchema.properties,
    ownershipIndex: DistributionOwnershipIndexRecordSchema,
    completenessWitness: CompletenessWitnessRecordSchema,
  }),
  { additionalProperties: false }
);

/** TypeBox-derived immutable provenance binding. */
export type ProvenanceBinding = Static<typeof ProvenanceBindingSchema>;

/** TypeBox-derived payload declaration carried by one release member. */
export type DeclaredPayload = Static<typeof DeclaredPayloadSchema>;

/** TypeBox-derived skill inventory declaration carried by one release member. */
export type SkillInventoryEntry = Static<typeof SkillInventoryEntrySchema>;

/** TypeBox-derived closed release member declaration. */
export type ReleaseMemberDeclaration = Static<typeof ReleaseMemberDeclarationSchema>;

/** TypeBox-derived complete release-input body. */
export type ReleaseInputBody = Static<typeof ReleaseInputBodySchema>;

/** TypeBox-derived persisted release-input envelope. */
export type ReleaseInputEnvelope = Static<typeof ReleaseInputEnvelopeSchema>;

/** TypeBox-derived member and payload expected in one complete release set. */
export type ExpectedReleaseMember = Static<typeof ExpectedReleaseMemberSchema>;

/** TypeBox-derived wire record for a persisted completeness witness. */
type CompletenessWitnessRecord = Static<typeof CompletenessWitnessRecordSchema>;

/** Binds the expected member set and ownership index to one release-input digest. */
export type CompletenessWitness = CompletenessWitnessRecord &
  Readonly<{
    ownershipIndex: DistributionOwnershipIndex;
    [completenessWitnessBrand]: "CompletenessWitness";
  }>;

/** Branded release input admitted by release-input policy. */
export type AgentPluginReleaseInput = Static<typeof AgentPluginReleaseInputSchema> &
  Readonly<{
    ownershipIndex: DistributionOwnershipIndex;
    completenessWitness: CompletenessWitness;
    [agentPluginReleaseInputBrand]: "AgentPluginReleaseInput";
  }>;
