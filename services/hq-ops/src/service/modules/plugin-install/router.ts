/**
 * hq-ops: plugin-install module.
 *
 * This router owns installation intent and drift assessment for plugin command
 * surfaces (e.g., expected links/targets). It intentionally separates:
 * - observation of local manager state (CLI/projection responsibility)
 * - from definition of "healthy" install state (service responsibility).
 */
import type { HqOpsResources } from "../../shared/ports/resources";
import { discoverWorkspacePluginCatalog } from "../../shared/repositories/workspace-plugin-catalog-repository";
import {
  CANONICAL_SYNC_PLUGIN_NAME,
  LEGACY_SYNC_PLUGIN_NAMES,
  type PluginInstallAction,
  type PluginInstallDriftIssue,
  type PluginInstallExpectedLink,
  type PluginInstallManagerEntry,
} from "./entities";
import {
  classifyStatus,
  normalizeAbsPath,
  sortedActualLinks,
  sortedExpectedLinks,
  uniqueActions,
} from "./helpers/install-utils";
import { module } from "./module";

type DriftResult = {
  issues: PluginInstallDriftIssue[];
  actions: PluginInstallAction[];
};

function expectedLinksFromCatalog(plugins: Array<{ id: string; absPath: string; commandPlugin: { eligible: boolean } }>): PluginInstallExpectedLink[] {
  return plugins
    .filter((plugin) => plugin.commandPlugin.eligible)
    .map((plugin) => ({ pluginName: plugin.id, root: plugin.absPath }));
}

function indexLinksByName(actualLinks: PluginInstallManagerEntry[]): Map<string, PluginInstallManagerEntry> {
  const linksByName = new Map<string, PluginInstallManagerEntry>();
  for (const link of actualLinks) linksByName.set(link.name, link);
  return linksByName;
}

async function collectExpectedLinkDrift(args: {
  expectedLinks: PluginInstallExpectedLink[];
  actualLinksByName: Map<string, PluginInstallManagerEntry>;
  pathOps: HqOpsResources["path"];
}): Promise<DriftResult> {
  const issues: PluginInstallDriftIssue[] = [];
  const actions: PluginInstallAction[] = [];

  for (const expected of args.expectedLinks) {
    const actual = args.actualLinksByName.get(expected.pluginName);
    if (!actual) {
      issues.push({
        kind: "missing_link",
        pluginName: expected.pluginName,
        message: `Missing link for ${expected.pluginName}`,
        expectedRoot: expected.root,
        autoFixable: true,
      });
      actions.push({ kind: "reconcile-cli-command-plugin-links", reason: `link ${expected.pluginName} to canonical workspace source` });
      continue;
    }

    if (actual.type !== "link") {
      issues.push({
        kind: "not_linked",
        pluginName: expected.pluginName,
        message: `${expected.pluginName} is present but not linked`,
        expectedRoot: expected.root,
        actualRoot: actual.root,
        autoFixable: true,
      });
      actions.push({
        kind: "uninstall-plugin",
        pluginName: expected.pluginName,
        reason: `remove non-link entry for ${expected.pluginName}`,
      });
      actions.push({ kind: "reconcile-cli-command-plugin-links", reason: `relink ${expected.pluginName} to canonical workspace source` });
      continue;
    }

    if (!actual.root) {
      issues.push({
        kind: "path_mismatch",
        pluginName: expected.pluginName,
        message: `${expected.pluginName} link is missing root path`,
        expectedRoot: expected.root,
        actualRoot: null,
        autoFixable: true,
      });
      actions.push({
        kind: "uninstall-plugin",
        pluginName: expected.pluginName,
        reason: `remove rootless link entry for ${expected.pluginName}`,
      });
      actions.push({ kind: "reconcile-cli-command-plugin-links", reason: `relink ${expected.pluginName} to canonical workspace source` });
      continue;
    }

    const expectedNormalized = await normalizeAbsPath(args.pathOps, expected.root);
    const actualNormalized = await normalizeAbsPath(args.pathOps, actual.root);
    if (expectedNormalized !== actualNormalized) {
      issues.push({
        kind: "stale_link",
        pluginName: expected.pluginName,
        message: `${expected.pluginName} link points at stale workspace path`,
        expectedRoot: expected.root,
        actualRoot: actual.root,
        autoFixable: true,
      });
      actions.push({
        kind: "uninstall-plugin",
        pluginName: expected.pluginName,
        reason: `remove stale link for ${expected.pluginName}`,
      });
      actions.push({ kind: "reconcile-cli-command-plugin-links", reason: `relink ${expected.pluginName} to canonical workspace source` });
    }
  }

  return { issues, actions };
}

function collectLegacyLinkDrift(args: {
  expectedNames: Set<string>;
  actualLinksByName: Map<string, PluginInstallManagerEntry>;
}): DriftResult {
  const issues: PluginInstallDriftIssue[] = [];
  const actions: PluginInstallAction[] = [];

  for (const legacyName of LEGACY_SYNC_PLUGIN_NAMES) {
    const actual = args.actualLinksByName.get(legacyName);
    if (!actual) continue;
    issues.push({
      kind: args.expectedNames.has(CANONICAL_SYNC_PLUGIN_NAME) ? "legacy_overlap" : "legacy_present",
      pluginName: legacyName,
      message: `Legacy plugin provider ${legacyName} is still installed`,
      actualRoot: actual.root,
      autoFixable: true,
    });
    actions.push({
      kind: "uninstall-plugin",
      pluginName: legacyName,
      reason: `remove legacy provider ${legacyName}`,
    });
  }

  return { issues, actions };
}

function collectRuntimeSnapshotIssues(runtimePlugins: Array<{ name: string }> | undefined): PluginInstallDriftIssue[] {
  if (!runtimePlugins) return [];
  const hasCanonicalRuntimePlugin = runtimePlugins.some((plugin) => plugin.name === CANONICAL_SYNC_PLUGIN_NAME);
  if (hasCanonicalRuntimePlugin) return [];
  return [
    {
      kind: "missing_core_plugin",
      pluginName: CANONICAL_SYNC_PLUGIN_NAME,
      message: `${CANONICAL_SYNC_PLUGIN_NAME} is missing from runtime plugin snapshot`,
      autoFixable: false,
    },
  ];
}

/**
 * Install assessment procedure.
 *
 * This is where HQ Ops turns the plugin catalog into expected oclif command
 * links and compares that policy against concrete manager state supplied by the
 * CLI. The CLI observes local files; the service decides what "healthy" means.
 */
const assessInstallState = module.assessInstallState.handler(async ({ context, input }) => {
  const resources = context.deps.resources;
  const workspaceRoot = resources.path.resolve(input.workspaceRoot ?? context.scope.repoRoot);
  const plugins = await discoverWorkspacePluginCatalog({ workspaceRoot, resources });
  const expectedLinks = expectedLinksFromCatalog(plugins);
  const canonicalWorkspaceRoot = resources.path.resolve(input.canonicalWorkspaceRoot ?? workspaceRoot);
  const canonicalWorkspaceSource = input.canonicalWorkspaceSource ?? "workspace-root";
  const expectedWorkspaceLinks = sortedExpectedLinks(expectedLinks);
  const actualLinks = sortedActualLinks(input.actualLinks);
  const linksByName = indexLinksByName(actualLinks);
  const expectedDrift = await collectExpectedLinkDrift({
    expectedLinks: expectedWorkspaceLinks,
    actualLinksByName: linksByName,
    pathOps: resources.path,
  });
  const expectedNames = new Set(expectedWorkspaceLinks.map((link) => link.pluginName));
  const legacyDrift = collectLegacyLinkDrift({ expectedNames, actualLinksByName: linksByName });
  const runtimeIssues = collectRuntimeSnapshotIssues(input.runtimePlugins);

  const issues: PluginInstallDriftIssue[] = [...expectedDrift.issues, ...legacyDrift.issues, ...runtimeIssues];
  const actions: PluginInstallAction[] = [...expectedDrift.actions, ...legacyDrift.actions];

  const staleLinkCount = issues.filter((issue) => issue.kind === "stale_link").length;
  const legacyIssueCount = issues.filter((issue) => issue.kind === "legacy_overlap" || issue.kind === "legacy_present").length;

  return {
    status: classifyStatus(issues),
    inSync: issues.length === 0,
    canonicalWorkspaceRoot,
    canonicalWorkspaceSource,
    pluginManagerManifestPath: input.pluginManagerManifestPath,
    expectedLinks: expectedWorkspaceLinks,
    actualLinks,
    issues,
    actions: uniqueActions(actions),
    summary: {
      expectedLinkCount: expectedWorkspaceLinks.length,
      actualLinkCount: actualLinks.length,
      issueCount: issues.length,
      staleLinkCount,
      legacyIssueCount,
    },
  };
});

/**
 * Repair planning procedure.
 *
 * It intentionally returns semantic actions instead of argv so service policy
 * remains testable and projections stay responsible for local process execution.
 */
const planInstallRepair = module.planInstallRepair.handler(async ({ input }) => {
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

/**
 * Router export for command-plugin install health and repair planning.
 */
export const router = module.router({
  assessInstallState,
  planInstallRepair,
});
