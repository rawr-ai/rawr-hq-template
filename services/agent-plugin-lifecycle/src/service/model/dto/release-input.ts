import { ReadonlyObject, type Static, Type } from "typebox";
import {
  ContentAuthoritySchema,
  ContentDigestSchema,
  MAX_CANONICAL_ID_BYTES,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  MAX_PROVENANCE_BINDINGS,
  MAX_RELEASE_MEMBERS,
  OwnershipIdentitySchema,
  PAYLOAD_PROTOCOL_VERSION,
  type PayloadDigest,
  PayloadDigestSchema,
  type PluginId,
  PluginIdSchema,
  RELEASE_INPUT_SCHEMA_VERSION,
  type ReleaseInputDigest,
  ReleaseInputDigestSchema,
  ReleaseRelativePathSchema,
} from "../../shared/release/primitives";
import { PayloadManifestEntrySchema } from "./agent-plugin-payload";
import {
  DeclaredOwnershipClaimsSchema,
  type DistributionOwnershipIndex,
} from "./distribution-ownership";

declare const agentPluginReleaseInputBrand: unique symbol;
declare const completenessWitnessBrand: unique symbol;

const ProvenanceProtocolSchema = Type.String({
  minLength: 1,
  maxLength: MAX_CANONICAL_ID_BYTES,
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

/** Identifies one member and payload that a complete release set must cover. */
export interface ExpectedReleaseMember {
  readonly pluginId: PluginId;
  readonly payloadDigest: PayloadDigest;
}

/** Binds the expected member set and ownership index to one release-input digest. */
export type CompletenessWitness = Readonly<{
  releaseInputDigest: ReleaseInputDigest;
  expectedMembers: readonly ExpectedReleaseMember[];
  ownershipIndex: DistributionOwnershipIndex;
  [completenessWitnessBrand]: "CompletenessWitness";
}>;

/** Branded release input admitted by release-input policy. */
export type AgentPluginReleaseInput = Readonly<
  ReleaseInputEnvelope & {
    ownershipIndex: DistributionOwnershipIndex;
    completenessWitness: CompletenessWitness;
    [agentPluginReleaseInputBrand]: "AgentPluginReleaseInput";
  }
>;
