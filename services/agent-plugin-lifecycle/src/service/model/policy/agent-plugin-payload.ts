import { Value } from "typebox/value";

import {
  contentDigest,
  type PayloadDigest,
  parsePayloadDigest,
  parseReleaseRelativePath,
  payloadDigest,
} from "../../shared/release/primitives";
import {
  type AgentPluginPayload,
  AgentPluginPayloadRecordSchema,
  AgentPluginPayloadSchema,
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  PAYLOAD_PROTOCOL_VERSION,
  type PayloadEntry,
  type PayloadManifestEntry,
} from "../dto/agent-plugin-payload";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { canonicalSerializePayloadEntries, payloadValue } from "./agent-plugin-payload-codec";
import { decodeBase64, encodeBase64 } from "./canonical-base64";
import { compareCanonicalText } from "./canonical-text-ordering";
import {
  manifestFromPayloadEntries,
  parseNormalizedFileMode,
  parsePayloadManifest,
  reportDuplicatePayloadPaths,
  samePayloadManifest,
} from "./payload-manifest";
import { releaseIssue, sortReleaseIssues } from "./release-issue";
import { asNonEmpty, collectReleaseResult, failure, success } from "./release-result";
import { admitClosedRecordForTraversal, parseBoundedArray } from "./release-value-admission";

/**
 * Owns caller-supplied payload bytes, derives canonical entries and identity,
 * and returns every construction diagnostic in stable order.
 */
export function createAgentPluginPayload(
  input: unknown
): ReleaseResult<AgentPluginPayload, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  const rawEntries = parseBoundedArray(
    input,
    "payload.entries",
    MAX_PAYLOAD_ENTRIES_PER_MEMBER,
    issues
  );
  const entries: PayloadEntry[] = [];
  let totalBytes = 0;

  rawEntries?.forEach((candidate, index) => {
    const path = `payload.entries[${index}]`;
    if (!admitClosedRecordForTraversal(candidate, ["bytes", "mode", "path"], path, issues)) return;
    const parsedPath = collectReleaseResult(
      parseReleaseRelativePath(candidate.path, `${path}.path`),
      issues
    );
    const mode = collectReleaseResult(
      parseNormalizedFileMode(candidate.mode, `${path}.mode`),
      issues
    );
    if (!(candidate.bytes instanceof Uint8Array)) {
      issues.push(
        releaseIssue("EXPECTED_BYTES", `${path}.bytes`, "Payload bytes must be a Uint8Array")
      );
      return;
    }
    const ownedBytes = new Uint8Array(candidate.bytes);
    totalBytes += ownedBytes.byteLength;
    if (parsedPath === undefined || mode === undefined) return;
    entries.push(
      Object.freeze({
        path: parsedPath,
        mode,
        bytesBase64: encodeBase64(ownedBytes),
        byteLength: ownedBytes.byteLength,
        contentDigest: contentDigest(ownedBytes),
      })
    );
  });

  return finishPayload(entries, totalBytes, issues);
}

/**
 * Verifies an untrusted payload wire value while preserving field-level
 * diagnostics, canonical ordering, bounds, and digest semantics.
 */
export function verifyAgentPluginPayload(
  input: unknown,
  path = "payload"
): ReleaseResult<AgentPluginPayload, ReleaseIssue> {
  const issues: ReleaseIssue[] = [];
  if (
    !admitClosedRecordForTraversal(
      input,
      ["entries", "manifest", "payloadDigest", "protocolVersion"],
      path,
      issues
    )
  ) {
    return failure([
      issues[0] ?? releaseIssue("EXPECTED_OBJECT", path, "Payload must be an object"),
    ]);
  }
  if (input.protocolVersion !== PAYLOAD_PROTOCOL_VERSION) {
    issues.push(
      releaseIssue(
        "INVALID_SCHEMA_VERSION",
        `${path}.protocolVersion`,
        "Unsupported payload protocol version",
        {
          expected: PAYLOAD_PROTOCOL_VERSION,
          actual:
            typeof input.protocolVersion === "number"
              ? input.protocolVersion
              : String(input.protocolVersion),
        }
      )
    );
  }
  const entries = parseWireEntries(input.entries, `${path}.entries`, issues);
  const manifest = parsePayloadManifest(input.manifest, `${path}.manifest`, issues);
  const claimedDigest = collectReleaseResult(
    parsePayloadDigest(input.payloadDigest, `${path}.payloadDigest`),
    issues
  );
  const totalBytes = entries?.reduce((total, entry) => total + entry.byteLength, 0) ?? 0;

  if (totalBytes > MAX_PAYLOAD_BYTES_PER_MEMBER) {
    issues.push(
      releaseIssue(
        "PAYLOAD_BYTES_LIMIT_EXCEEDED",
        `${path}.entries`,
        "Payload exceeds its decoded-byte limit",
        {
          expected: MAX_PAYLOAD_BYTES_PER_MEMBER,
          actual: totalBytes,
        }
      )
    );
  }
  if (
    entries !== undefined &&
    manifest !== undefined &&
    !samePayloadManifest(manifest, manifestFromPayloadEntries(entries))
  ) {
    issues.push(
      releaseIssue(
        "PAYLOAD_MANIFEST_MISMATCH",
        `${path}.manifest`,
        "Payload manifest differs from exact entries"
      )
    );
  }
  if (entries !== undefined && claimedDigest !== undefined) {
    const computed = payloadDigest(canonicalSerializePayloadEntries(entries));
    if (computed !== claimedDigest) {
      issues.push(
        releaseIssue(
          "PAYLOAD_DIGEST_MISMATCH",
          `${path}.payloadDigest`,
          "Claimed payload digest differs from exact entries",
          {
            expected: computed,
            actual: claimedDigest,
          }
        )
      );
    }
  }

  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  if (entries === undefined || manifest === undefined || claimedDigest === undefined) {
    return failure([
      releaseIssue("EXPECTED_OBJECT", path, "Payload validation did not produce a complete value"),
    ]);
  }
  return admitPayloadRecord(freezePayload(entries, manifest, claimedDigest), path);
}

/** Decodes one trusted entry into a fresh caller-owned byte array. */
export function payloadEntryBytes(entry: PayloadEntry): Uint8Array {
  const decoded = decodeBase64(entry.bytesBase64, "payload.entry.bytesBase64");
  if (!decoded.ok) throw new Error("Trusted payload entry contains invalid base64");
  return new Uint8Array(decoded.value);
}

function parseWireEntries(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): readonly PayloadEntry[] | undefined {
  const values = parseBoundedArray(input, path, MAX_PAYLOAD_ENTRIES_PER_MEMBER, issues);
  if (values === undefined) return undefined;
  const entries: PayloadEntry[] = [];
  values.forEach((candidate, index) => {
    const entryPath = `${path}[${index}]`;
    if (
      !admitClosedRecordForTraversal(candidate, ["bytesBase64", "mode", "path"], entryPath, issues)
    )
      return;
    const relativePath = collectReleaseResult(
      parseReleaseRelativePath(candidate.path, `${entryPath}.path`),
      issues
    );
    const mode = collectReleaseResult(
      parseNormalizedFileMode(candidate.mode, `${entryPath}.mode`),
      issues
    );
    const bytes = collectReleaseResult(
      decodeBase64(candidate.bytesBase64, `${entryPath}.bytesBase64`),
      issues
    );
    if (relativePath !== undefined && mode !== undefined && bytes !== undefined) {
      entries.push(
        Object.freeze({
          path: relativePath,
          mode,
          bytesBase64: encodeBase64(bytes),
          byteLength: bytes.byteLength,
          contentDigest: contentDigest(bytes),
        })
      );
    }
  });
  entries.sort((left, right) => compareCanonicalText(left.path, right.path));
  reportDuplicatePayloadPaths(entries, path, issues);
  return Object.freeze(entries);
}

function finishPayload(
  entries: PayloadEntry[],
  totalBytes: number,
  issues: ReleaseIssue[]
): ReleaseResult<AgentPluginPayload, ReleaseIssue> {
  entries.sort((left, right) => compareCanonicalText(left.path, right.path));
  reportDuplicatePayloadPaths(entries, "payload.entries", issues);
  if (totalBytes > MAX_PAYLOAD_BYTES_PER_MEMBER) {
    issues.push(
      releaseIssue(
        "PAYLOAD_BYTES_LIMIT_EXCEEDED",
        "payload.entries",
        "Payload exceeds its decoded-byte limit",
        {
          expected: MAX_PAYLOAD_BYTES_PER_MEMBER,
          actual: totalBytes,
        }
      )
    );
  }
  const nonEmpty = asNonEmpty(sortReleaseIssues(issues));
  if (nonEmpty !== undefined) return failure(nonEmpty);
  const frozenEntries = Object.freeze(entries);
  const manifest = manifestFromPayloadEntries(frozenEntries);
  const digest = payloadDigest(canonicalSerializePayloadEntries(frozenEntries));
  return admitPayloadRecord(freezePayload(frozenEntries, manifest, digest), "payload");
}

function freezePayload(
  entries: readonly PayloadEntry[],
  manifest: readonly PayloadManifestEntry[],
  digest: PayloadDigest
): AgentPluginPayload {
  return Object.freeze({
    protocolVersion: PAYLOAD_PROTOCOL_VERSION,
    manifest: Object.freeze([...manifest]),
    entries: Object.freeze([...entries]),
    payloadDigest: digest,
  }) as AgentPluginPayload;
}

function admitPayloadRecord(
  payload: AgentPluginPayload,
  path: string
): ReleaseResult<AgentPluginPayload, ReleaseIssue> {
  if (
    Value.Check(AgentPluginPayloadSchema, payload) &&
    Value.Check(AgentPluginPayloadRecordSchema, payloadValue(payload))
  ) {
    return success(payload);
  }
  return failure([
    releaseIssue(
      "EXPECTED_OBJECT",
      path,
      "Payload construction did not produce a TypeBox-valid wire record"
    ),
  ]);
}
