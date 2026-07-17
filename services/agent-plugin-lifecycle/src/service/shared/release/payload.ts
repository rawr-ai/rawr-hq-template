import {
  canonicalJsonLine,
  decodeBase64,
  encodeBase64,
  type CanonicalJsonValue,
} from "./canonical";
import { issue, sortReleaseIssues, type ReleaseIssue } from "./issues";
import { collect, isExactRecord, parseBoundedArray, parseInteger } from "./parse";
import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  PAYLOAD_PROTOCOL_VERSION,
  compareCanonicalText,
  contentDigest,
  parseContentDigest,
  parseNormalizedFileMode,
  parsePayloadDigest,
  parseReleaseRelativePath,
  payloadDigest,
  type ContentDigest,
  type NormalizedFileMode,
  type PayloadDigest,
  type PayloadProtocolVersion,
  type ReleaseRelativePath,
} from "./primitives";
import { asNonEmpty, failure, success, type ReleaseResult } from "./result";

declare const agentPluginPayloadBrand: unique symbol;

export interface PayloadEntryInput {
  readonly path: unknown;
  readonly mode: unknown;
  readonly bytes: unknown;
}

export interface PayloadEntry {
  readonly path: ReleaseRelativePath;
  readonly mode: NormalizedFileMode;
  readonly bytesBase64: string;
  readonly byteLength: number;
  readonly contentDigest: ContentDigest;
}

export interface PayloadManifestEntry {
  readonly path: ReleaseRelativePath;
  readonly mode: NormalizedFileMode;
  readonly byteLength: number;
  readonly contentDigest: ContentDigest;
}

export type AgentPluginPayload = Readonly<{
  protocolVersion: PayloadProtocolVersion;
  manifest: readonly PayloadManifestEntry[];
  entries: readonly PayloadEntry[];
  payloadDigest: PayloadDigest;
  [agentPluginPayloadBrand]: "AgentPluginPayload";
}>;

export function createAgentPluginPayload(
  input: unknown,
): ReleaseResult<AgentPluginPayload, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const rawEntries = parseBoundedArray(
    input,
    "payload.entries",
    MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    issues,
  );
  const entries: PayloadEntry[] = [];
  let totalBytes = 0;

  rawEntries?.forEach((candidate, index) => {
    const path = `payload.entries[${index}]`;
    if (!isExactRecord(candidate, ["bytes", "mode", "path"], path, issues)) return;
    const parsedPath = collect(parseReleaseRelativePath(candidate.path, `${path}.path`), issues);
    const mode = collect(parseNormalizedFileMode(candidate.mode, `${path}.mode`), issues);
    if (!(candidate.bytes instanceof Uint8Array)) {
      issues.push(issue("EXPECTED_BYTES", `${path}.bytes`, "Payload bytes must be a Uint8Array"));
      return;
    }
    const ownedBytes = new Uint8Array(candidate.bytes);
    totalBytes += ownedBytes.byteLength;
    if (parsedPath === undefined || mode === undefined) return;
    entries.push(Object.freeze({
      path: parsedPath,
      mode,
      bytesBase64: encodeBase64(ownedBytes),
      byteLength: ownedBytes.byteLength,
      contentDigest: contentDigest(ownedBytes),
    }));
  });

  return finishPayload(entries, totalBytes, issues);
}

export function verifyAgentPluginPayload(
  input: unknown,
  path = "payload",
): ReleaseResult<AgentPluginPayload, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (!isExactRecord(input, ["entries", "manifest", "payloadDigest", "protocolVersion"], path, issues)) {
    return failure([issues[0] ?? issue("EXPECTED_OBJECT", path, "Payload must be an object")]);
  }
  if (input.protocolVersion !== PAYLOAD_PROTOCOL_VERSION) {
    issues.push(issue("INVALID_SCHEMA_VERSION", `${path}.protocolVersion`, "Unsupported payload protocol version", {
      expected: PAYLOAD_PROTOCOL_VERSION,
      actual: typeof input.protocolVersion === "number" ? input.protocolVersion : String(input.protocolVersion),
    }));
  }
  const entries = parseWireEntries(input.entries, `${path}.entries`, issues);
  const manifest = parsePayloadManifest(input.manifest, `${path}.manifest`, issues);
  const claimedDigest = collect(parsePayloadDigest(input.payloadDigest, `${path}.payloadDigest`), issues);
  const totalBytes = entries?.reduce((total, entry) => total + entry.byteLength, 0) ?? 0;

  if (totalBytes > MAX_PAYLOAD_BYTES_PER_MEMBER) {
    issues.push(issue("PAYLOAD_BYTES_LIMIT_EXCEEDED", `${path}.entries`, "Payload exceeds its decoded-byte limit", {
      expected: MAX_PAYLOAD_BYTES_PER_MEMBER,
      actual: totalBytes,
    }));
  }
  if (entries !== undefined && manifest !== undefined && !sameManifest(manifest, manifestFromEntries(entries))) {
    issues.push(issue("PAYLOAD_MANIFEST_MISMATCH", `${path}.manifest`, "Payload manifest differs from exact entries"));
  }
  if (entries !== undefined && claimedDigest !== undefined) {
    const computed = payloadDigest(canonicalSerializePayloadEntries(entries));
    if (computed !== claimedDigest) {
      issues.push(issue("PAYLOAD_DIGEST_MISMATCH", `${path}.payloadDigest`, "Claimed payload digest differs from exact entries", {
        expected: computed,
        actual: claimedDigest,
      }));
    }
  }

  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (entries === undefined || manifest === undefined || claimedDigest === undefined) {
    return failure([issue("EXPECTED_OBJECT", path, "Payload validation did not produce a complete value")]);
  }
  return success(freezePayload(entries, manifest, claimedDigest));
}

export function canonicalSerializePayloadEntries(entries: readonly PayloadEntry[]): Uint8Array {
  return canonicalJsonLine(payloadEntriesValue(entries));
}

export function canonicalSerializeAgentPluginPayload(payload: AgentPluginPayload): Uint8Array {
  return canonicalJsonLine(payloadValue(payload));
}

export function payloadEntryBytes(entry: PayloadEntry): Uint8Array {
  const decoded = decodeBase64(entry.bytesBase64, "payload.entry.bytesBase64");
  if (!decoded.ok) throw new Error("Trusted payload entry contains invalid base64");
  return new Uint8Array(decoded.value);
}

export function payloadManifestValue(manifest: readonly PayloadManifestEntry[]): CanonicalJsonValue {
  return manifest.map((entry) => ({
    path: entry.path,
    mode: entry.mode,
    byteLength: entry.byteLength,
    contentDigest: entry.contentDigest,
  }));
}

export function payloadEntriesValue(entries: readonly PayloadEntry[]): CanonicalJsonValue {
  return entries.map((entry) => ({
    path: entry.path,
    mode: entry.mode,
    bytesBase64: entry.bytesBase64,
  }));
}

export function payloadValue(payload: AgentPluginPayload): CanonicalJsonValue {
  return {
    protocolVersion: payload.protocolVersion,
    manifest: payloadManifestValue(payload.manifest),
    entries: payloadEntriesValue(payload.entries),
    payloadDigest: payload.payloadDigest,
  };
}

export function parsePayloadManifest(
  input: unknown,
  path: string,
  issues: ReleaseIssue[],
): readonly PayloadManifestEntry[] | undefined {
  const values = parseBoundedArray(input, path, MAX_PAYLOAD_ENTRIES_PER_MEMBER, issues);
  if (values === undefined) return undefined;
  const manifest: PayloadManifestEntry[] = [];
  values.forEach((candidate, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isExactRecord(candidate, ["byteLength", "contentDigest", "mode", "path"], entryPath, issues)) return;
    const relativePath = collect(parseReleaseRelativePath(candidate.path, `${entryPath}.path`), issues);
    const mode = collect(parseNormalizedFileMode(candidate.mode, `${entryPath}.mode`), issues);
    const byteLength = parseInteger(candidate.byteLength, `${entryPath}.byteLength`, issues);
    const digest = collect(parseContentDigest(candidate.contentDigest, `${entryPath}.contentDigest`), issues);
    if (byteLength !== undefined && (byteLength < 0 || byteLength > MAX_PAYLOAD_BYTES_PER_MEMBER)) {
      issues.push(issue("PAYLOAD_BYTES_LIMIT_EXCEEDED", `${entryPath}.byteLength`, "Entry byte length exceeds payload bound", {
        expected: MAX_PAYLOAD_BYTES_PER_MEMBER,
        actual: byteLength,
      }));
    }
    if (relativePath !== undefined && mode !== undefined && byteLength !== undefined && digest !== undefined) {
      manifest.push(Object.freeze({ path: relativePath, mode, byteLength, contentDigest: digest }));
    }
  });
  manifest.sort((left, right) => compareCanonicalText(left.path, right.path));
  reportDuplicatePaths(manifest, path, issues);
  return Object.freeze(manifest);
}

function parseWireEntries(
  input: unknown,
  path: string,
  issues: ReleaseIssue[],
): readonly PayloadEntry[] | undefined {
  const values = parseBoundedArray(input, path, MAX_PAYLOAD_ENTRIES_PER_MEMBER, issues);
  if (values === undefined) return undefined;
  const entries: PayloadEntry[] = [];
  values.forEach((candidate, index) => {
    const entryPath = `${path}[${index}]`;
    if (!isExactRecord(candidate, ["bytesBase64", "mode", "path"], entryPath, issues)) return;
    const relativePath = collect(parseReleaseRelativePath(candidate.path, `${entryPath}.path`), issues);
    const mode = collect(parseNormalizedFileMode(candidate.mode, `${entryPath}.mode`), issues);
    const bytes = collect(decodeBase64(candidate.bytesBase64, `${entryPath}.bytesBase64`), issues);
    if (relativePath !== undefined && mode !== undefined && bytes !== undefined) {
      entries.push(Object.freeze({
        path: relativePath,
        mode,
        bytesBase64: encodeBase64(bytes),
        byteLength: bytes.byteLength,
        contentDigest: contentDigest(bytes),
      }));
    }
  });
  entries.sort((left, right) => compareCanonicalText(left.path, right.path));
  reportDuplicatePaths(entries, path, issues);
  return Object.freeze(entries);
}

function finishPayload(
  entries: PayloadEntry[],
  totalBytes: number,
  issues: ReleaseIssue[],
): ReleaseResult<AgentPluginPayload, ReleaseIssue> {
  entries.sort((left, right) => compareCanonicalText(left.path, right.path));
  reportDuplicatePaths(entries, "payload.entries", issues);
  if (totalBytes > MAX_PAYLOAD_BYTES_PER_MEMBER) {
    issues.push(issue("PAYLOAD_BYTES_LIMIT_EXCEEDED", "payload.entries", "Payload exceeds its decoded-byte limit", {
      expected: MAX_PAYLOAD_BYTES_PER_MEMBER,
      actual: totalBytes,
    }));
  }
  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  const frozenEntries = Object.freeze(entries);
  const manifest = manifestFromEntries(frozenEntries);
  const digest = payloadDigest(canonicalSerializePayloadEntries(frozenEntries));
  return success(freezePayload(frozenEntries, manifest, digest));
}

function freezePayload(
  entries: readonly PayloadEntry[],
  manifest: readonly PayloadManifestEntry[],
  digest: PayloadDigest,
): AgentPluginPayload {
  return Object.freeze({
    protocolVersion: PAYLOAD_PROTOCOL_VERSION,
    manifest: Object.freeze([...manifest]),
    entries: Object.freeze([...entries]),
    payloadDigest: digest,
  }) as AgentPluginPayload;
}

function manifestFromEntries(entries: readonly PayloadEntry[]): readonly PayloadManifestEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({
    path: entry.path,
    mode: entry.mode,
    byteLength: entry.byteLength,
    contentDigest: entry.contentDigest,
  })));
}

function sameManifest(left: readonly PayloadManifestEntry[], right: readonly PayloadManifestEntry[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && entry.path === other.path
      && entry.mode === other.mode
      && entry.byteLength === other.byteLength
      && entry.contentDigest === other.contentDigest;
  });
}

function reportDuplicatePaths(
  entries: readonly { readonly path: ReleaseRelativePath }[],
  path: string,
  issues: ReleaseIssue[],
): void {
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1]!.path === entries[index]!.path) {
      issues.push(issue("DUPLICATE_PAYLOAD_PATH", path, `Duplicate payload path: ${entries[index]!.path}`));
    }
  }
}
