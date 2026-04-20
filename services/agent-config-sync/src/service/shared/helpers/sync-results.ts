import type { SourceContent } from "../entities";
import type { SyncItemResult, SyncScannedSummary, SyncTargetResult } from "../entities/sync-results";

/**
 * agent-config-sync: sync result helpers.
 *
 * @remarks
 * These helpers are intentionally mechanical: they help routers and repositories
 * build result payloads consistently without hiding capability policy.
 */

export function pushItem(
  bucket: SyncTargetResult,
  item: Omit<SyncItemResult, "action"> & { action: SyncItemResult["action"] },
): void {
  const full: SyncItemResult = { ...item };
  bucket.items.push(full);
  if (full.action === "conflict") bucket.conflicts.push(full);
}

export function summarizeScannedContent(content: SourceContent): SyncScannedSummary {
  return {
    workflows: content.workflowFiles.map((workflow) => workflow.name),
    skills: content.skills.map((skill) => skill.name),
    scripts: content.scripts.map((script) => script.name),
    agents: content.agentFiles.map((agent) => agent.name),
  };
}

