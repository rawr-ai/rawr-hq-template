import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import {
  CanonicalChannelProjectionTupleSchema,
  CanonicalChannelSelectionSchema,
  ClaudeCanonicalChannelProjectionSchema,
  CodexCanonicalChannelProjectionSchema,
} from "../../../../model/dto/current-main-selection";

export type {
  CanonicalChannelSelection,
  CurrentMainSelectionFailureKind,
  CurrentMainSelectionResult,
} from "../../../../model/dto/current-main-selection";
export { MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH } from "../../../../model/dto/current-main-selection";

export const CURRENT_MAIN_V2_SCHEMA_VERSION = 2 as const;
export const CURRENT_MAIN_V2_CHANNEL = "current-main" as const;
export const CURRENT_MAIN_V2_PROTOCOL = "agent-plugin-current-main@v2" as const;
export const CURRENT_MAIN_V2_CANONICAL_REF = "refs/heads/main" as const;
export const CURRENT_MAIN_V2_RECORD_PATH =
  ".rawr/agent-plugin-lifecycle/channels/current-main.json" as const;
export const CURRENT_MAIN_V2_RELEASE_INPUT_PATH = ".rawr/release-input.json" as const;
export const MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES = 2 * 1024 * 1024;
export const MAX_CURRENT_MAIN_V2_CODEC_PATH_LENGTH = 512;
export const MAX_CURRENT_MAIN_V2_CODEC_MESSAGE_LENGTH = 4_096;

export const CurrentMainBodyV2Schema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(CURRENT_MAIN_V2_SCHEMA_VERSION),
    channel: Type.Literal(CURRENT_MAIN_V2_CHANNEL),
    contentAuthority: CanonicalChannelSelectionSchema.properties.contentAuthority,
    sourceRepositoryIdentity: CanonicalChannelSelectionSchema.properties.sourceRepositoryIdentity,
    sourceCommit: CanonicalChannelSelectionSchema.properties.sourceCommit,
    sourceTree: CanonicalChannelSelectionSchema.properties.sourceTree,
    releaseInputDigest: CanonicalChannelSelectionSchema.properties.releaseInputDigest,
    releaseSetDigest: CanonicalChannelSelectionSchema.properties.releaseSetDigest,
    evaluationProfile: CanonicalChannelSelectionSchema.properties.evaluationProfile,
    projections: CanonicalChannelProjectionTupleSchema,
  }),
  { additionalProperties: false }
);

export const CurrentMainEnvelopeV2Schema = ReadonlyObject(
  Type.Object({
    schemaVersion: Type.Literal(CURRENT_MAIN_V2_SCHEMA_VERSION),
    currentMainDigest: CanonicalChannelSelectionSchema.properties.currentMainDigest,
    body: CurrentMainBodyV2Schema,
  }),
  { additionalProperties: false }
);

export type ClaudeCurrentMainProjectionV2 = Readonly<
  Static<typeof ClaudeCanonicalChannelProjectionSchema>
>;
export type CodexCurrentMainProjectionV2 = Readonly<
  Static<typeof CodexCanonicalChannelProjectionSchema>
>;
export type CurrentMainProjectionTupleV2 = Static<typeof CanonicalChannelProjectionTupleSchema>;
export type CurrentMainBodyV2 = Static<typeof CurrentMainBodyV2Schema>;
export type CurrentMainEnvelopeV2 = Static<typeof CurrentMainEnvelopeV2Schema>;

export const CurrentMainV2CodecFailureSchema = ReadonlyObject(
  Type.Object({
    code: Type.Union([
      Type.Literal("InvalidSchema"),
      Type.Literal("EnvelopeTooLarge"),
      Type.Literal("DigestMismatch"),
      Type.Literal("NonCanonical"),
    ]),
    path: Type.String({
      minLength: 1,
      maxLength: MAX_CURRENT_MAIN_V2_CODEC_PATH_LENGTH,
    }),
    message: Type.String({
      minLength: 1,
      maxLength: MAX_CURRENT_MAIN_V2_CODEC_MESSAGE_LENGTH,
    }),
  }),
  { additionalProperties: false }
);

export const CurrentMainBytesSchema = Refine(
  Type.Unsafe<Uint8Array>(Type.Unknown()),
  (value) => value instanceof Uint8Array,
  () => "Expected Uint8Array"
);

export const CanonicalCurrentMainV2Schema = ReadonlyObject(
  Type.Object({
    protocol: Type.Literal(CURRENT_MAIN_V2_PROTOCOL),
    currentMainDigest: CanonicalChannelSelectionSchema.properties.currentMainDigest,
    byteLength: Type.Integer({ minimum: 1, maximum: MAX_CURRENT_MAIN_V2_ENVELOPE_BYTES }),
    bytes: CurrentMainBytesSchema,
    record: CurrentMainEnvelopeV2Schema,
  }),
  { additionalProperties: false }
);

export const CurrentMainV2CodecResultSchema = Type.Union([
  ReadonlyObject(Type.Object({ ok: Type.Literal(true), value: CanonicalCurrentMainV2Schema }), {
    additionalProperties: false,
  }),
  ReadonlyObject(
    Type.Object({ ok: Type.Literal(false), failure: CurrentMainV2CodecFailureSchema }),
    { additionalProperties: false }
  ),
]);

export type CurrentMainV2CodecFailure = Static<typeof CurrentMainV2CodecFailureSchema>;
export type CurrentMainV2CodecFailureCode = CurrentMainV2CodecFailure["code"];
export type CanonicalCurrentMainV2 = Static<typeof CanonicalCurrentMainV2Schema>;
export type CurrentMainV2CodecResult = Static<typeof CurrentMainV2CodecResultSchema>;
