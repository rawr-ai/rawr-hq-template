import { ReadonlyObject, type Static, Type } from "typebox";

import {
  type ContentDigest,
  ContentDigestSchema,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  type NormalizedFileMode,
  NormalizedFileModeSchema,
  type PayloadDigest,
  type PayloadProtocolVersion,
  type ReleaseRelativePath,
  ReleaseRelativePathSchema,
} from "../../shared/release/primitives";

declare const agentPluginPayloadBrand: unique symbol;

/** Defines one exact file record in an agent-plugin payload manifest. */
export const PayloadManifestEntrySchema = ReadonlyObject(
  Type.Object({
    path: ReleaseRelativePathSchema,
    mode: NormalizedFileModeSchema,
    byteLength: Type.Integer({ minimum: 0, maximum: MAX_PAYLOAD_BYTES_PER_MEMBER }),
    contentDigest: ContentDigestSchema,
  }),
  { additionalProperties: false }
);

/** Carries one untrusted file candidate into payload construction. */
export interface PayloadEntryInput {
  readonly path: unknown;
  readonly mode: unknown;
  readonly bytes: unknown;
}

/** Owns one canonical payload file and its derived byte metadata. */
export interface PayloadEntry {
  readonly path: ReleaseRelativePath;
  readonly mode: NormalizedFileMode;
  readonly bytesBase64: string;
  readonly byteLength: number;
  readonly contentDigest: ContentDigest;
}

/** TypeBox-derived exact file record carried by a payload manifest. */
export type PayloadManifestEntry = Static<typeof PayloadManifestEntrySchema>;

/** Branded, immutable payload admitted by lifecycle payload policy. */
export type AgentPluginPayload = Readonly<{
  protocolVersion: PayloadProtocolVersion;
  manifest: readonly PayloadManifestEntry[];
  entries: readonly PayloadEntry[];
  payloadDigest: PayloadDigest;
  [agentPluginPayloadBrand]: "AgentPluginPayload";
}>;
