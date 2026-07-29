import { ReadonlyObject, type Static, Type } from "typebox";
import {
  DeclaredOwnershipClaimsSchema,
  type DistributionOwnershipIndex,
  DistributionOwnershipIndexRecordSchema,
} from "./distribution-ownership";
import { ContentDigestSchema, ReleaseInputDigestSchema } from "./release-digest";
import {
  ContentAuthoritySchema,
  OwnershipIdentitySchema,
  PluginIdSchema,
} from "./release-identity";

declare const agentPluginReleaseInputBrand: unique symbol;

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

/** Defines one closed agent-plugin member declaration in a release input. */
export const ReleaseMemberDeclarationSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("agent-plugin"),
    pluginId: PluginIdSchema,
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

/**
 * Defines the closed in-memory release input admitted before wire projection.
 *
 * Ownership is a derived observation, not a wire field, but remains
 * structurally closed whenever an admitted value is reused.
 */
export const AgentPluginReleaseInputSchema = ReadonlyObject(
  Type.Object({
    ...ReleaseInputEnvelopeSchema.properties,
    ownershipIndex: DistributionOwnershipIndexRecordSchema,
  }),
  { additionalProperties: false }
);

/** TypeBox-derived immutable provenance binding. */
export type ProvenanceBinding = Static<typeof ProvenanceBindingSchema>;

/** TypeBox-derived closed release member declaration. */
export type ReleaseMemberDeclaration = Static<typeof ReleaseMemberDeclarationSchema>;

/** TypeBox-derived complete release-input body. */
export type ReleaseInputBody = Static<typeof ReleaseInputBodySchema>;

/** TypeBox-derived persisted release-input envelope. */
export type ReleaseInputEnvelope = Static<typeof ReleaseInputEnvelopeSchema>;

/** Branded release input admitted by release-input policy. */
export type AgentPluginReleaseInput = Static<typeof AgentPluginReleaseInputSchema> &
  Readonly<{
    ownershipIndex: DistributionOwnershipIndex;
    [agentPluginReleaseInputBrand]: "AgentPluginReleaseInput";
  }>;
