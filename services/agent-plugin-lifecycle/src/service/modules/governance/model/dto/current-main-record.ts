import { ReadonlyObject, Refine, type Static, Type } from "typebox";

import {
  CurrentMainRecordValidationCodeSchema,
  MAX_CURRENT_MAIN_V3_RECORD_BYTES,
} from "#agent-plugin-lifecycle-service/model/dto/current-main-record";
import { CanonicalChannelSelectionSchema } from "#agent-plugin-lifecycle-service/model/dto/current-main-selection";

export const CURRENT_MAIN_V3_PROTOCOL = "agent-plugin-current-main@v3" as const;
export const MAX_CURRENT_MAIN_V3_CODEC_PATH_LENGTH = 512;
export const MAX_CURRENT_MAIN_V3_CODEC_MESSAGE_LENGTH = 4_096;

/** Byte representation accepted and returned by the governance record operation. */
const CurrentMainBytesSchema = Refine(
  Type.Unsafe<Uint8Array>(Type.Unknown()),
  (value) => value instanceof Uint8Array,
  () => "Expected Uint8Array"
);

/** Closed request envelope for encoding or validating one current-main record. */
export const CurrentMainRecordInputSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("encode-body"),
      body: CanonicalChannelSelectionSchema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("validate-record"),
      bytes: CurrentMainBytesSchema,
    }),
    { additionalProperties: false }
  ),
]);

/** Canonical record value returned after governance validation succeeds. */
const CanonicalCurrentMainV3Schema = ReadonlyObject(
  Type.Object({
    protocol: Type.Literal(CURRENT_MAIN_V3_PROTOCOL),
    byteLength: Type.Integer({
      minimum: 1,
      maximum: MAX_CURRENT_MAIN_V3_RECORD_BYTES,
    }),
    bytes: CurrentMainBytesSchema,
    record: CanonicalChannelSelectionSchema,
  }),
  { additionalProperties: false }
);

/** Bounded diagnostic returned when governance rejects record bytes or structure. */
const CurrentMainRecordFailureSchema = ReadonlyObject(
  Type.Object({
    code: CurrentMainRecordValidationCodeSchema,
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

/** Closed result envelope for the current-main record operation. */
export const CurrentMainRecordResultSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      ok: Type.Literal(true),
      value: CanonicalCurrentMainV3Schema,
    }),
    { additionalProperties: false }
  ),
  ReadonlyObject(
    Type.Object({
      ok: Type.Literal(false),
      failure: CurrentMainRecordFailureSchema,
    }),
    { additionalProperties: false }
  ),
]);

export type CanonicalCurrentMainV3 = Static<typeof CanonicalCurrentMainV3Schema>;
export type CurrentMainRecordResult = Static<typeof CurrentMainRecordResultSchema>;
