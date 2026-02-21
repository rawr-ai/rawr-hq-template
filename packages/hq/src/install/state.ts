import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { listWorkspacePlugins } from "../workspace/plugins";

export const CANONICAL_SYNC_PLUGIN_NAME = "@rawr/plugin-plugins";
export const LEGACY_SYNC_PLUGIN_NAMES = ["@rawr/plugin-agent-sync"] as const;

export type InstallStateStatus = "IN_SYNC" | "DRIFT_DETECTED" | "STALE_LINKS" | "LEGACY_OVERLAP";

export type InstallDriftKind =
  | "missing_link"
  | "not_linked"
  | "stale_link"
  | "path_mismatch"
  | "legacy_present"
  | "legacy_overlap"
  | "missing_core_plugin";

export type RuntimePluginSnapshot = {
  name: string;
  alias?: string;
  type?: string;
  root?: string | null;
};

export type PluginManagerEntry = {
  name: string;
  type: string;
  root: string | null;
};

export type InstallDriftIssue = {
  kind: InstallDriftKind;
  pluginName?: string;
  message: string;
  expectedRoot?: string;
  actualRoot?: string | null;
  autoFixable: boolean;
};

export type InstallAction = {
  command: string;
  reason: string;
};

export type InstallStateReport = {
  status: InstallStateStatus;
  inSync: boolean;
  canonicalWorkspaceRoot: string;
  canonicalWorkspaceSource: "global-owner" | "workspace-root";
  pluginManagerManifestPath: string;
  expectedLinks: Array<{ pluginName: string; root: string }>;
  actualLinks: PluginManagerEntry[];
  issues: InstallDriftIssue[];
  actions: InstallAction[];
  summary: {
    expectedLinkCount: number;
    actualLinkCount: number;
    issueCount: number;
    staleLinkCount: number;
    legacyIssueCount: number;
  };
};

type PluginManagerManifest = {
  oclif?: {
    plugins?: Array<{ name?: unknown; type?: unknown; root?: unknown }>;
  };
};

function homeDir(): string {
  return process.env.HOME ? String(process.env.HOME) : os.homedir();
}

function defaultOclifDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME && process.env.XDG_DATA_HOME.length > 0
    ? process.env.XDG_DATA_HOME
    : path.join(homeDir(), ".local", "share");
  return path.join(path.resolve(xdgDataHome), "@rawr", "cli");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function isWorkspaceRoot(candidate: string): Promise<boolean> {
  return (await pathExists(path.join(candidate, "package.json"))) && (await pathExists(path.join(candidate, "plugins")));
}

async function readGlobalOwnerWorkspaceRoot(): Promise<string | null> {
  const ownerFilePath = path.join(homeDir(), ".rawr", "global-rawr-owner-path");
  try {
    const raw = (await fs.readFile(ownerFilePath, "utf8")).trim();
    if (!raw) return null;
    const resolved = path.resolve(raw);
    if (!(await isWorkspaceRoot(resolved))) return null;
    return resolved;
  } catch {
    return null;
  }
}

async function resolveCanonicalWorkspaceRoot(workspaceRoot: string): Promise<{
  root: string;
  source: "global-owner" | "workspace-root";
}> {
  const ownerRoot = await readGlobalOwnerWorkspaceRoot();
  if (ownerRoot) return { root: ownerRoot, source: "global-owner" };
  return { root: path.resolve(workspaceRoot), source: "workspace-root" };
}

async function resolveCanonicalWorkspaceRootWithExplicitFallback(
  workspaceRoot: string,
  allowGlobalOwnerFallback: boolean,
): Promise<{
  root: string;
  source: "global-owner" | "workspace-root";
}> {
  if (allowGlobalOwnerFallback) {
    return resolveCanonicalWorkspaceRoot(workspaceRoot);
  }
  return { root: path.resolve(workspaceRoot), source: "workspace-root" };
}

function normalizeAbsPathMaybeReal(p: string): string {
  const resolved = path.resolve(p);
  try {
    return fsSync.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

async function hasOclifCommands(absPath: string): Promise<boolean> {
  const packageJsonPath = path.join(absPath, "package.json");
  try {
    const parsed = JSON.parse(await fs.readFile(packageJsonPath, "utf8")) as {
      oclif?: {
        commands?: unknown;
        typescript?: {
          commands?: unknown;
        };
      };
    };
    const commands = parsed.oclif?.commands;
    const tsCommands = parsed.oclif?.typescript?.commands;
    return typeof commands === "string" && commands.length > 0 && typeof tsCommands === "string" && tsCommands.length > 0;
  } catch {
    return false;
  }
}

async function listExpectedWorkspaceLinks(workspaceRoot: string): Promise<Map<string, string>> {
  const plugins = await listWorkspacePlugins(workspaceRoot);
  const expected = new Map<string, string>();

  for (const plugin of plugins) {
    if (plugin.kind !== "toolkit") continue;
    if (!(await hasOclifCommands(plugin.absPath))) continue;
    expected.set(plugin.id, path.resolve(plugin.absPath));
  }

  return expected;
}

export async function loadPluginManagerEntries(input?: {
  oclifDataDir?: string;
}): Promise<{ manifestPath: string; links: PluginManagerEntry[] }> {
  const dataDir = input?.oclifDataDir ? path.resolve(input.oclifDataDir) : defaultOclifDataDir();
  const manifestPath = path.join(dataDir, "package.json");

  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8")) as PluginManagerManifest;
    const links = (parsed.oclif?.plugins ?? [])
      .map((entry): PluginManagerEntry | null => {
        const name = typeof entry.name === "string" ? entry.name : null;
        if (!name) return null;
        const type = typeof entry.type === "string" ? entry.type : "unknown";
        const rootRaw = typeof entry.root === "string" ? entry.root : null;
        const root = rootRaw
          ? path.isAbsolute(rootRaw)
            ? rootRaw
            : path.resolve(path.dirname(manifestPath), rootRaw)
          : null;
        return { name, type, root };
      })
      .filter((entry): entry is PluginManagerEntry => Boolean(entry));

    return { manifestPath, links };
  } catch {
    return { manifestPath, links: [] };
  }
}

function classifyStatus(issues: InstallDriftIssue[]): InstallStateStatus {
  if (issues.length === 0) return "IN_SYNC";
  if (issues.some((issue) => issue.kind === "legacy_overlap" || issue.kind === "legacy_present")) {
    return "LEGACY_OVERLAP";
  }
  if (issues.some((issue) => issue.kind === "stale_link")) return "STALE_LINKS";
  return "DRIFT_DETECTED";
}

function uniqueActions(actions: InstallAction[]): InstallAction[] {
  const seen = new Set<string>();
  const out: InstallAction[] = [];
  for (const action of actions) {
    const key = `${action.command}::${action.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action);
  }
  return out;
}

export async function assessInstallState(input: {
  workspaceRoot: string;
  runtimePlugins?: RuntimePluginSnapshot[];
  oclifDataDir?: string;
  allowGlobalOwnerFallback?: boolean;
}): Promise<InstallStateReport> {
  const workspaceRootAbs = path.resolve(input.workspaceRoot);
  const canonical = await resolveCanonicalWorkspaceRootWithExplicitFallback(
    workspaceRootAbs,
    Boolean(input.allowGlobalOwnerFallback),
  );
  const expectedLinks = await listExpectedWorkspaceLinks(canonical.root);
  const manager = await loadPluginManagerEntries({ oclifDataDir: input.oclifDataDir });
  const linksByName = new Map<string, PluginManagerEntry>();
  for (const link of manager.links) linksByName.set(link.name, link);

  const issues: InstallDriftIssue[] = [];
  const actions: InstallAction[] = [];

  for (const [pluginName, expectedRoot] of expectedLinks) {
    const actual = linksByName.get(pluginName);
    if (!actual) {
      issues.push({
        kind: "missing_link",
        pluginName,
        message: `Missing link for ${pluginName}`,
        expectedRoot,
        autoFixable: true,
      });
      actions.push({
        command: `rawr plugins link ${JSON.stringify(expectedRoot)} --install`,
        reason: `Link ${pluginName} to canonical workspace source`,
      });
      continue;
    }

    if (actual.type !== "link") {
      issues.push({
        kind: "not_linked",
        pluginName,
        message: `${pluginName} is ${actual.type} instead of link`,
        expectedRoot,
        actualRoot: actual.root,
        autoFixable: true,
      });
      actions.push({
        command: `rawr plugins link ${JSON.stringify(expectedRoot)} --install`,
        reason: `Switch ${pluginName} to link mode for local latest`,
      });
      continue;
    }

    if (!actual.root || !(await pathExists(actual.root))) {
      issues.push({
        kind: "stale_link",
        pluginName,
        message: `${pluginName} link target is missing`,
        expectedRoot,
        actualRoot: actual.root,
        autoFixable: true,
      });
      actions.push({
        command: `rawr plugins uninstall ${pluginName}`,
        reason: `Remove stale link for ${pluginName}`,
      });
      actions.push({
        command: `rawr plugins link ${JSON.stringify(expectedRoot)} --install`,
        reason: `Re-link ${pluginName} to canonical workspace source`,
      });
      continue;
    }

    const actualRootNorm = normalizeAbsPathMaybeReal(actual.root);
    const expectedRootNorm = normalizeAbsPathMaybeReal(expectedRoot);
    if (actualRootNorm !== expectedRootNorm) {
      issues.push({
        kind: "path_mismatch",
        pluginName,
        message: `${pluginName} link target differs from canonical source`,
        expectedRoot,
        actualRoot: actual.root,
        autoFixable: true,
      });
      actions.push({
        command: `rawr plugins link ${JSON.stringify(expectedRoot)} --install`,
        reason: `Re-point ${pluginName} link to canonical workspace source`,
      });
    }
  }

  const runtimePluginsProvided = Array.isArray(input.runtimePlugins);
  const runtimeNames = new Set(
    (input.runtimePlugins ?? []).flatMap((plugin) => [plugin.name, plugin.alias].filter((v): v is string => Boolean(v))),
  );

  for (const legacyName of LEGACY_SYNC_PLUGIN_NAMES) {
    const actual = linksByName.get(legacyName);
    if (!actual) continue;

    issues.push({
      kind: "legacy_present",
      pluginName: legacyName,
      message: `Legacy sync plugin is still linked: ${legacyName}`,
      actualRoot: actual.root,
      autoFixable: true,
    });
    actions.push({
      command: `rawr plugins uninstall ${legacyName}`,
      reason: `Remove legacy sync provider ${legacyName}`,
    });

    if (runtimeNames.has(CANONICAL_SYNC_PLUGIN_NAME) || linksByName.has(CANONICAL_SYNC_PLUGIN_NAME)) {
      issues.push({
        kind: "legacy_overlap",
        pluginName: legacyName,
        message: `Legacy and canonical sync providers overlap (${legacyName} + ${CANONICAL_SYNC_PLUGIN_NAME})`,
        actualRoot: actual.root,
        autoFixable: true,
      });
    }
  }

  if (runtimePluginsProvided && !runtimeNames.has(CANONICAL_SYNC_PLUGIN_NAME)) {
    issues.push({
      kind: "missing_core_plugin",
      pluginName: CANONICAL_SYNC_PLUGIN_NAME,
      message: `Runtime does not include ${CANONICAL_SYNC_PLUGIN_NAME}`,
      autoFixable: false,
    });
  }

  const status = classifyStatus(issues);
  const dedupedActions = uniqueActions(actions);
  const staleLinkCount = issues.filter((issue) => issue.kind === "stale_link").length;
  const legacyIssueCount = issues.filter((issue) => issue.kind === "legacy_present" || issue.kind === "legacy_overlap").length;

  return {
    status,
    inSync: issues.length === 0,
    canonicalWorkspaceRoot: canonical.root,
    canonicalWorkspaceSource: canonical.source,
    pluginManagerManifestPath: manager.manifestPath,
    expectedLinks: [...expectedLinks.entries()]
      .map(([pluginName, root]) => ({ pluginName, root }))
      .sort((a, b) => a.pluginName.localeCompare(b.pluginName)),
    actualLinks: manager.links.sort((a, b) => a.name.localeCompare(b.name)),
    issues,
    actions: dedupedActions,
    summary: {
      expectedLinkCount: expectedLinks.size,
      actualLinkCount: manager.links.length,
      issueCount: issues.length,
      staleLinkCount,
      legacyIssueCount,
    },
  };
}
