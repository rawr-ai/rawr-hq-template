import { Value } from "typebox/value";
import {
  type CanonicalJsonValue,
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
} from "../../../../shared/release/canonical";
import {
  type CanonicalCurrentMainV3,
  CURRENT_MAIN_V3_PROTOCOL,
  type CurrentMainBodyV3,
  CurrentMainBodyV3Schema,
  type CurrentMainV3CodecFailureCode,
  type CurrentMainV3CodecResult,
  MAX_CURRENT_MAIN_V3_RECORD_BYTES,
} from "../dto/current-main";

export function encodeCurrentMainBodyV3(input: unknown): CurrentMainV3CodecResult {
  const record = normalizeRecord(input);
  return record === undefined
    ? failed(
        "InvalidSchema",
        "currentMain",
        "Current-main record does not match its closed domain schema"
      )
    : encodeRecord(record);
}

export function validateCurrentMainRecordV3(bytes: unknown): CurrentMainV3CodecResult {
  const decoded = decodeCanonicalJson(bytes, "currentMain", MAX_CURRENT_MAIN_V3_RECORD_BYTES);
  if (!decoded.ok) {
    const tooLarge = decoded.issues.some((entry) => entry.code === "ENVELOPE_TOO_LARGE");
    return failed(
      tooLarge ? "RecordTooLarge" : "InvalidSchema",
      "currentMain",
      tooLarge
        ? "Current-main record exceeds 2,097,152 bytes"
        : "Current-main record is not valid UTF-8 JSON"
    );
  }
  const record = normalizeRecord(decoded.value);
  if (record === undefined) {
    return failed(
      "InvalidSchema",
      "currentMain",
      "Current-main record does not match its closed domain schema"
    );
  }
  const canonical = encodeRecord(record);
  if (!canonical.ok) return canonical;
  if (!(bytes instanceof Uint8Array) || !equalBytes(bytes, canonical.value.bytes)) {
    return failed(
      "NonCanonical",
      "currentMain",
      "Current-main bytes are not the unique newline-terminated canonical representation"
    );
  }
  return canonical;
}

export function canonicalSerializeCurrentMainBodyV3(record: CurrentMainBodyV3): Uint8Array {
  return canonicalJsonLine(currentMainRecordValue(record));
}

function encodeRecord(record: CurrentMainBodyV3): CurrentMainV3CodecResult {
  const bytes = canonicalSerializeCurrentMainBodyV3(record);
  if (bytes.byteLength > MAX_CURRENT_MAIN_V3_RECORD_BYTES) {
    return failed("RecordTooLarge", "currentMain", "Current-main record exceeds 2,097,152 bytes");
  }
  const value: CanonicalCurrentMainV3 = Object.freeze({
    protocol: CURRENT_MAIN_V3_PROTOCOL,
    byteLength: bytes.byteLength,
    bytes: new Uint8Array(bytes),
    record,
  });
  return Object.freeze({ ok: true, value });
}

function normalizeRecord(input: unknown): CurrentMainBodyV3 | undefined {
  if (!Value.Check(CurrentMainBodyV3Schema, input)) return undefined;
  if (input.sourceRepositoryUrl !== canonicalRepositoryUrl(input.sourceRepositoryIdentity))
    return undefined;
  return Object.freeze({ ...input });
}

function canonicalRepositoryUrl(repositoryIdentity: string): string | undefined {
  if (!repositoryIdentity.startsWith("git:")) return undefined;
  const repository = repositoryIdentity.slice("git:".length);
  return repository.includes("/") ? `https://${repository}.git` : undefined;
}

function currentMainRecordValue(record: CurrentMainBodyV3): CanonicalJsonValue {
  return {
    schemaVersion: record.schemaVersion,
    channel: record.channel,
    contentAuthority: record.contentAuthority,
    sourceRepositoryIdentity: record.sourceRepositoryIdentity,
    sourceRepositoryUrl: record.sourceRepositoryUrl,
    sourceRef: record.sourceRef,
    contentCommit: record.contentCommit,
    contentTree: record.contentTree,
    releaseInputDigest: record.releaseInputDigest,
  };
}

function failed(
  code: CurrentMainV3CodecFailureCode,
  path: string,
  message: string
): Extract<CurrentMainV3CodecResult, { readonly ok: false }> {
  return Object.freeze({
    ok: false,
    failure: Object.freeze({ code, path, message }),
  });
}
