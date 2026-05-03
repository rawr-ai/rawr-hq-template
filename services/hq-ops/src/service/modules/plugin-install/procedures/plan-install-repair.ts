import type { PluginInstallAction } from "../entities";
import { LEGACY_SYNC_PLUGIN_NAMES } from "../entities";
import { uniqueActions } from "../helpers/install-utils";
import { module } from "../module";

/**
 * Repair planning procedure.
 *
 * It intentionally returns semantic actions instead of argv so service policy
 * remains testable and projections stay responsible for local process execution.
 */
export const planInstallRepair = module.planInstallRepair.handler(async ({ input }) => {
  const report = input.report;
  if (report.inSync) {
    return {
      action: "skipped" as const,
      beforeStatus: report.status,
      actions: [],
      summary: {
        issueCount: report.summary.issueCount,
        actionCount: 0,
      },
    };
  }

  const actions: PluginInstallAction[] = [];
  const legacyToUninstall = new Set<string>();
  const malformedToUninstall = new Set<string>();

  for (const issue of report.issues) {
    if (!issue.pluginName || !issue.autoFixable) continue;
    if (issue.kind === "legacy_present" || issue.kind === "legacy_overlap") {
      legacyToUninstall.add(issue.pluginName);
    } else if (issue.kind === "not_linked" || issue.kind === "path_mismatch" || issue.kind === "stale_link") {
      malformedToUninstall.add(issue.pluginName);
    }
  }

  for (const legacyName of LEGACY_SYNC_PLUGIN_NAMES) {
    if (!legacyToUninstall.has(legacyName)) continue;
    actions.push({
      kind: "uninstall-plugin",
      pluginName: legacyName,
      reason: `remove legacy provider ${legacyName}`,
    });
  }

  for (const pluginName of [...malformedToUninstall].sort((a, b) => a.localeCompare(b))) {
    actions.push({
      kind: "uninstall-plugin",
      pluginName,
      reason: `remove malformed entry for ${pluginName} before relink`,
    });
  }

  actions.push({
    kind: "reconcile-cli-command-plugin-links",
    reason: "reconcile workspace command plugin links",
  });

  const uniqueRepairActions = uniqueActions(actions);
  return {
    action: "planned" as const,
    beforeStatus: report.status,
    actions: uniqueRepairActions,
    summary: {
      issueCount: report.summary.issueCount,
      actionCount: uniqueRepairActions.length,
    },
  };
});

