import type {
  CoworkV1ArchiveEncodingRequest,
  PackageArchiveEntry,
} from "@rawr/resource-agent-plugin-package-output";
import {
  type ArtifactRef,
  contentDigest,
  parseReleaseRelativePath,
  type VerifiedArtifactSnapshotV1,
  type VerifiedPayloadFileV1,
  type VerifiedReleaseArtifactV1,
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

export function assertSnapshotMatchesRef(
  snapshot: VerifiedArtifactSnapshotV1,
  ref: ArtifactRef
): void {
  if (snapshot.kind !== ref.kind || !sameArtifactRef(snapshot.ref, ref)) {
    throw new Error("Artifact reader returned a snapshot for a different reference");
  }
  if (snapshot.kind === "release") {
    assertReleaseSnapshot(snapshot);
    return;
  }

  if (snapshot.releaseSet.releaseSetDigest !== snapshot.ref.releaseSetDigest) {
    throw new Error("Complete-set snapshot envelope differs from its reference");
  }
  const verification = verifyCompleteReleaseSet(
    snapshot.releaseSet,
    snapshot.members.map((member) => member.release)
  );
  if (!verification.ok) {
    throw new Error(
      `Complete release-set verification failed: ${verification.issues.map((entry) => entry.code).join(",")}`
    );
  }
  for (const member of snapshot.members) assertReleaseSnapshot(member);
}

export function createCoworkV1ArchiveRequest(
  snapshot: VerifiedArtifactSnapshotV1
): CoworkV1ArchiveEncodingRequest {
  return Object.freeze({
    entries: collectCoworkEntries(snapshot),
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

function collectCoworkEntries(
  snapshot: VerifiedArtifactSnapshotV1
): readonly PackageArchiveEntry[] {
  assertCoworkV1ProtocolBounds(protocolEntrySizes(snapshot));
  const entries =
    snapshot.kind === "release"
      ? collectReleaseEntries(snapshot, "")
      : snapshot.members.flatMap((member) =>
          collectReleaseEntries(
            member,
            `plugins/${member.release.artifactBody.releaseBody.pluginId}/`
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
  snapshot: VerifiedArtifactSnapshotV1
): Generator<CoworkV1ProtocolEntrySize> {
  if (snapshot.kind === "release") {
    yield* releaseProtocolEntrySizes(snapshot, "");
    return;
  }
  for (const member of snapshot.members) {
    yield* releaseProtocolEntrySizes(
      member,
      `plugins/${member.release.artifactBody.releaseBody.pluginId}/`
    );
  }
}

function* releaseProtocolEntrySizes(
  snapshot: VerifiedReleaseArtifactV1,
  prefix: string
): Generator<CoworkV1ProtocolEntrySize> {
  for (const file of snapshot.files) {
    if (!(file.bytes instanceof Uint8Array)) {
      throw new Error("Cowork v1 entry bytes must be a Uint8Array before protocol accounting");
    }
    yield { path: `${prefix}${file.path}`, byteLength: file.bytes.byteLength };
  }
}

function collectReleaseEntries(
  snapshot: VerifiedReleaseArtifactV1,
  prefix: string
): PackageArchiveEntry[] {
  assertReleaseSnapshot(snapshot);
  return snapshot.files.map((file) => ({
    path: `${prefix}${file.path}`,
    mode: file.mode,
    bytes: new Uint8Array(file.bytes),
  }));
}

function assertReleaseSnapshot(snapshot: VerifiedReleaseArtifactV1): void {
  if (
    snapshot.ref.releaseDigest !== snapshot.release.releaseDigest ||
    snapshot.ref.artifactDigest !== snapshot.release.artifactDigest
  ) {
    throw new Error("Release snapshot envelope differs from its reference");
  }

  const manifest = snapshot.release.artifactBody.storageManifest;
  if (manifest.length !== snapshot.files.length) {
    throw new Error("Release snapshot file count differs from its storage manifest");
  }
  const orderedFiles = [...snapshot.files].sort((left, right) =>
    compareUtf8(left.path, right.path)
  );
  for (let index = 0; index < orderedFiles.length; index += 1) {
    const file = orderedFiles[index];
    const expected = manifest[index];
    if (file === undefined || expected === undefined) {
      throw new Error("Release snapshot manifest is incomplete");
    }
    assertPayloadFile(file);
    if (
      file.path !== expected.path ||
      file.mode !== expected.mode ||
      file.contentDigest !== expected.contentDigest ||
      file.bytes.byteLength !== expected.byteLength
    ) {
      throw new Error(`Release snapshot file ${file.path} differs from its storage manifest`);
    }
  }
}

function assertPayloadFile(file: VerifiedPayloadFileV1): void {
  const parsedPath = parseReleaseRelativePath(file.path);
  if (!parsedPath.ok || parsedPath.value !== file.path) {
    throw new Error("Artifact reader returned a non-canonical payload path");
  }
  if (file.mode !== 0o644 && file.mode !== 0o755) {
    throw new Error(`Artifact reader returned an invalid mode for ${file.path}`);
  }
  if (!(file.bytes instanceof Uint8Array) || contentDigest(file.bytes) !== file.contentDigest) {
    throw new Error(`Artifact reader returned mismatched bytes for ${file.path}`);
  }
}

function sameArtifactRef(left: ArtifactRef, right: ArtifactRef): boolean {
  if (left.kind !== right.kind) return false;
  return left.kind === "release" && right.kind === "release"
    ? left.releaseDigest === right.releaseDigest && left.artifactDigest === right.artifactDigest
    : left.kind === "complete-set" &&
        right.kind === "complete-set" &&
        left.releaseSetDigest === right.releaseSetDigest;
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
