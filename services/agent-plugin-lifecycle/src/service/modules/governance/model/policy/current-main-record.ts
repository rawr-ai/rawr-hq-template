import { Value } from "typebox/value";
import {
  type CurrentMainRecordValidationCode,
  MAX_CURRENT_MAIN_V3_RECORD_BYTES,
} from "../../../../model/dto/current-main-record";
import type { CanonicalChannelSelection } from "../../../../model/dto/current-main-selection";
import {
  canonicalSerializeCurrentMainRecord,
  decodeCurrentMainRecord,
  describeCurrentMainRecordValidation,
  normalizeCurrentMainRecord,
} from "../../../../model/policy/current-main-record";
import {
  type CanonicalCurrentMainV3,
  CURRENT_MAIN_V3_PROTOCOL,
  CurrentMainRecordInputSchema,
  type CurrentMainRecordResult,
} from "../dto/current-main-record";

/** Runtime-narrowed operation input admitted before Governance dispatch. */
export type CurrentMainRecordPolicyInput =
  | Readonly<{ kind: "encode-body"; body: CanonicalChannelSelection }>
  | Readonly<{ kind: "validate-record"; bytes: Uint8Array }>;

type RuntimeCanonicalCurrentMainV3 = Omit<CanonicalCurrentMainV3, "bytes"> &
  Readonly<{ bytes: Uint8Array }>;

/** Runtime-narrowed result produced after Governance admits the byte carrier. */
export type CurrentMainRecordPolicyResult =
  | Readonly<{ ok: true; value: RuntimeCanonicalCurrentMainV3 }>
  | Extract<CurrentMainRecordResult, { ok: false }>;

/** Admits one closed operation input and restores its policy-owned runtime types. */
export function parseCurrentMainRecordInput(
  input: unknown
): CurrentMainRecordPolicyInput | undefined {
  if (!Value.Check(CurrentMainRecordInputSchema, input)) return undefined;
  if (input.kind === "encode-body") {
    const body = normalizeCurrentMainRecord(input.body);
    return body === undefined ? undefined : Object.freeze({ kind: "encode-body", body });
  }
  return input.bytes instanceof Uint8Array
    ? Object.freeze({ kind: "validate-record", bytes: input.bytes })
    : undefined;
}

/** Encodes one structurally and semantically valid current-main selection. */
export function encodeCurrentMainBodyV3(input: unknown): CurrentMainRecordPolicyResult {
  const record = normalizeCurrentMainRecord(input);
  if (record === undefined) return failed("InvalidSchema");
  return encodeRecord(record);
}

/** Validates canonical current-main bytes and returns their direct record value. */
export function validateCurrentMainRecordV3(bytes: unknown): CurrentMainRecordPolicyResult {
  if (!(bytes instanceof Uint8Array)) return failed("InvalidSchema");
  const decoded = decodeCurrentMainRecord(bytes);
  return typeof decoded === "string" ? failed(decoded) : succeeded(decoded, bytes);
}

function encodeRecord(record: CanonicalChannelSelection): CurrentMainRecordPolicyResult {
  const bytes = canonicalSerializeCurrentMainRecord(record);
  return bytes.byteLength > MAX_CURRENT_MAIN_V3_RECORD_BYTES
    ? failed("RecordTooLarge")
    : succeeded(record, bytes);
}

function succeeded(
  record: CanonicalChannelSelection,
  bytes: Uint8Array
): CurrentMainRecordPolicyResult {
  const value: RuntimeCanonicalCurrentMainV3 = Object.freeze({
    protocol: CURRENT_MAIN_V3_PROTOCOL,
    byteLength: bytes.byteLength,
    bytes: new Uint8Array(bytes),
    record,
  });
  return Object.freeze({ ok: true, value });
}

function failed(
  code: CurrentMainRecordValidationCode
): Extract<CurrentMainRecordPolicyResult, { ok: false }> {
  return Object.freeze({
    ok: false,
    failure: Object.freeze({
      code,
      path: "currentMain",
      message: describeCurrentMainRecordValidation(code),
    }),
  });
}
