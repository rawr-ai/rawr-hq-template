import {
  compareCanonicalText,
  parseArtifactRef,
  type ArtifactRef,
  type CompleteSetArtifactRef,
  type ReleaseArtifactRef,
} from "@rawr/agent-plugin-release";

import type { ArtifactReader } from "./artifact-store/artifact-reader";

const MAX_RETENTION_REFS = 16_384;

export interface RetentionIssue {
  readonly ref?: ArtifactRef;
  readonly detail: string;
}

export interface RetentionPinsV1 {
  readonly schemaVersion: 1;
  readonly refs: readonly (ReleaseArtifactRef | CompleteSetArtifactRef)[];
}

export interface RetentionPinsReader {
  read(): Promise<unknown>;
}

export interface RetentionInventoryReader {
  read(): Promise<unknown>;
}

export interface RetentionInventoryEntry {
  readonly ref: ArtifactRef;
  readonly storedBytes: number;
}

export interface RetentionSpacePolicyV1 {
  readonly kind: "space-v1";
  readonly maximumUnpinnedBytes: number;
}

export type RetentionResult =
  | Readonly<{
    kind: "RetentionPlan";
    pinned: readonly ArtifactRef[];
    retained: readonly RetentionInventoryEntry[];
    collectible: readonly RetentionInventoryEntry[];
    blockedEntries: readonly RetentionIssue[];
  }>
  | Readonly<{
    kind: "BlockedPinnedGraph";
    issues: readonly [RetentionIssue, ...RetentionIssue[]];
  }>;

export interface RetentionPlanner {
  plan(policy: RetentionSpacePolicyV1): Promise<RetentionResult>;
}

export function createRetentionPlanner(options: {
  readonly pins: RetentionPinsReader;
  readonly inventory: RetentionInventoryReader;
  readonly artifacts: ArtifactReader;
}): RetentionPlanner {
  const planner: RetentionPlanner = {
    async plan(policy) {
      if (!Number.isSafeInteger(policy.maximumUnpinnedBytes) || policy.maximumUnpinnedBytes < 0) {
        return blocked([{ detail: "retention space bound is invalid" }]);
      }
      const pins = parseRetentionPinsV1(await options.pins.read());
      if (!pins.ok) return blocked(pins.issues);

      const pinned = new Map<string, ArtifactRef>();
      const pinIssues: RetentionIssue[] = [];
      for (const ref of pins.value.refs) {
        const result = await options.artifacts.read(ref);
        if (result.kind !== "Verified") {
          pinIssues.push(Object.freeze({ ref, detail: `pinned artifact is ${result.kind.toLowerCase()}` }));
          continue;
        }
        pinned.set(refKey(ref), ref);
        if (result.snapshot.kind === "complete-set") {
          for (const member of result.snapshot.members) pinned.set(refKey(member.ref), member.ref);
        }
      }
      if (pinIssues.length > 0) {
        return blocked(pinIssues);
      }

      const inventory = parseInventory(await options.inventory.read());
      const blockedEntries: RetentionIssue[] = [...inventory.issues];
      const unpinned: RetentionInventoryEntry[] = [];
      for (const entry of inventory.entries) {
        if (pinned.has(refKey(entry.ref))) continue;
        const verified = await options.artifacts.read(entry.ref);
        if (verified.kind !== "Verified") {
          blockedEntries.push(Object.freeze({ ref: entry.ref, detail: `inventory artifact is ${verified.kind.toLowerCase()}` }));
          continue;
        }
        unpinned.push(entry);
      }

      const ordered = [...unpinned].sort((left, right) => {
        const bySize = right.storedBytes - left.storedBytes;
        return bySize !== 0 ? bySize : compareCanonicalText(refKey(left.ref), refKey(right.ref));
      });
      const total = ordered.reduce((sum, entry) => sum + entry.storedBytes, 0);
      let bytesToPlan = Math.max(0, total - policy.maximumUnpinnedBytes);
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
        pinned: Object.freeze([...pinned.values()].sort((left, right) => compareCanonicalText(refKey(left), refKey(right)))),
        retained: Object.freeze(retained),
        collectible: Object.freeze(collectible),
        blockedEntries: Object.freeze(blockedEntries),
      };
    },
  };
  return Object.freeze(planner);
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
  const refs: ArtifactRef[] = [];
  const issues: RetentionIssue[] = [];
  for (const candidate of input.refs) {
    const parsed = parseArtifactRef(candidate);
    if (!parsed.ok) issues.push(Object.freeze({ detail: "retention pin is not a closed artifact ref" }));
    else refs.push(parsed.value);
  }
  if (issues.length > 0) {
    return { ok: false, issues: nonEmptyIssues(issues) };
  }
  const unique = new Map(refs.map((ref) => [refKey(ref), ref]));
  return {
    ok: true,
    value: Object.freeze({
      schemaVersion: 1,
      refs: Object.freeze([...unique.values()].sort((left, right) => compareCanonicalText(refKey(left), refKey(right)))),
    }),
  };
}

function parseInventory(input: unknown): {
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
    const ref = parseArtifactRef(candidate.ref);
    if (!ref.ok || !Number.isSafeInteger(candidate.storedBytes) || (candidate.storedBytes as number) < 0) {
      issues.push(Object.freeze({ detail: "inventory entry has an invalid ref or byte count" }));
      continue;
    }
    const storedBytes = candidate.storedBytes as number;
    if (!Number.isSafeInteger(aggregateBytes + storedBytes)) {
      issues.push(Object.freeze({ ref: ref.value, detail: "inventory aggregate byte count overflows" }));
      continue;
    }
    aggregateBytes += storedBytes;
    const key = refKey(ref.value);
    if (seen.has(key)) {
      issues.push(Object.freeze({ ref: ref.value, detail: "inventory contains a duplicate ref" }));
      continue;
    }
    seen.add(key);
    entries.push(Object.freeze({ ref: ref.value, storedBytes }));
  }
  return { entries: Object.freeze(entries), issues: Object.freeze(issues) };
}

function isExactRecord(input: unknown, keys: readonly string[]): input is Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const actual = Object.keys(input).sort(compareCanonicalText);
  const expected = [...keys].sort(compareCanonicalText);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function refKey(ref: ArtifactRef): string {
  return ref.kind === "release"
    ? `release:${ref.releaseDigest}:${ref.artifactDigest}`
    : `complete-set:${ref.releaseSetDigest}`;
}

function blocked(issues: readonly RetentionIssue[]): Extract<RetentionResult, { kind: "BlockedPinnedGraph" }> {
  return { kind: "BlockedPinnedGraph", issues: nonEmptyIssues(issues) };
}

function nonEmptyIssues(issues: readonly RetentionIssue[]): readonly [RetentionIssue, ...RetentionIssue[]] {
  const first = issues[0] ?? Object.freeze({ detail: "retention graph is blocked" });
  return Object.freeze([first, ...issues.slice(1)]);
}
