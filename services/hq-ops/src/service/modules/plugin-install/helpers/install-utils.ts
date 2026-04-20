import type { HqOpsResources } from "../../../shared/ports/resources";
import type {
  PluginInstallAction,
  PluginInstallDriftIssue,
  PluginInstallExpectedLink,
  PluginInstallManagerEntry,
  PluginInstallStateStatus,
} from "../entities";

type PathOps = Pick<HqOpsResources["path"], "realpath" | "resolve">;

/**
 * Resolves symlinks when possible so install drift compares real filesystem
 * targets instead of whatever string form the oclif manager persisted.
 */
export async function normalizeAbsPath(pathOps: PathOps, input: string): Promise<string> {
  const resolved = pathOps.resolve(input);
  return (await pathOps.realpath(resolved)) ?? resolved;
}

/**
 * Collapses detailed drift issues into the single status shown by projections.
 */
export function classifyStatus(issues: PluginInstallDriftIssue[]): PluginInstallStateStatus {
  if (issues.length === 0) return "IN_SYNC";
  if (issues.some((issue) => issue.kind === "legacy_overlap" || issue.kind === "legacy_present")) {
    return "LEGACY_OVERLAP";
  }
  if (issues.some((issue) => issue.kind === "stale_link")) return "STALE_LINKS";
  return "DRIFT_DETECTED";
}

/**
 * Deduplicates semantic actions after multiple drift issues converge on the
 * same repair step.
 */
export function uniqueActions(actions: PluginInstallAction[]): PluginInstallAction[] {
  const seen = new Set<string>();
  const out: PluginInstallAction[] = [];
  for (const action of actions) {
    const key = JSON.stringify(action);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}

/**
 * Produces deterministic expected-link ordering for reports and tests.
 */
export function sortedExpectedLinks(links: PluginInstallExpectedLink[]): PluginInstallExpectedLink[] {
  return [...links]
    .filter((link) => link.pluginName.trim().length > 0 && link.root.trim().length > 0)
    .sort((a, b) => a.pluginName.localeCompare(b.pluginName));
}

/**
 * Produces deterministic observed-link ordering while dropping unusable names.
 */
export function sortedActualLinks(links: PluginInstallManagerEntry[]): PluginInstallManagerEntry[] {
  return [...links]
    .filter((link) => link.name.trim().length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}
