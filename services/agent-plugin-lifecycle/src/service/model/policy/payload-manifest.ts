import { Value } from "typebox/value";

import {
  MAX_PAYLOAD_BYTES_PER_MEMBER,
  MAX_PAYLOAD_ENTRIES_PER_MEMBER,
  type NormalizedFileMode,
  NormalizedFileModeSchema,
  type PayloadEntry,
  type PayloadManifestEntry,
  PayloadManifestEntrySchema,
} from "../dto/agent-plugin-payload";
import type { CanonicalJsonValue } from "../dto/canonical-json";
import type { ReleaseRelativePath } from "../dto/release-identity";
import type { ReleaseIssue } from "../dto/release-issue";
import type { ReleaseResult } from "../dto/release-result";
import { compareCanonicalText } from "./canonical-text-ordering";
import { parseContentDigest } from "./release-digest";
import { parseReleaseRelativePath } from "./release-identity";
import { releaseIssue } from "./release-issue";
import { collectReleaseResult, failure, success } from "./release-result";
import {
  admitTypeBoxRecordForTraversal,
  parseBoundedArray,
  parseInteger,
} from "./release-value-admission";

/** Admits one normalized payload file mode with stable lifecycle diagnostics. */
export function parseNormalizedFileMode(
  value: unknown,
  path = "mode"
): ReleaseResult<NormalizedFileMode, ReleaseIssue> {
  if (!Value.Check(NormalizedFileModeSchema, value)) {
    return failure([
      typeof value === "number" && Number.isSafeInteger(value)
        ? releaseIssue("INVALID_MODE", path, "File mode must be normalized to 0644 or 0755", {
            expected: "0644|0755",
            actual: value,
          })
        : releaseIssue("EXPECTED_INTEGER", path, "Value must be a safe integer"),
    ]);
  }
  return success(value);
}

/**
 * Parses, canonically orders, freezes, and diagnoses one untrusted payload
 * manifest while retaining established field-level semantic diagnostics.
 */
export function parsePayloadManifest(
  input: unknown,
  path: string,
  issues: ReleaseIssue[]
): readonly PayloadManifestEntry[] | undefined {
  const values = parseBoundedArray(input, path, MAX_PAYLOAD_ENTRIES_PER_MEMBER, issues);
  if (values === undefined) return undefined;
  const manifest: PayloadManifestEntry[] = [];
  let structurallyComplete = true;
  values.forEach((candidate, index) => {
    const entryPath = `${path}[${index}]`;
    if (!admitTypeBoxRecordForTraversal(PayloadManifestEntrySchema, candidate, entryPath, issues)) {
      structurallyComplete = false;
      return;
    }
    const relativePath = collectReleaseResult(
      parseReleaseRelativePath(candidate.path, `${entryPath}.path`),
      issues
    );
    const mode = collectReleaseResult(
      parseNormalizedFileMode(candidate.mode, `${entryPath}.mode`),
      issues
    );
    const byteLength = parseInteger(candidate.byteLength, `${entryPath}.byteLength`, issues);
    const digest = collectReleaseResult(
      parseContentDigest(candidate.contentDigest, `${entryPath}.contentDigest`),
      issues
    );
    if (byteLength !== undefined && (byteLength < 0 || byteLength > MAX_PAYLOAD_BYTES_PER_MEMBER)) {
      issues.push(
        releaseIssue(
          "PAYLOAD_BYTES_LIMIT_EXCEEDED",
          `${entryPath}.byteLength`,
          "Entry byte length exceeds payload bound",
          {
            expected: MAX_PAYLOAD_BYTES_PER_MEMBER,
            actual: byteLength,
          }
        )
      );
    }
    if (
      relativePath !== undefined &&
      mode !== undefined &&
      byteLength !== undefined &&
      digest !== undefined
    ) {
      manifest.push(Object.freeze({ path: relativePath, mode, byteLength, contentDigest: digest }));
    }
  });
  manifest.sort((left, right) => compareCanonicalText(left.path, right.path));
  reportDuplicatePayloadPaths(manifest, path, issues);
  if (!structurallyComplete) return undefined;
  return Object.freeze(manifest);
}

/** Projects an exact payload manifest into its canonical JSON representation. */
export function payloadManifestValue(
  manifest: readonly PayloadManifestEntry[]
): CanonicalJsonValue {
  return manifest.map((entry) => ({
    path: entry.path,
    mode: entry.mode,
    byteLength: entry.byteLength,
    contentDigest: entry.contentDigest,
  }));
}

/** Compares two payload manifests by ordered length and every exact file field. */
export function samePayloadManifest(
  left: readonly PayloadManifestEntry[],
  right: readonly PayloadManifestEntry[]
): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => {
    const other = right[index];
    return (
      other !== undefined &&
      entry.path === other.path &&
      entry.mode === other.mode &&
      entry.byteLength === other.byteLength &&
      entry.contentDigest === other.contentDigest
    );
  });
}

/** Derives and freezes the exact manifest carried by canonical payload entries. */
export function manifestFromPayloadEntries(
  entries: readonly PayloadEntry[]
): readonly PayloadManifestEntry[] {
  return Object.freeze(
    entries.map((entry) =>
      Object.freeze({
        path: entry.path,
        mode: entry.mode,
        byteLength: entry.byteLength,
        contentDigest: entry.contentDigest,
      })
    )
  );
}

/** Reports every adjacent duplicate after canonical payload-path ordering. */
export function reportDuplicatePayloadPaths(
  entries: readonly { readonly path: ReleaseRelativePath }[],
  path: string,
  issues: ReleaseIssue[]
): void {
  for (let index = 1; index < entries.length; index += 1) {
    if (entries[index - 1]!.path === entries[index]!.path) {
      issues.push(
        releaseIssue(
          "DUPLICATE_PAYLOAD_PATH",
          path,
          `Duplicate payload path: ${entries[index]!.path}`
        )
      );
    }
  }
}
