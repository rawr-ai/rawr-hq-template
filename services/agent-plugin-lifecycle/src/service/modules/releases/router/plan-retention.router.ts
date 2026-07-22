import type { RetentionIssue } from "../model/dto/retention";
import { MAX_RETENTION_ISSUE_DETAIL_LENGTH, MAX_RETENTION_REFS } from "../model/dto/retention";
import {
  blockedRetentionPlan,
  constructRetentionPlan,
  type NormalizedRetentionInventoryEntry,
  type NormalizedRetentionRef,
  parseRetentionInventory,
  parseRetentionPinsV1,
  retentionRefKey,
} from "../model/policy/retention";
import { module } from "../module";

const TRUNCATED_RETENTION_DETAIL_SUFFIX = "...[truncated]";
const UNREADABLE_RETENTION_READER_FAILURE = "retention reader failed without a readable diagnostic";

export const planRetention = module.planRetention.handler(async ({ context, input: policy }) => {
  if (context.retention === undefined) {
    return blockedRetentionPlan([{ detail: "retention readers are unavailable" }]);
  }

  try {
    const pins = parseRetentionPinsV1(await context.retention.pins.read());
    if (!pins.ok) return blockedRetentionPlan(pins.issues);

    const pinned = new Map<string, NormalizedRetentionRef>();
    const pinIssues: RetentionIssue[] = [];
    for (const ref of pins.value.refs) {
      if (ref.kind === "mechanical-evidence") {
        const evidence = await context.evidence.read(ref);
        if (evidence.kind !== "Verified") {
          pinIssues.push(
            Object.freeze({ ref, detail: `pinned artifact is ${evidence.kind.toLowerCase()}` })
          );
          continue;
        }
        pinned.set(retentionRefKey(ref), ref);
        continue;
      }

      const result = await context.artifacts.read(ref);
      if (result.kind !== "Verified") {
        pinIssues.push(
          Object.freeze({ ref, detail: `pinned artifact is ${result.kind.toLowerCase()}` })
        );
        continue;
      }
      pinned.set(retentionRefKey(ref), ref);
      if (result.snapshot.kind === "complete-set") {
        for (const member of result.snapshot.members) {
          pinned.set(retentionRefKey(member.ref), member.ref);
        }
      }
      if (pinned.size > MAX_RETENTION_REFS) {
        return blockedRetentionPlan([
          {
            detail: `expanded retention pins exceed ${MAX_RETENTION_REFS} refs`,
          },
        ]);
      }
    }
    if (pinIssues.length > 0) return blockedRetentionPlan(pinIssues);

    const inventory = parseRetentionInventory(await context.retention.inventory.read());
    const blockedEntries: RetentionIssue[] = [...inventory.issues];
    const unpinned: NormalizedRetentionInventoryEntry[] = [];
    for (const entry of inventory.entries) {
      if (pinned.has(retentionRefKey(entry.ref))) continue;
      const verified =
        entry.ref.kind === "mechanical-evidence"
          ? await context.evidence.read(entry.ref)
          : await context.artifacts.read(entry.ref);
      if (verified.kind !== "Verified") {
        blockedEntries.push(
          Object.freeze({
            ref: entry.ref,
            detail: `inventory artifact is ${verified.kind.toLowerCase()}`,
          })
        );
        continue;
      }
      unpinned.push(entry);
    }

    return constructRetentionPlan({
      policy,
      pinned: [...pinned.values()],
      unpinned,
      blockedEntries,
    });
  } catch (error) {
    return blockedRetentionPlan([
      {
        detail: retentionReaderFailureDetail(error),
      },
    ]);
  }
});

function retentionReaderFailureDetail(error: unknown): string {
  const detail = `retention planning failed closed: ${errorMessage(error)}`;
  if (detail.length <= MAX_RETENTION_ISSUE_DETAIL_LENGTH) return detail;
  return `${detail.slice(
    0,
    MAX_RETENTION_ISSUE_DETAIL_LENGTH - TRUNCATED_RETENTION_DETAIL_SUFFIX.length
  )}${TRUNCATED_RETENTION_DETAIL_SUFFIX}`;
}

function errorMessage(error: unknown): string {
  try {
    return error instanceof Error ? error.message : String(error);
  } catch {
    return UNREADABLE_RETENTION_READER_FAILURE;
  }
}
