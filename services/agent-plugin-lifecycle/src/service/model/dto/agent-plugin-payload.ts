import { ReadonlyObject, type Static, Type } from "typebox";

import { ContentDigestSchema, PayloadDigestSchema } from "./release-digest";
import { type ReleaseRelativePath, ReleaseRelativePathSchema } from "./release-identity";

declare const agentPluginPayloadBrand: unique symbol;

/** Identifies the payload record protocol admitted by lifecycle policy. */
export const PAYLOAD_PROTOCOL_VERSION = 1 as const;

/** Bounds the number of files admitted for one plugin payload. */
export const MAX_PAYLOAD_ENTRIES_PER_MEMBER = 16_384;

/** Bounds the aggregate decoded bytes admitted for one plugin payload. */
export const MAX_PAYLOAD_BYTES_PER_MEMBER = 64 * 1024 * 1024;

/** Admits only the two normalized executable-bit states used in release payloads. */
export const NormalizedFileModeSchema = Type.Union([Type.Literal(0o644), Type.Literal(0o755)]);

/** TypeBox-derived normalized mode carried by one payload file. */
export type NormalizedFileMode = Static<typeof NormalizedFileModeSchema>;

/** Defines the closed projectable shape inspected before runtime byte admission. */
export const PayloadEntryInputShapeSchema = ReadonlyObject(
  Type.Object({
    path: ReleaseRelativePathSchema,
    mode: NormalizedFileModeSchema,
    bytes: Type.Unknown(),
  }),
  { additionalProperties: false }
);

/** Defines one exact file record in an agent-plugin payload manifest. */
export const PayloadManifestEntrySchema = ReadonlyObject(
  Type.Object({
    path: ReleaseRelativePathSchema,
    mode: NormalizedFileModeSchema,
    byteLength: Type.Integer({
      minimum: 0,
      maximum: MAX_PAYLOAD_BYTES_PER_MEMBER,
      description: "Decoded byte length of this exact payload file.",
    }),
    contentDigest: ContentDigestSchema,
  }),
  { additionalProperties: false }
);

/**
 * Defines the canonical wire fields for one payload entry.
 *
 * Byte length and content digest are deliberately absent: payload policy
 * derives them from decoded bytes and cross-checks them against the manifest.
 */
export const PayloadEntryRecordSchema = ReadonlyObject(
  Type.Object({
    path: ReleaseRelativePathSchema,
    mode: NormalizedFileModeSchema,
    bytesBase64: Type.String({
      description: "Canonical Base64 encoding of this payload file's bytes.",
    }),
  }),
  { additionalProperties: false }
);

/** Defines one closed in-memory payload entry with its derived byte metadata. */
const PayloadEntrySchema = ReadonlyObject(
  Type.Object({
    ...PayloadEntryRecordSchema.properties,
    byteLength: PayloadManifestEntrySchema.properties.byteLength,
    contentDigest: PayloadManifestEntrySchema.properties.contentDigest,
  }),
  { additionalProperties: false }
);

/** Defines the canonical wire record carried inside one release envelope. */
export const AgentPluginPayloadRecordSchema = ReadonlyObject(
  Type.Object({
    protocolVersion: Type.Literal(PAYLOAD_PROTOCOL_VERSION, {
      description: "Payload protocol version used to interpret this record.",
    }),
    manifest: ReadonlyObject(Type.Array(PayloadManifestEntrySchema), {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
      description: "Canonical manifest derived from the exact payload entries.",
    }),
    entries: ReadonlyObject(Type.Array(PayloadEntryRecordSchema), {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
      description: "Canonical payload entries carrying the exact file bytes.",
    }),
    payloadDigest: PayloadDigestSchema,
  }),
  { additionalProperties: false }
);

/**
 * Defines the closed in-memory payload admitted before wire projection.
 *
 * This schema keeps policy from treating a codec projection as structural
 * admission when a payload crosses directly between lifecycle operations.
 */
export const AgentPluginPayloadSchema = ReadonlyObject(
  Type.Object({
    ...AgentPluginPayloadRecordSchema.properties,
    entries: ReadonlyObject(Type.Array(PayloadEntrySchema), {
      maxItems: MAX_PAYLOAD_ENTRIES_PER_MEMBER,
      description: "Canonical payload entries with policy-derived byte metadata.",
    }),
  }),
  { additionalProperties: false }
);

/** Runtime construction input admitted by payload policy, not a JSON wire DTO. */
export type PayloadEntryInput = Omit<
  Static<typeof PayloadEntryInputShapeSchema>,
  "path" | "bytes"
> &
  Readonly<{
    path: ReleaseRelativePath;
    bytes: Uint8Array;
  }>;

/** TypeBox-derived in-memory payload entry with policy-derived byte metadata. */
export type PayloadEntry = Static<typeof PayloadEntrySchema>;

/** TypeBox-derived exact file record carried by a payload manifest. */
export type PayloadManifestEntry = Static<typeof PayloadManifestEntrySchema>;

/** Branded, immutable payload admitted by lifecycle payload policy. */
export type AgentPluginPayload = Static<typeof AgentPluginPayloadSchema> &
  Readonly<{
    [agentPluginPayloadBrand]: "AgentPluginPayload";
  }>;
