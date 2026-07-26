import {
  type CurrentMainRecordValidationCode,
  MAX_CURRENT_MAIN_V3_RECORD_BYTES,
} from "#agent-plugin-lifecycle-service/model/dto/current-main-record";
import type { CanonicalChannelSelection } from "#agent-plugin-lifecycle-service/model/dto/current-main-selection";
import {
  canonicalSerializeCurrentMainRecord,
  decodeCurrentMainRecord,
  describeCurrentMainRecordValidation,
  normalizeCurrentMainRecord,
} from "#agent-plugin-lifecycle-service/model/policy/current-main-record";
import {
  type CanonicalCurrentMainV3,
  CURRENT_MAIN_V3_PROTOCOL,
  type CurrentMainRecordResult,
} from "../dto/current-main-record";

/** Encodes one structurally and semantically valid current-main selection. */
export function encodeCurrentMainBodyV3(input: unknown): CurrentMainRecordResult {
  const record = normalizeCurrentMainRecord(input);
  if (record === undefined) return failed("InvalidSchema");
  return encodeRecord(record);
}

/** Validates canonical current-main bytes and returns their direct record value. */
export function validateCurrentMainRecordV3(bytes: Uint8Array): CurrentMainRecordResult {
  const decoded = decodeCurrentMainRecord(bytes);
  return typeof decoded === "string" ? failed(decoded) : succeeded(decoded, bytes);
}

function encodeRecord(record: CanonicalChannelSelection): CurrentMainRecordResult {
  const bytes = canonicalSerializeCurrentMainRecord(record);
  return bytes.byteLength > MAX_CURRENT_MAIN_V3_RECORD_BYTES
    ? failed("RecordTooLarge")
    : succeeded(record, bytes);
}

function succeeded(record: CanonicalChannelSelection, bytes: Uint8Array): CurrentMainRecordResult {
  const value: CanonicalCurrentMainV3 = Object.freeze({
    protocol: CURRENT_MAIN_V3_PROTOCOL,
    byteLength: bytes.byteLength,
    bytes: new Uint8Array(bytes),
    record,
  });
  return Object.freeze({ ok: true, value });
}

function failed(code: CurrentMainRecordValidationCode): CurrentMainRecordResult {
  return Object.freeze({
    ok: false,
    failure: Object.freeze({
      code,
      path: "currentMain",
      message: describeCurrentMainRecordValidation(code),
    }),
  });
}
