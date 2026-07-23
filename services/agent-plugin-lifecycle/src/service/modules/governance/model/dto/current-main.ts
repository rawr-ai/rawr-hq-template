import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import { CanonicalChannelSelectionSchema } from "../../../../model/dto/current-main-selection";

export type {
  CanonicalChannelSelection,
  CurrentMainSelectionFailureKind,
  CurrentMainSelectionResult,
} from "../../../../model/dto/current-main-selection";
export {
  CanonicalChannelSelectionSchema,
  CURRENT_MAIN_V3_CHANNEL,
  CURRENT_MAIN_V3_SCHEMA_VERSION,
  MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH,
} from "../../../../model/dto/current-main-selection";

export const CURRENT_MAIN_V3_PROTOCOL = "agent-plugin-current-main@v3" as const;
export const CURRENT_MAIN_V3_CANONICAL_REF = "refs/heads/main" as const;
export const CURRENT_MAIN_V3_RECORD_PATH =
  ".rawr/agent-plugin-lifecycle/channels/current-main.json" as const;
export const CURRENT_MAIN_V3_RELEASE_INPUT_PATH = ".rawr/release-input.json" as const;
export const MAX_CURRENT_MAIN_V3_RECORD_BYTES = 2 * 1024 * 1024;
export const MAX_CURRENT_MAIN_V3_CODEC_PATH_LENGTH = 512;
export const MAX_CURRENT_MAIN_V3_CODEC_MESSAGE_LENGTH = 4_096;

/** The direct, closed JSON record stored at the current-main path. */
export const CurrentMainBodyV3Schema = CanonicalChannelSelectionSchema;
export type CurrentMainBodyV3 = Static<typeof CurrentMainBodyV3Schema>;

export const CurrentMainV3CodecFailureSchema = ReadonlyObject(
  Type.Object({
    code: Type.Union([
      Type.Literal("InvalidSchema"),
      Type.Literal("RecordTooLarge"),
      Type.Literal("NonCanonical"),
    ]),
    path: Type.String({
      minLength: 1,
      maxLength: MAX_CURRENT_MAIN_V3_CODEC_PATH_LENGTH,
    }),
    message: Type.String({
      minLength: 1,
      maxLength: MAX_CURRENT_MAIN_V3_CODEC_MESSAGE_LENGTH,
    }),
  }),
  { additionalProperties: false }
);

export const CurrentMainBytesSchema = Refine(
  Type.Unsafe<Uint8Array>(Type.Unknown()),
  (value) => value instanceof Uint8Array,
  () => "Expected Uint8Array"
);

/** Pure codec output; only `bytes` are persisted as the direct v3 record. */
export const CanonicalCurrentMainV3Schema = ReadonlyObject(
  Type.Object({
    protocol: Type.Literal(CURRENT_MAIN_V3_PROTOCOL),
    byteLength: Type.Integer({
      minimum: 1,
      maximum: MAX_CURRENT_MAIN_V3_RECORD_BYTES,
    }),
    bytes: CurrentMainBytesSchema,
    record: CurrentMainBodyV3Schema,
  }),
  { additionalProperties: false }
);

export const CurrentMainV3CodecResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      ok: Type.Literal(true),
      value: CanonicalCurrentMainV3Schema,
    }),
    {
      additionalProperties: false,
    }
  ),
  ReadonlyObject(
    Type.Object({
      ok: Type.Literal(false),
      failure: CurrentMainV3CodecFailureSchema,
    }),
    { additionalProperties: false }
  ),
]);

export type CurrentMainV3CodecFailure = Static<typeof CurrentMainV3CodecFailureSchema>;
export type CurrentMainV3CodecFailureCode = CurrentMainV3CodecFailure["code"];
export type CanonicalCurrentMainV3 = Static<typeof CanonicalCurrentMainV3Schema>;
export type CurrentMainV3CodecResult = Static<typeof CurrentMainV3CodecResultSchema>;
