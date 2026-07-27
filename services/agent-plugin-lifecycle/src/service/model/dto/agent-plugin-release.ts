import { ReadonlyObject, type Static, Type } from "typebox";
import {
  type AgentPluginPayload,
  AgentPluginPayloadRecordSchema,
  AgentPluginPayloadSchema,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  PayloadManifestEntrySchema,
} from "./agent-plugin-payload";
import { MAX_OWNERSHIP_CLAIMS } from "./distribution-ownership";
import {
  PayloadDigestSchema,
  ReleaseDigestSchema,
  ReleaseInputDigestSchema,
} from "./release-digest";
import {
  ContentAuthoritySchema,
  GitCommitIdSchema,
  GitTreeIdSchema,
  OwnershipIdentitySchema,
  PluginIdSchema,
  RepositoryIdentitySchema,
} from "./release-identity";
import {
  MAX_PROVENANCE_BINDINGS,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  ProvenanceBindingSchema,
} from "./release-input";

declare const agentPluginReleaseBrand: unique symbol;

/** Identifies the individual-release envelope schema admitted by lifecycle policy. */
export const AGENT_PLUGIN_RELEASE_SCHEMA_VERSION = 1 as const;

/** Identifies the builder protocol shared by individual and complete releases. */
export const BUILDER_PROTOCOL_VERSION = 1 as const;

/** Bounds one canonical individual-release envelope before decoding. */
export const MAX_AGENT_PLUGIN_RELEASE_ENVELOPE_BYTES = 3 * MAX_RELEASE_INPUT_ENVELOPE_BYTES;

/** Defines the exact source snapshot selected for one in-memory release. */
export const ReleaseSourceIdentitySchema = ReadonlyObject(
  Type.Object({
    sourceRepository: RepositoryIdentitySchema,
    sourceCommit: GitCommitIdSchema,
    sourceTree: GitTreeIdSchema,
  }),
  { additionalProperties: false }
);

/** Defines the digest-free canonical body that gives one release its identity. */
export const AgentPluginReleaseBodySchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(AGENT_PLUGIN_RELEASE_SCHEMA_VERSION, {
      description: "Schema version governing the canonical release body.",
    }),
    builderProtocolVersion: Type.Literal(BUILDER_PROTOCOL_VERSION, {
      description: "Builder protocol that produced this release identity.",
    }),
    contentAuthority: ContentAuthoritySchema,
    sourceRepository: RepositoryIdentitySchema,
    sourceCommit: GitCommitIdSchema,
    sourceTree: GitTreeIdSchema,
    releaseInputDigest: ReleaseInputDigestSchema,
    pluginId: PluginIdSchema,
    aliases: ReadonlyObject(Type.Array(OwnershipIdentitySchema), {
      maxItems: MAX_OWNERSHIP_CLAIMS,
      description: "Canonical aliases owned by this release member.",
    }),
    payloadManifest: ReadonlyObject(Type.Array(PayloadManifestEntrySchema), {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
      description: "Canonical manifest bound into this release identity.",
    }),
    payloadDigest: PayloadDigestSchema,
    vendor: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
      description: "Canonical vendor provenance bound into this release.",
    }),
    curation: ReadonlyObject(Type.Array(ProvenanceBindingSchema), {
      maxItems: MAX_PROVENANCE_BINDINGS,
      description: "Canonical curation provenance bound into this release.",
    }),
  }),
  { additionalProperties: false }
);

/** Defines the canonical release envelope without a local store or artifact handle. */
export const AgentPluginReleaseEnvelopeSchema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(AGENT_PLUGIN_RELEASE_SCHEMA_VERSION, {
      description: "Schema version governing the canonical release envelope.",
    }),
    releaseDigest: ReleaseDigestSchema,
    body: AgentPluginReleaseBodySchema,
    payload: AgentPluginPayloadRecordSchema,
  }),
  { additionalProperties: false }
);

/**
 * Defines the closed in-memory release admitted before canonical projection.
 *
 * The in-memory payload carries derived byte metadata that is deliberately
 * absent from the wire envelope.
 */
export const AgentPluginReleaseSchema = ReadonlyObject(
  Type.Object({
    ...AgentPluginReleaseEnvelopeSchema.properties,
    payload: AgentPluginPayloadSchema,
  }),
  { additionalProperties: false }
);

/** TypeBox-derived source identity used during release construction. */
export type ReleaseSourceIdentity = Static<typeof ReleaseSourceIdentitySchema>;

/** TypeBox-derived digest-free release body. */
export type AgentPluginReleaseBody = Static<typeof AgentPluginReleaseBodySchema>;

/** TypeBox-derived unbranded release envelope used by canonical wire codecs. */
export type AgentPluginReleaseEnvelope = Static<typeof AgentPluginReleaseEnvelopeSchema>;

/**
 * Branded release admitted by release policy.
 *
 * The payload is owned in memory and the release digest verifies only the
 * canonical body that binds its manifest and payload digest.
 */
export type AgentPluginRelease = Static<typeof AgentPluginReleaseSchema> &
  Readonly<{
    payload: AgentPluginPayload;
    [agentPluginReleaseBrand]: "AgentPluginRelease";
  }>;
