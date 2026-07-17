import {
  contentDigest,
  parseReleaseRelativePath,
  type ContentDigest,
  type NormalizedFileMode,
  type ReleaseRelativePath,
} from "../../../../shared/release";

import { canonicalBytes, canonicalDigest, compareCanonical, equalBytes, type CanonicalValue } from "../domain/canonical";
import type { ProviderMarketplaceRegistration } from "../domain/marketplace";
import {
  memberValue,
  projectionValue,
  providerSourceTreeValue,
  renderProviderMarketplaceManifestFile,
  type AgentProviderProjection,
  type ProviderMemberFingerprint,
  type ProviderProjectionMember,
} from "../domain/projection";
import type { NativeMemberObservation } from "../domain/state";
import type { ImmutableProviderTreeFile } from "../ports/projection-storage";

const MEMBER_RECORD_PROTOCOL = "agent-provider-projection-member@v1";
const MANIFEST_RECORD_PROTOCOL = "agent-provider-projection-manifest@v1";
const MARKETPLACE_SOURCE_PROTOCOL = "agent-provider-marketplace-source@v1";

export interface DecodedProjectionMemberRecord {
  readonly memberFingerprint: ProviderMemberFingerprint;
  readonly member: Readonly<Record<string, unknown>>;
  readonly files: readonly Readonly<{
    path: ReleaseRelativePath;
    mode: NormalizedFileMode;
    contentDigest: ContentDigest;
  }>[];
}

export interface DecodedProjectionManifest {
  readonly memberFingerprints: readonly ProviderMemberFingerprint[];
}

export function validateProjectionPayload(projection: AgentProviderProjection): void {
  if (canonicalDigest("ap1_", projectionValue(projection)) !== projection.projectionDigest) {
    throw new Error("Provider projection digest is invalid");
  }
  for (const member of projection.members) validateProjectionMember(member);
  for (const file of projection.marketplace.files) validatePayloadFile(file);
  if (canonicalDigest(
    "ps1_",
    providerSourceTreeValue(projection.marketplace.files, projection.members),
  ) !== projection.marketplace.sourceDigest) {
    throw new Error("Provider projection source digest is invalid");
  }
}

export function projectionMemberRecordBytes(member: ProviderProjectionMember): Uint8Array {
  validateProjectionMember(member);
  return canonicalBytes({
    protocol: MEMBER_RECORD_PROTOCOL,
    schemaVersion: 1,
    memberFingerprint: member.memberFingerprint,
    member: memberValue(member),
  });
}

export function projectionManifestRecordBytes(projection: AgentProviderProjection): Uint8Array {
  validateProjectionPayload(projection);
  return canonicalBytes({
    protocol: MANIFEST_RECORD_PROTOCOL,
    schemaVersion: 1,
    projectionDigest: projection.projectionDigest,
    projection: projectionValue(projection),
    memberFingerprints: projection.members.map((member) => member.memberFingerprint),
  });
}

export function decodeProjectionManifest(
  bytes: Uint8Array,
  projectionDigest: AgentProviderProjection["projectionDigest"],
): DecodedProjectionManifest {
  const decoded = decodeCanonicalRecord(bytes, "Projection manifest");
  requireExactKeys(decoded, [
    "memberFingerprints",
    "projection",
    "projectionDigest",
    "protocol",
    "schemaVersion",
  ]);
  const projection = requireRecord(decoded.projection, "Projection manifest value");
  const members = requireArray(projection.members, "Projection manifest members");
  const memberFingerprints = requireArray(
    decoded.memberFingerprints,
    "Projection manifest member fingerprints",
  ).map((value, index) => requireFingerprint(value, `Projection manifest member fingerprints[${index}]`));
  const projectedFingerprints = members.map((value, index) => {
    const member = requireRecord(value, `Projection manifest member[${index}]`);
    return requireFingerprint(member.memberFingerprint, `Projection manifest member[${index}].memberFingerprint`);
  });
  if (
    decoded.protocol !== MANIFEST_RECORD_PROTOCOL
    || decoded.schemaVersion !== 1
    || decoded.projectionDigest !== projectionDigest
    || canonicalDigest("ap1_", projection as CanonicalValue) !== projectionDigest
    || !sameStrings(memberFingerprints, projectedFingerprints)
  ) {
    throw new Error("Projection manifest does not bind its semantic projection");
  }
  return Object.freeze({ memberFingerprints: Object.freeze(memberFingerprints) });
}

export function decodeProjectionMemberRecord(
  bytes: Uint8Array,
  memberFingerprint: ProviderMemberFingerprint,
): DecodedProjectionMemberRecord {
  const decoded = decodeCanonicalRecord(bytes, "Projection member record");
  requireExactKeys(decoded, ["member", "memberFingerprint", "protocol", "schemaVersion"]);
  const member = requireRecord(decoded.member, "Projection member value");
  requireExactKeys(member, [
    "artifactAuthority",
    "files",
    "memberFingerprint",
    "nativeIdentity",
    "pluginId",
    "providerSourceIdentity",
    "releaseRef",
    "visible",
  ]);
  const { memberFingerprint: _memberFingerprint, ...fingerprintBody } = member;
  if (
    decoded.protocol !== MEMBER_RECORD_PROTOCOL
    || decoded.schemaVersion !== 1
    || decoded.memberFingerprint !== memberFingerprint
    || member.memberFingerprint !== memberFingerprint
    || canonicalDigest("pm1_", fingerprintBody as CanonicalValue) !== memberFingerprint
  ) {
    throw new Error("Projection member record does not bind its semantic fingerprint");
  }
  const files = requireArray(member.files, "Projection member file table").map((value, index) => {
    const file = requireRecord(value, `Projection member file[${index}]`);
    requireExactKeys(file, ["contentDigest", "mode", "path"]);
    const parsedPath = parseReleaseRelativePath(file.path, `projection.member.files[${index}].path`);
    if (
      !parsedPath.ok
      || (file.mode !== 0o644 && file.mode !== 0o755)
      || typeof file.contentDigest !== "string"
      || !/^sha256_[0-9a-f]{64}$/u.test(file.contentDigest)
    ) {
      throw new Error("Projection member record has an invalid file table");
    }
    return Object.freeze({
      path: parsedPath.value,
      mode: file.mode as NormalizedFileMode,
      contentDigest: file.contentDigest as ContentDigest,
    });
  });
  return Object.freeze({ memberFingerprint, member, files: Object.freeze(files) });
}

export function memberTreeFiles(member: ProviderProjectionMember): readonly ImmutableProviderTreeFile[] {
  validateProjectionMember(member);
  return Object.freeze(member.files.map((file) => Object.freeze({
    path: file.path,
    mode: file.mode,
    bytes: new Uint8Array(file.bytes),
  })));
}

export function validateMemberTree(
  record: DecodedProjectionMemberRecord,
  files: readonly ImmutableProviderTreeFile[],
): void {
  const actual = canonicalTree(files);
  if (actual.length !== record.files.length) {
    throw new Error("Projection member tree has an unexpected file count");
  }
  for (const [index, expected] of record.files.entries()) {
    const observed = actual[index];
    if (
      observed === undefined
      || observed.path !== expected.path
      || observed.mode !== expected.mode
      || contentDigest(observed.bytes) !== expected.contentDigest
    ) {
      throw new Error(`Projection member tree differs at ${expected.path}`);
    }
  }
}

export function validatePriorMemberRecord(
  record: DecodedProjectionMemberRecord,
  prior: NativeMemberObservation,
): void {
  const authority = requireRecord(record.member.artifactAuthority, "Projection member artifact authority");
  const visible = requireRecord(record.member.visible, "Projection member visibility");
  if (
    record.member.pluginId !== prior.pluginId
    || record.member.nativeIdentity !== prior.nativeIdentity
    || record.member.providerSourceIdentity !== prior.providerSourceIdentity
    || authority.protocol !== prior.artifactAuthority.protocol
    || authority.contentAuthority !== prior.artifactAuthority.contentAuthority
    || authority.sourceCommit !== prior.artifactAuthority.sourceCommit
    || visible.pluginIdentity !== prior.nativeIdentity
    || !sameStrings(requireStringArray(visible.skills), prior.visibleSkills)
    || !sameStrings(requireStringArray(visible.hooks), prior.visibleHooks)
  ) {
    throw new Error("Projection member record does not bind the exact prior native member");
  }
}

export function marketplaceTreeFiles(
  registration: ProviderMarketplaceRegistration,
  memberTrees: ReadonlyMap<ProviderMemberFingerprint, readonly ImmutableProviderTreeFile[]>,
): readonly ImmutableProviderTreeFile[] {
  const files: ImmutableProviderTreeFile[] = [];
  const marketplace = renderProviderMarketplaceManifestFile(
    registration.provider,
    registration.marketplaceIdentity,
    registration.members,
  );
  files.push(treeFile(marketplace.path, marketplace.bytes, marketplace.mode));
  files.push(treeFile(".rawr/marketplace.json", canonicalBytes({
    protocol: MARKETPLACE_SOURCE_PROTOCOL,
    provider: registration.provider,
    marketplaceIdentity: registration.marketplaceIdentity,
    projectionDigest: registration.projectionDigest,
    sourceDigest: registration.sourceDigest,
    members: registration.members.map((member) => ({
      pluginId: member.pluginId,
      nativeIdentity: member.nativeIdentity,
      providerSourceIdentity: member.providerSourceIdentity,
      sourceProjectionDigest: member.sourceProjectionDigest,
      memberFingerprint: member.memberFingerprint,
    })),
  })));
  for (const member of registration.members) {
    const tree = memberTrees.get(member.memberFingerprint);
    if (tree === undefined) throw new Error(`Marketplace member tree is absent: ${member.pluginId}`);
    for (const file of tree) {
      files.push(treeFile(`plugins/${member.pluginId}/${file.path}`, file.bytes, file.mode));
    }
  }
  return canonicalTree(files);
}

export function sameTree(
  left: readonly ImmutableProviderTreeFile[],
  right: readonly ImmutableProviderTreeFile[],
): boolean {
  const a = canonicalTree(left);
  const b = canonicalTree(right);
  return a.length === b.length && a.every((file, index) => {
    const other = b[index];
    return other !== undefined
      && file.path === other.path
      && file.mode === other.mode
      && equalBytes(file.bytes, other.bytes);
  });
}

function validateProjectionMember(member: ProviderProjectionMember): void {
  const value = memberValue(member);
  if (!isRecord(value)) throw new Error("Projection member value is invalid");
  const { memberFingerprint: _memberFingerprint, ...fingerprintBody } = value;
  if (canonicalDigest("pm1_", fingerprintBody) !== member.memberFingerprint) {
    throw new Error("Projection member fingerprint is invalid");
  }
  for (const file of member.files) validatePayloadFile(file);
}

function validatePayloadFile(file: Readonly<{ path: string; mode: number; contentDigest: string; bytes: Uint8Array }>): void {
  const parsed = parseReleaseRelativePath(file.path, "providerPackage.path");
  if (
    !parsed.ok
    || (file.mode !== 0o644 && file.mode !== 0o755)
    || contentDigest(file.bytes) !== file.contentDigest
  ) {
    throw new Error(`Provider package file is invalid: ${file.path}`);
  }
}

function decodeCanonicalRecord(bytes: Uint8Array, label: string): Record<string, unknown> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} is not canonical UTF-8 JSON`);
  }
  const record = requireRecord(decoded, label);
  if (!equalBytes(canonicalBytes(record as CanonicalValue), bytes)) {
    throw new Error(`${label} is not canonical JSON`);
  }
  return record;
}

function canonicalTree(files: readonly ImmutableProviderTreeFile[]): readonly ImmutableProviderTreeFile[] {
  const canonical = files.map((file) => {
    const path = parseReleaseRelativePath(file.path, "providerTree.path");
    if (!path.ok || (file.mode !== 0o644 && file.mode !== 0o755)) {
      throw new Error(`Provider tree file is invalid: ${file.path}`);
    }
    return Object.freeze({ path: path.value, mode: file.mode, bytes: new Uint8Array(file.bytes) });
  }).sort((left, right) => compareCanonical(left.path, right.path));
  for (let index = 1; index < canonical.length; index += 1) {
    if (canonical[index - 1]?.path === canonical[index]?.path) {
      throw new Error(`Provider tree contains duplicate path: ${canonical[index]?.path}`);
    }
  }
  return Object.freeze(canonical);
}

function treeFile(
  pathValue: string,
  bytes: Uint8Array,
  mode: NormalizedFileMode = 0o644,
): ImmutableProviderTreeFile {
  const path = parseReleaseRelativePath(pathValue, "providerTree.path");
  if (!path.ok) throw new Error(`Provider tree path is invalid: ${pathValue}`);
  return Object.freeze({ path: path.value, mode, bytes: new Uint8Array(bytes) });
}

function requireFingerprint(value: unknown, label: string): ProviderMemberFingerprint {
  if (typeof value !== "string" || !/^pm1_[0-9a-f]{64}$/u.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value as ProviderMemberFingerprint;
}

function requireStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw new Error("Projection member visibility is invalid");
  }
  return Object.freeze([...value] as string[]);
}

function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(record).sort(compareCanonical);
  const sorted = [...expected].sort(compareCanonical);
  if (!sameStrings(actual, sorted)) throw new Error("Projection record has an unexpected shape");
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
