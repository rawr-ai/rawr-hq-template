import type {
  CoworkV1ArchiveEncodingRequest,
  PackageArchiveEntry,
} from "@rawr/resource-agent-plugin-package-output";
import {
  type AgentPluginRelease,
  type AgentPluginReleaseSet,
  contentDigest,
  parseReleaseRelativePath,
  payloadEntryBytes,
  verifyCompleteReleaseSet,
} from "../../../../shared/release/index";

import type { PackageDigest } from "../dto/packaging-lifecycle";

export const COWORK_V1_ARCHIVE_COMMENT = "rawr-agent-plugin-cowork-v1";
export const COWORK_V1_FIXED_TIMESTAMP = "2000-01-01T00:00:00.000";
const CLASSIC_ZIP_ENTRY_FIXED_BYTES = 76n;
const CLASSIC_ZIP_END_FIXED_BYTES = 22n;
const encoder = new TextEncoder();

// Cowork v1 is deliberately a fully buffered classic ZIP, so its protocol caps bound peak memory.
export const COWORK_V1_MAX_ENTRY_COUNT = 65_534;
export const COWORK_V1_MAX_PAYLOAD_BYTES = 64 * 1024 * 1024;
export const COWORK_V1_MAX_PROJECTED_ARCHIVE_BYTES = 128 * 1024 * 1024;

export interface CoworkV1ProtocolEntrySize {
  readonly path: string;
  readonly byteLength: number;
}

export interface PackageReleaseSelection {
  readonly releases: readonly AgentPluginRelease[];
  readonly releaseSet?: AgentPluginReleaseSet;
}

export function createCoworkV1ArchiveRequest(
  selection: PackageReleaseSelection
): CoworkV1ArchiveEncodingRequest {
  return Object.freeze({
    entries: collectCoworkEntries(selection),
    comment: COWORK_V1_ARCHIVE_COMMENT,
    fixedTimestamp: COWORK_V1_FIXED_TIMESTAMP,
    compression: "store",
    zip64: false,
  });
}

export function coworkV1PackageDigest(bytes: Uint8Array): PackageDigest {
  const digest = contentDigest(bytes);
  return `pkg1_${digest.slice("sha256_".length)}`;
}

function collectCoworkEntries(selection: PackageReleaseSelection): readonly PackageArchiveEntry[] {
  const releases = verifiedSelectionReleases(selection);
  assertCoworkV1ProtocolBounds(protocolEntrySizes(releases, selection.releaseSet !== undefined));
  const entries = releases.flatMap((release) =>
    collectReleaseEntries(
      release,
      selection.releaseSet === undefined
        ? ""
        : `plugins/${release.artifactBody.releaseBody.pluginId}/`
    )
  );
  entries.sort((left, right) => compareUtf8(left.path, right.path));
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1]?.path === entries[index]?.path) {
      throw new Error(`Cowork package contains duplicate entry ${entries[index]?.path ?? ""}`);
    }
  }
  return Object.freeze(entries);
}

export function assertCoworkV1ProtocolBounds(entries: Iterable<CoworkV1ProtocolEntrySize>): void {
  let entryCount = 0n;
  let payloadBytes = 0n;
  let projectedArchiveBytes =
    CLASSIC_ZIP_END_FIXED_BYTES + BigInt(utf8Bytes(COWORK_V1_ARCHIVE_COMMENT).byteLength);
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0) {
      throw new Error("Cowork v1 entry byte length is not a safe non-negative integer");
    }
    const pathBytes = utf8Bytes(entry.path).byteLength;
    if (pathBytes > 0xffff) {
      throw new Error("Cowork v1 entry path exceeds the classic ZIP filename limit");
    }
    entryCount += 1n;
    payloadBytes += BigInt(entry.byteLength);
    projectedArchiveBytes +=
      BigInt(entry.byteLength) + CLASSIC_ZIP_ENTRY_FIXED_BYTES + 2n * BigInt(pathBytes);
    if (entryCount > BigInt(COWORK_V1_MAX_ENTRY_COUNT)) {
      throw new Error(`Cowork v1 exceeds its ${COWORK_V1_MAX_ENTRY_COUNT} entry limit`);
    }
    if (payloadBytes > BigInt(COWORK_V1_MAX_PAYLOAD_BYTES)) {
      throw new Error(`Cowork v1 exceeds its ${COWORK_V1_MAX_PAYLOAD_BYTES} payload-byte limit`);
    }
    if (projectedArchiveBytes > BigInt(COWORK_V1_MAX_PROJECTED_ARCHIVE_BYTES)) {
      throw new Error(
        `Cowork v1 exceeds its ${COWORK_V1_MAX_PROJECTED_ARCHIVE_BYTES} projected archive-byte limit`
      );
    }
  }
}

function* protocolEntrySizes(
  releases: readonly AgentPluginRelease[],
  completeSet: boolean
): Generator<CoworkV1ProtocolEntrySize> {
  for (const release of releases) {
    yield* releaseProtocolEntrySizes(
      release,
      completeSet ? `plugins/${release.artifactBody.releaseBody.pluginId}/` : ""
    );
  }
}

function* releaseProtocolEntrySizes(
  release: AgentPluginRelease,
  prefix: string
): Generator<CoworkV1ProtocolEntrySize> {
  for (const entry of release.artifactBody.payloadEntries) {
    yield { path: `${prefix}${entry.path}`, byteLength: entry.byteLength };
  }
}

function collectReleaseEntries(release: AgentPluginRelease, prefix: string): PackageArchiveEntry[] {
  return release.artifactBody.payloadEntries.map((entry) => {
    const bytes = payloadEntryBytes(entry);
    assertPayloadEntry(entry.path, entry.mode, entry.contentDigest, entry.byteLength, bytes);
    return {
      path: `${prefix}${entry.path}`,
      mode: entry.mode,
      bytes,
    };
  });
}

function verifiedSelectionReleases(
  selection: PackageReleaseSelection
): readonly AgentPluginRelease[] {
  if (selection.releaseSet === undefined && selection.releases.length !== 1) {
    throw new Error("Targeted packaging requires exactly one release");
  }
  const releases = [...selection.releases].sort((left, right) =>
    compareUtf8(left.artifactBody.releaseBody.pluginId, right.artifactBody.releaseBody.pluginId)
  );
  if (selection.releaseSet !== undefined) {
    const verification = verifyCompleteReleaseSet(selection.releaseSet, releases);
    if (!verification.ok) {
      throw new Error(
        `Complete release-set verification failed: ${verification.issues.map((issue) => issue.code).join(",")}`
      );
    }
  }
  return releases;
}

function assertPayloadEntry(
  path: string,
  mode: number,
  expectedDigest: string,
  expectedByteLength: number,
  bytes: Uint8Array
): void {
  const parsedPath = parseReleaseRelativePath(path);
  if (!parsedPath.ok || parsedPath.value !== path) {
    throw new Error("Release contains a non-canonical payload path");
  }
  if (mode !== 0o644 && mode !== 0o755) {
    throw new Error(`Release contains an invalid mode for ${path}`);
  }
  if (bytes.byteLength !== expectedByteLength || contentDigest(bytes) !== expectedDigest) {
    throw new Error(`Release contains mismatched bytes for ${path}`);
  }
}

function compareUtf8(left: string, right: string): number {
  const leftBytes = utf8Bytes(left);
  const rightBytes = utf8Bytes(right);
  const length = Math.min(leftBytes.byteLength, rightBytes.byteLength);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index]! - rightBytes[index]!;
    if (difference !== 0) return difference;
  }
  return leftBytes.byteLength - rightBytes.byteLength;
}

function utf8Bytes(value: string): Uint8Array {
  return encoder.encode(value);
}
