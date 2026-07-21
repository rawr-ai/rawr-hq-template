import {
  compareCanonicalText,
  parseArtifactRef,
  parseMechanicalEvidenceHandle,
} from "../../../../shared/release";
import type {
  RetentionInventoryEntry,
  RetentionIssue,
  RetentionPinsV1,
  RetentionRef,
  RetentionResult,
  RetentionSpacePolicyV1,
} from "../dto/retention";

const MAX_RETENTION_REFS = 16_384;

export function constructRetentionPlan(options: {
  readonly policy: RetentionSpacePolicyV1;
  readonly pinned: readonly RetentionRef[];
  readonly unpinned: readonly RetentionInventoryEntry[];
  readonly blockedEntries: readonly RetentionIssue[];
}): RetentionResult {
  if (
    options.policy.kind !== "space-v1"
    || !Number.isSafeInteger(options.policy.maximumUnpinnedBytes)
    || options.policy.maximumUnpinnedBytes < 0
  ) {
    return blockedRetention([{ detail: "retention space bound is invalid" }]);
  }
  const ordered = [...options.unpinned].sort((left, right) => {
    const bySize = right.storedBytes - left.storedBytes;
    return bySize !== 0 ? bySize : compareCanonicalText(retentionRefKey(left.ref), retentionRefKey(right.ref));
  });
  const total = ordered.reduce((sum, entry) => sum + entry.storedBytes, 0);
  let bytesToPlan = Math.max(0, total - options.policy.maximumUnpinnedBytes);
  const collectible: RetentionInventoryEntry[] = [];
  const retained: RetentionInventoryEntry[] = [];
  for (const entry of ordered) {
    if (bytesToPlan > 0 && entry.storedBytes > 0) {
      collectible.push(entry);
      bytesToPlan = Math.max(0, bytesToPlan - entry.storedBytes);
    } else {
      retained.push(entry);
    }
  }
  return {
    kind: "RetentionPlan",
    pinned: Object.freeze([...options.pinned].sort((left, right) => {
      return compareCanonicalText(retentionRefKey(left), retentionRefKey(right));
    })),
    retained: Object.freeze(retained),
    collectible: Object.freeze(collectible),
    blockedEntries: Object.freeze([...options.blockedEntries]),
  };
}

export function parseRetentionPinsV1(input: unknown):
  | Readonly<{ ok: true; value: RetentionPinsV1 }>
  | Readonly<{
    ok: false;
    issues: readonly [RetentionIssue, ...RetentionIssue[]];
  }> {
  if (!isExactRecord(input, ["refs", "schemaVersion"]) || input.schemaVersion !== 1 || !Array.isArray(input.refs)) {
    return { ok: false, issues: [{ detail: "retention pins must be a closed RetentionPinsV1 object" }] };
  }
  if (input.refs.length > MAX_RETENTION_REFS) {
    return { ok: false, issues: [{ detail: `retention pins exceed ${MAX_RETENTION_REFS} refs` }] };
  }
  const refs: RetentionRef[] = [];
  const issues: RetentionIssue[] = [];
  for (const candidate of input.refs) {
    const parsed = parseArtifactRef(candidate);
    if (parsed.ok) {
      refs.push(parsed.value);
      continue;
    }
    const evidence = parseMechanicalEvidenceHandle(candidate);
    if (evidence.ok) refs.push(evidence.value);
    else issues.push(Object.freeze({ detail: "retention pin is not a closed artifact or evidence ref" }));
  }
  if (issues.length > 0) {
    return { ok: false, issues: nonEmptyIssues(issues) };
  }
  const unique = new Map(refs.map((ref) => [retentionRefKey(ref), ref]));
  return {
    ok: true,
    value: Object.freeze({
      schemaVersion: 1,
      refs: Object.freeze([...unique.values()].sort((left, right) => {
        return compareCanonicalText(retentionRefKey(left), retentionRefKey(right));
      })),
    }),
  };
}

export function parseRetentionInventory(input: unknown): {
  readonly entries: readonly RetentionInventoryEntry[];
  readonly issues: readonly RetentionIssue[];
} {
  if (!Array.isArray(input)) return { entries: [], issues: [{ detail: "retention inventory must be an array" }] };
  if (input.length > MAX_RETENTION_REFS) {
    return { entries: [], issues: [{ detail: `retention inventory exceeds ${MAX_RETENTION_REFS} refs` }] };
  }
  const entries: RetentionInventoryEntry[] = [];
  const issues: RetentionIssue[] = [];
  const seen = new Set<string>();
  let aggregateBytes = 0;
  for (const candidate of input) {
    if (!isExactRecord(candidate, ["ref", "storedBytes"])) {
      issues.push(Object.freeze({ detail: "inventory entry is not closed" }));
      continue;
    }
    const artifactRef = parseArtifactRef(candidate.ref);
    const evidenceRef = artifactRef.ok ? undefined : parseMechanicalEvidenceHandle(candidate.ref);
    const ref = artifactRef.ok
      ? artifactRef.value
      : evidenceRef?.ok
        ? evidenceRef.value
        : undefined;
    if (ref === undefined || !Number.isSafeInteger(candidate.storedBytes) || (candidate.storedBytes as number) < 0) {
      issues.push(Object.freeze({ detail: "inventory entry has an invalid ref or byte count" }));
      continue;
    }
    const storedBytes = candidate.storedBytes as number;
    if (!Number.isSafeInteger(aggregateBytes + storedBytes)) {
      issues.push(Object.freeze({ ref, detail: "inventory aggregate byte count overflows" }));
      continue;
    }
    aggregateBytes += storedBytes;
    const key = retentionRefKey(ref);
    if (seen.has(key)) {
      issues.push(Object.freeze({ ref, detail: "inventory contains a duplicate ref" }));
      continue;
    }
    seen.add(key);
    entries.push(Object.freeze({ ref, storedBytes }));
  }
  return { entries: Object.freeze(entries), issues: Object.freeze(issues) };
}

function isExactRecord(input: unknown, keys: readonly string[]): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const actual = Object.keys(input).sort(compareCanonicalText);
  const expected = [...keys].sort(compareCanonicalText);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function retentionRefKey(ref: RetentionRef): string {
  return ref.kind === "release"
    ? `release:${ref.releaseDigest}:${ref.artifactDigest}`
    : ref.kind === "complete-set"
      ? `complete-set:${ref.releaseSetDigest}`
      : `mechanical-evidence:${ref.digest}`;
}

export function blockedRetention(
  issues: readonly RetentionIssue[],
): Extract<RetentionResult, { kind: "BlockedPinnedGraph" }> {
  return { kind: "BlockedPinnedGraph", issues: nonEmptyIssues(issues) };
}

function nonEmptyIssues(issues: readonly RetentionIssue[]): readonly [RetentionIssue, ...RetentionIssue[]] {
  const first = issues[0] ?? Object.freeze({ detail: "retention plan is blocked" });
  return Object.freeze([first, ...issues.slice(1)]);
}
