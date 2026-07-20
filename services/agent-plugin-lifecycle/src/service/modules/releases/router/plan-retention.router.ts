import type {
  RetentionInventoryEntry,
  RetentionIssue,
  RetentionRef,
} from "../model/dto/retention";
import {
  blockedRetention,
  constructRetentionPlan,
  parseRetentionInventory,
  parseRetentionPinsV1,
  retentionRefKey,
} from "../model/policy/retention";
import { module } from "../module";

export const planRetention = module.planRetention.handler(async ({ context, input: policy }) => {
  if (context.retention === undefined) {
    return blockedRetention([{ detail: "retention readers are unavailable" }]);
  }

  try {
    const pins = parseRetentionPinsV1(await context.retention.pins.read());
    if (!pins.ok) return blockedRetention(pins.issues);

    const pinned = new Map<string, RetentionRef>();
    const pinIssues: RetentionIssue[] = [];
    for (const ref of pins.value.refs) {
      if (ref.kind === "mechanical-evidence") {
        const evidence = await context.evidence.read(ref);
        if (evidence.kind !== "Verified") {
          pinIssues.push(Object.freeze({ ref, detail: `pinned artifact is ${evidence.kind.toLowerCase()}` }));
          continue;
        }
        pinned.set(retentionRefKey(ref), ref);
        continue;
      }

      const result = await context.artifacts.read(ref);
      if (result.kind !== "Verified") {
        pinIssues.push(Object.freeze({ ref, detail: `pinned artifact is ${result.kind.toLowerCase()}` }));
        continue;
      }
      pinned.set(retentionRefKey(ref), ref);
      if (result.snapshot.kind === "complete-set") {
        for (const member of result.snapshot.members) {
          pinned.set(retentionRefKey(member.ref), member.ref);
        }
      }
    }
    if (pinIssues.length > 0) return blockedRetention(pinIssues);

    const inventory = parseRetentionInventory(await context.retention.inventory.read());
    const blockedEntries: RetentionIssue[] = [...inventory.issues];
    const unpinned: RetentionInventoryEntry[] = [];
    for (const entry of inventory.entries) {
      if (pinned.has(retentionRefKey(entry.ref))) continue;
      const verified = entry.ref.kind === "mechanical-evidence"
        ? await context.evidence.read(entry.ref)
        : await context.artifacts.read(entry.ref);
      if (verified.kind !== "Verified") {
        blockedEntries.push(Object.freeze({
          ref: entry.ref,
          detail: `inventory artifact is ${verified.kind.toLowerCase()}`,
        }));
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
    return blockedRetention([{
      detail: `retention planning failed closed: ${errorMessage(error)}`,
    }]);
  }
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
