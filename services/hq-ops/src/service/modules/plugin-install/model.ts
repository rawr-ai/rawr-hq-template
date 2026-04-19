import type { HqOpsResources } from "../../shared/ports/resources";

export const CANONICAL_SYNC_PLUGIN_NAME = "@rawr/plugin-plugins";
export const LEGACY_SYNC_PLUGIN_NAMES = ["@rawr/plugin-agent-sync"] as const;

export type PluginInstallWorkspaceSource = "global-owner" | "workspace-root";

export type PluginInstallStateStatus = "IN_SYNC" | "DRIFT_DETECTED" | "STALE_LINKS" | "LEGACY_OVERLAP";

export type PluginInstallDriftKind =
  | "missing_link"
  | "not_linked"
  | "stale_link"
  | "path_mismatch"
  | "legacy_present"
  | "legacy_overlap"
  | "missing_core_plugin";

export type PluginInstallRuntimeSnapshot = {
  name: string;
  alias?: string;
  type?: string;
  root?: string | null;
};

export type PluginInstallManagerEntry = {
  name: string;
  type: string;
  root: string | null;
};

export type PluginInstallExpectedLink = {
  pluginName: string;
  root: string;
};

export type PluginInstallDriftIssue = {
  kind: PluginInstallDriftKind;
  pluginName?: string;
  message: string;
  expectedRoot?: string;
  actualRoot?: string | null;
  autoFixable: boolean;
};

export type PluginInstallAction = {
  command: string;
  reason: string;
};

export type PluginInstallStateReport = {
  status: PluginInstallStateStatus;
  inSync: boolean;
  canonicalWorkspaceRoot: string;
  canonicalWorkspaceSource: PluginInstallWorkspaceSource;
  pluginManagerManifestPath: string;
  expectedLinks: PluginInstallExpectedLink[];
  actualLinks: PluginInstallManagerEntry[];
  issues: PluginInstallDriftIssue[];
  actions: PluginInstallAction[];
  summary: {
    expectedLinkCount: number;
    actualLinkCount: number;
    issueCount: number;
    staleLinkCount: number;
    legacyIssueCount: number;
  };
};

export type PluginInstallAssessInput = {
  workspaceRoot?: string;
  canonicalWorkspaceRoot?: string;
  canonicalWorkspaceSource?: PluginInstallWorkspaceSource;
  pluginManagerManifestPath: string;
  expectedLinks: PluginInstallExpectedLink[];
  actualLinks: PluginInstallManagerEntry[];
  runtimePlugins?: PluginInstallRuntimeSnapshot[];
};

export type PluginInstallRepairCommand = {
  args: string[];
  reason: string;
};

export type PluginInstallRepairPlan = {
  action: "skipped" | "planned";
  beforeStatus: PluginInstallStateStatus;
  commands: PluginInstallRepairCommand[];
  summary: {
    issueCount: number;
    commandCount: number;
  };
};

export type PluginInstallRepairInput = {
  report: PluginInstallStateReport;
};

type PathOps = Pick<HqOpsResources["path"], "resolve" | "realpath">;

async function normalizeAbsPath(pathOps: PathOps, input: string): Promise<string> {
  const resolved = pathOps.resolve(input);
  return (await pathOps.realpath(resolved)) ?? resolved;
}

function classifyStatus(issues: PluginInstallDriftIssue[]): PluginInstallStateStatus {
  if (issues.length === 0) return "IN_SYNC";
  if (issues.some((issue) => issue.kind === "legacy_overlap" || issue.kind === "legacy_present")) {
    return "LEGACY_OVERLAP";
  }
  if (issues.some((issue) => issue.kind === "stale_link")) return "STALE_LINKS";
  return "DRIFT_DETECTED";
}

function uniqueActions(actions: PluginInstallAction[]): PluginInstallAction[] {
  const seen = new Set<string>();
  const out: PluginInstallAction[] = [];
  for (const action of actions) {
    const key = `${action.command}::${action.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}

function uniqueRepairCommands(commands: PluginInstallRepairCommand[]): PluginInstallRepairCommand[] {
  const seen = new Set<string>();
  const out: PluginInstallRepairCommand[] = [];
  for (const command of commands) {
    const key = `${command.args.join("\0")}::${command.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(command);
  }
  return out;
}

function sortedExpectedLinks(links: PluginInstallExpectedLink[]): PluginInstallExpectedLink[] {
  return [...links]
    .filter((link) => link.pluginName.trim().length > 0 && link.root.trim().length > 0)
    .sort((a, b) => a.pluginName.localeCompare(b.pluginName));
}

function sortedActualLinks(links: PluginInstallManagerEntry[]): PluginInstallManagerEntry[] {
  return [...links]
    .filter((link) => link.name.trim().length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function assessInstallState(
  input: PluginInstallAssessInput,
  pathOps: PathOps,
  defaultWorkspaceRoot: string,
): Promise<PluginInstallStateReport> {
  const workspaceRoot = pathOps.resolve(input.workspaceRoot ?? defaultWorkspaceRoot);
  const canonicalWorkspaceRoot = pathOps.resolve(input.canonicalWorkspaceRoot ?? workspaceRoot);
  const canonicalWorkspaceSource = input.canonicalWorkspaceSource ?? "workspace-root";
  const expectedLinks = sortedExpectedLinks(input.expectedLinks);
  const actualLinks = sortedActualLinks(input.actualLinks);
  const linksByName = new Map<string, PluginInstallManagerEntry>();
  for (const link of actualLinks) linksByName.set(link.name, link);

  const issues: PluginInstallDriftIssue[] = [];
  const actions: PluginInstallAction[] = [];

  for (const expected of expectedLinks) {
    const actual = linksByName.get(expected.pluginName);
    if (!actual) {
      issues.push({
        kind: "missing_link",
        pluginName: expected.pluginName,
        message: `Missing link for ${expected.pluginName}`,
        expectedRoot: expected.root,
        autoFixable: true,
      });
      actions.push({
        command: `rawr plugins link ${JSON.stringify(expected.root)} --install`,
        reason: `Link ${expected.pluginName} to canonical workspace source`,
      });
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
        command: `rawr plugins uninstall ${expected.pluginName}`,
        reason: `Remove non-link entry for ${expected.pluginName}`,
      });
      actions.push({
        command: `rawr plugins link ${JSON.stringify(expected.root)} --install`,
        reason: `Relink ${expected.pluginName} to canonical workspace source`,
      });
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
        command: `rawr plugins uninstall ${expected.pluginName}`,
        reason: `Remove rootless link entry for ${expected.pluginName}`,
      });
      actions.push({
        command: `rawr plugins link ${JSON.stringify(expected.root)} --install`,
        reason: `Relink ${expected.pluginName} to canonical workspace source`,
      });
      continue;
    }

    const expectedNormalized = await normalizeAbsPath(pathOps, expected.root);
    const actualNormalized = await normalizeAbsPath(pathOps, actual.root);
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
        command: `rawr plugins uninstall ${expected.pluginName}`,
        reason: `Remove stale link for ${expected.pluginName}`,
      });
      actions.push({
        command: `rawr plugins link ${JSON.stringify(expected.root)} --install`,
        reason: `Relink ${expected.pluginName} to canonical workspace source`,
      });
    }
  }

  const expectedNames = new Set(expectedLinks.map((link) => link.pluginName));
  for (const legacyName of LEGACY_SYNC_PLUGIN_NAMES) {
    const actual = linksByName.get(legacyName);
    if (!actual) continue;
    issues.push({
      kind: expectedNames.has(CANONICAL_SYNC_PLUGIN_NAME) ? "legacy_overlap" : "legacy_present",
      pluginName: legacyName,
      message: `Legacy plugin provider ${legacyName} is still installed`,
      actualRoot: actual.root,
      autoFixable: true,
    });
    actions.push({
      command: `rawr plugins uninstall ${legacyName}`,
      reason: `Remove legacy provider ${legacyName}`,
    });
  }

  if (input.runtimePlugins) {
    const hasCanonicalRuntimePlugin = input.runtimePlugins.some((plugin) => plugin.name === CANONICAL_SYNC_PLUGIN_NAME);
    if (!hasCanonicalRuntimePlugin) {
      issues.push({
        kind: "missing_core_plugin",
        pluginName: CANONICAL_SYNC_PLUGIN_NAME,
        message: `${CANONICAL_SYNC_PLUGIN_NAME} is missing from runtime plugin snapshot`,
        autoFixable: false,
      });
    }
  }

  const staleLinkCount = issues.filter((issue) => issue.kind === "stale_link").length;
  const legacyIssueCount = issues.filter((issue) => issue.kind === "legacy_overlap" || issue.kind === "legacy_present").length;

  return {
    status: classifyStatus(issues),
    inSync: issues.length === 0,
    canonicalWorkspaceRoot,
    canonicalWorkspaceSource,
    pluginManagerManifestPath: input.pluginManagerManifestPath,
    expectedLinks,
    actualLinks,
    issues,
    actions: uniqueActions(actions),
    summary: {
      expectedLinkCount: expectedLinks.length,
      actualLinkCount: actualLinks.length,
      issueCount: issues.length,
      staleLinkCount,
      legacyIssueCount,
    },
  };
}

export function planInstallRepair(input: PluginInstallRepairInput): PluginInstallRepairPlan {
  const report = input.report;
  if (report.inSync) {
    return {
      action: "skipped",
      beforeStatus: report.status,
      commands: [],
      summary: {
        issueCount: report.summary.issueCount,
        commandCount: 0,
      },
    };
  }

  const commands: PluginInstallRepairCommand[] = [];
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
    commands.push({
      args: ["plugins", "uninstall", legacyName],
      reason: `remove legacy provider ${legacyName}`,
    });
  }

  for (const pluginName of [...malformedToUninstall].sort((a, b) => a.localeCompare(b))) {
    commands.push({
      args: ["plugins", "uninstall", pluginName],
      reason: `remove malformed entry for ${pluginName} before relink`,
    });
  }

  commands.push({
    args: ["plugins", "cli", "install", "all", "--json"],
    reason: "reconcile workspace command plugin links",
  });

  const uniqueCommands = uniqueRepairCommands(commands);
  return {
    action: "planned",
    beforeStatus: report.status,
    commands: uniqueCommands,
    summary: {
      issueCount: report.summary.issueCount,
      commandCount: uniqueCommands.length,
    },
  };
}
