import { Value } from "typebox/value";
import {
  type CanonicalJsonValue,
  canonicalJsonLine,
  decodeCanonicalJson,
  equalBytes,
} from "../../shared/release/canonical";
import {
  type CurrentMainRecordValidationCode,
  MAX_CURRENT_MAIN_V3_RECORD_BYTES,
} from "../dto/current-main-record";
import {
  type CanonicalChannelSelection,
  CanonicalChannelSelectionSchema,
} from "../dto/current-main-selection";

/** Validates and freezes the shared current-main record structure. */
export function normalizeCurrentMainRecord(input: unknown): CanonicalChannelSelection | undefined {
  if (!Value.Check(CanonicalChannelSelectionSchema, input)) return undefined;
  if (input.sourceRepositoryUrl !== canonicalRepositoryUrl(input.sourceRepositoryIdentity)) {
    return undefined;
  }
  return Object.freeze({ ...input });
}

/** Serializes one validated current-main selection into its canonical Git bytes. */
export function canonicalSerializeCurrentMainRecord(record: CanonicalChannelSelection): Uint8Array {
  return canonicalJsonLine(currentMainRecordValue(record));
}

/** Decodes canonical current-main bytes for governance and shared selection policy. */
export function decodeCurrentMainRecord(
  bytes: Uint8Array
): CanonicalChannelSelection | CurrentMainRecordValidationCode {
  const decoded = decodeCanonicalJson(bytes, "currentMain", MAX_CURRENT_MAIN_V3_RECORD_BYTES);
  if (!decoded.ok) {
    const tooLarge = decoded.issues.some((entry) => entry.code === "ENVELOPE_TOO_LARGE");
    return tooLarge ? "RecordTooLarge" : "InvalidSchema";
  }
  const record = normalizeCurrentMainRecord(decoded.value);
  if (record === undefined) {
    return "InvalidSchema";
  }
  const canonical = canonicalSerializeCurrentMainRecord(record);
  if (canonical.byteLength > MAX_CURRENT_MAIN_V3_RECORD_BYTES) {
    return "RecordTooLarge";
  }
  if (!equalBytes(bytes, canonical)) {
    return "NonCanonical";
  }
  return record;
}

/** Supplies the stable operator diagnostic for a shared validation outcome. */
export function describeCurrentMainRecordValidation(code: CurrentMainRecordValidationCode): string {
  switch (code) {
    case "InvalidSchema":
      return "Current-main record does not match its closed domain schema";
    case "RecordTooLarge":
      return "Current-main record exceeds 2,097,152 bytes";
    case "NonCanonical":
      return "Current-main bytes are not the unique newline-terminated canonical representation";
  }
}

function canonicalRepositoryUrl(repositoryIdentity: string): string | undefined {
  if (!repositoryIdentity.startsWith("git:")) return undefined;
  const repository = repositoryIdentity.slice("git:".length);
  return repository.includes("/") ? `https://${repository}.git` : undefined;
}

function currentMainRecordValue(record: CanonicalChannelSelection): CanonicalJsonValue {
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
