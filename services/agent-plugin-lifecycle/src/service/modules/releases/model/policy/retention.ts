import { Value } from "typebox/value";

import {
  compareCanonicalText,
  normalizeArtifactRef,
  normalizeMechanicalEvidenceHandle,
  type ArtifactRef,
  type MechanicalEvidenceHandleV1,
} from "../../../../shared/release";
import type {
  RetentionIssue,
  RetentionRef,
  RetentionResult,
  RetentionSpacePolicyV1,
} from "../dto/retention";
import {
  MAX_RETENTION_REFS,
  PlanRetentionInputSchema,
  RetentionInventorySchema,
  RetentionPinsV1Schema,
} from "../dto/retention";

export type NormalizedRetentionRef = ArtifactRef | MechanicalEvidenceHandleV1;

export interface NormalizedRetentionInventoryEntry {
  readonly ref: NormalizedRetentionRef;
  readonly storedBytes: number;
}

interface ParsedRetentionPinsV1 {
  readonly schemaVersion: 1;
  readonly refs: readonly NormalizedRetentionRef[];
}

export function constructRetentionPlan(options: {
  readonly policy: RetentionSpacePolicyV1;
  readonly pinned: readonly NormalizedRetentionRef[];
  readonly unpinned: readonly NormalizedRetentionInventoryEntry[];
  readonly blockedEntries: readonly RetentionIssue[];
}): RetentionResult {
  if (!Value.Check(PlanRetentionInputSchema, options.policy)) {
    return blockedRetentionPlan([{ detail: "retention space bound is invalid" }]);
  }
  if (
    options.pinned.length > MAX_RETENTION_REFS
    || options.unpinned.length > MAX_RETENTION_REFS
    || options.blockedEntries.length > MAX_RETENTION_REFS
  ) {
    return blockedRetentionPlan([{
      detail: `retention plan exceeds ${MAX_RETENTION_REFS} refs`,
    }]);
  }
  const ordered = [...options.unpinned].sort((left, right) => {
    const bySize = right.storedBytes - left.storedBytes;
    return bySize !== 0 ? bySize : compareCanonicalText(retentionRefKey(left.ref), retentionRefKey(right.ref));
  });
  const total = ordered.reduce((sum, entry) => sum + entry.storedBytes, 0);
  let bytesToPlan = Math.max(0, total - options.policy.maximumUnpinnedBytes);
  const collectible: NormalizedRetentionInventoryEntry[] = [];
  const retained: NormalizedRetentionInventoryEntry[] = [];
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
  | Readonly<{ ok: true; value: ParsedRetentionPinsV1 }>
  | Readonly<{
    ok: false;
    issues: readonly [RetentionIssue, ...RetentionIssue[]];
  }> {
  if (!Value.Check(RetentionPinsV1Schema, input)) {
    return { ok: false, issues: [{ detail: "retention pins must match RetentionPinsV1" }] };
  }
  const refs: NormalizedRetentionRef[] = [];
  for (const candidate of input.refs) {
    refs.push(candidate.kind === "mechanical-evidence"
      ? normalizeMechanicalEvidenceHandle(candidate)
      : normalizeArtifactRef(candidate));
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
  readonly entries: readonly NormalizedRetentionInventoryEntry[];
  readonly issues: readonly RetentionIssue[];
} {
  if (!Value.Check(RetentionInventorySchema, input)) {
    return { entries: [], issues: [{ detail: "retention inventory must match its closed bounded schema" }] };
  }
  const entries: NormalizedRetentionInventoryEntry[] = [];
  const issues: RetentionIssue[] = [];
  const seen = new Set<string>();
  let aggregateBytes = 0;
  for (const candidate of input) {
    const ref = candidate.ref.kind === "mechanical-evidence"
      ? normalizeMechanicalEvidenceHandle(candidate.ref)
      : normalizeArtifactRef(candidate.ref);
    const storedBytes = candidate.storedBytes;
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

export function retentionRefKey(ref: RetentionRef): string {
  return ref.kind === "release"
    ? `release:${ref.releaseDigest}:${ref.artifactDigest}`
    : ref.kind === "complete-set"
      ? `complete-set:${ref.releaseSetDigest}`
      : `mechanical-evidence:${ref.digest}`;
}

export function blockedRetentionPlan(
  issues: readonly RetentionIssue[],
): Extract<RetentionResult, { kind: "RetentionPlanBlocked" }> {
  return { kind: "RetentionPlanBlocked", issues: nonEmptyIssues(issues) };
}

function nonEmptyIssues(issues: readonly RetentionIssue[]): readonly [RetentionIssue, ...RetentionIssue[]] {
  const first = issues[0] ?? Object.freeze({ detail: "retention plan is blocked" });
  return Object.freeze([first, ...issues.slice(1)]);
}
