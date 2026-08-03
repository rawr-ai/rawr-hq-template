import { Value } from "typebox/value";
import type { CanonicalJsonValue } from "../dto/canonical-json";
import {
  type CurrentMainRecordValidationCode,
  MAX_CURRENT_MAIN_V3_RECORD_BYTES,
} from "../dto/current-main-record";
import {
  type CanonicalChannelSelection,
  CanonicalChannelSelectionSchema,
} from "../dto/current-main-selection";
import { equalBytes } from "./byte-equality";
import { canonicalJsonLine, decodeCanonicalJson } from "./canonical-json";
import { parseCanonicalRef } from "./current-main-git";
import { parseReleaseInputDigest } from "./release-digest";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseRepositoryIdentity,
} from "./release-identity";

/** Validates and freezes the shared current-main record structure. */
export function normalizeCurrentMainRecord(input: unknown): CanonicalChannelSelection | undefined {
  if (!Value.Check(CanonicalChannelSelectionSchema, input)) return undefined;
  if (!isCanonicalHttpsGitUrl(input.sourceRepositoryUrl)) {
    return undefined;
  }
  const contentAuthority = parseContentAuthority(input.contentAuthority);
  const sourceRepositoryIdentity = parseRepositoryIdentity(input.sourceRepositoryIdentity);
  const sourceRef = parseCanonicalRef(input.sourceRef, "currentMain.sourceRef");
  const contentCommit = parseGitCommitId(input.contentCommit);
  const contentTree = parseGitTreeId(input.contentTree);
  const releaseInputDigest = parseReleaseInputDigest(input.releaseInputDigest);
  if (
    !contentAuthority.ok ||
    !sourceRepositoryIdentity.ok ||
    !sourceRef.ok ||
    !contentCommit.ok ||
    !contentTree.ok ||
    !releaseInputDigest.ok ||
    input.sourceRepositoryUrl !== canonicalRepositoryUrl(sourceRepositoryIdentity.value)
  ) {
    return undefined;
  }
  return Object.freeze({
    ...input,
    contentAuthority: contentAuthority.value,
    sourceRepositoryIdentity: sourceRepositoryIdentity.value,
    sourceRef: sourceRef.value,
    contentCommit: contentCommit.value,
    contentTree: contentTree.value,
    releaseInputDigest: releaseInputDigest.value,
  });
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

function isCanonicalHttpsGitUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.port === "" &&
    parsed.search === "" &&
    parsed.hash === "" &&
    parsed.hostname === parsed.hostname.toLowerCase() &&
    parsed.pathname.startsWith("/") &&
    parsed.pathname.endsWith(".git") &&
    !parsed.pathname.includes("//") &&
    !parsed.pathname.split("/").some((part) => part === "." || part === "..") &&
    parsed.toString() === value
  );
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
