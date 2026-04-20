import fsSync from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  PluginInstallAction,
  PluginInstallManagerEntry,
  PluginInstallRepairPlan,
  PluginInstallRuntimeSnapshot,
  PluginInstallStateReport,
  PluginInstallStateStatus,
} from "@rawr/hq-ops/types";
import { createHqOpsClient, type HqOpsClient } from "./hq-ops-client";
import { runRawrFromSource } from "./rawr-source-runner";

/**
 * Projection result for command-plugin install reconciliation.
 *
 * HQ Ops returns semantic repair actions; this union records how the CLI mapped
 * those actions to local rawr process execution.
 */
export type InstallReconcileResult =
  | {
      action: "skipped";
      reason: string;
      beforeStatus?: PluginInstallStateStatus;
      afterStatus?: PluginInstallStateStatus;
    }
  | {
      action: "planned";
      beforeStatus: PluginInstallStateStatus;
      actions: PluginInstallRepairPlan["actions"];
    }
  | {
      action: "applied";
      beforeStatus: PluginInstallStateStatus;
      afterStatus: PluginInstallStateStatus;
      converged: boolean;
      remainingIssues: number;
      commands: Array<{
        args: string[];
        exitCode: number;
        ok: boolean;
        stdout: string;
        stderr: string;
      }>;
      output?: unknown[];
    }
  | {
      action: "failed";
      beforeStatus?: PluginInstallStateStatus;
      afterStatus?: PluginInstallStateStatus;
      command?: string[];
      commands?: Array<{
        args: string[];
        exitCode: number;
        ok: boolean;
        stdout: string;
        stderr: string;
      }>;
      exitCode: number;
      error: string;
      stdout: string;
      stderr: string;
      remainingIssues?: number;
    };

type PluginManagerManifest = {
  oclif?: {
    plugins?: Array<{ name?: unknown; type?: unknown; root?: unknown }>;
  };
};

/**
 * Finds the user's home directory for locating oclif's data store.
 */
function homeDir(): string {
  return process.env.HOME ? String(process.env.HOME) : os.homedir();
}

/**
 * Mirrors oclif's default plugin manager data directory for local observation.
 */
function defaultOclifDataDir(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME && process.env.XDG_DATA_HOME.length > 0
    ? process.env.XDG_DATA_HOME
    : path.join(homeDir(), ".local", "share");
  return path.join(path.resolve(xdgDataHome), "@rawr", "cli");
}

/**
 * Reads concrete oclif manager state from disk.
 *
 * This remains projection-side because it observes the host installation; the
 * service receives normalized links and decides whether they are healthy.
 */
async function loadPluginManagerEntries(input?: {
  oclifDataDir?: string;
}): Promise<{ manifestPath: string; links: PluginInstallManagerEntry[] }> {
  const dataDir = input?.oclifDataDir ? path.resolve(input.oclifDataDir) : defaultOclifDataDir();
  const manifestPath = path.join(dataDir, "package.json");

  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8")) as PluginManagerManifest;
    const links = (parsed.oclif?.plugins ?? [])
      .map((entry): PluginInstallManagerEntry | null => {
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
      .filter((entry): entry is PluginInstallManagerEntry => Boolean(entry));

    return { manifestPath, links };
  } catch {
    return { manifestPath, links: [] };
  }
}

type RuntimePluginValue = {
  name?: unknown;
  alias?: unknown;
  type?: unknown;
  root?: unknown;
};

function isRuntimePluginValue(value: unknown): value is RuntimePluginValue {
  return Boolean(value) && typeof value === "object";
}

/**
 * Converts oclif runtime plugin objects into the snapshot HQ Ops can assess.
 */
export function runtimePluginSnapshot(configPlugins: unknown): PluginInstallRuntimeSnapshot[] {
  const runtimePluginValues: unknown[] = configPlugins instanceof Map
    ? [...configPlugins.values()]
    : Array.isArray(configPlugins)
      ? configPlugins
      : [];

  return runtimePluginValues.map((value) => {
    const plugin = isRuntimePluginValue(value) ? value : {};
    return {
      name: String(plugin.name ?? plugin.alias ?? ""),
      alias: typeof plugin.alias === "string" ? plugin.alias : undefined,
      type: typeof plugin.type === "string" ? plugin.type : undefined,
      root: typeof plugin.root === "string" ? plugin.root : null,
    };
  });
}

/**
 * Builds the concrete install assessment input by combining service scope with
 * observed oclif manager state.
 */
async function buildAssessInput(input: {
  workspaceRoot: string;
  runtimePlugins?: PluginInstallRuntimeSnapshot[];
  oclifDataDir?: string;
}) {
  const workspaceRoot = path.resolve(input.workspaceRoot);
  const manager = await loadPluginManagerEntries({ oclifDataDir: input.oclifDataDir });
  return {
    workspaceRoot,
    canonicalWorkspaceRoot: workspaceRoot,
    canonicalWorkspaceSource: "workspace-root" as const,
    pluginManagerManifestPath: manager.manifestPath,
    actualLinks: manager.links.map((link) => ({
      ...link,
      root: link.root ? normalizeAbsPathMaybeReal(link.root) : null,
    })),
    runtimePlugins: input.runtimePlugins,
  };
}

/**
 * Maps HQ semantic repair actions to rawr CLI argv executed by this projection.
 */
export function pluginInstallActionCommand(action: PluginInstallAction): string[] {
  if (action.kind === "uninstall-plugin") return ["plugins", "uninstall", action.pluginName];
  return ["plugins", "cli", "install", "all", "--json"];
}

/**
 * Renders semantic repair actions for human status output.
 */
export function pluginInstallActionCommandText(action: PluginInstallAction): string {
  return `rawr ${pluginInstallActionCommand(action).join(" ")}`;
}

/**
 * Realpath helper used before passing observed links to HQ Ops.
 */
function normalizeAbsPathMaybeReal(p: string): string {
  const resolved = path.resolve(p);
  try {
    return fsSync.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

type AssessOptions = NonNullable<Parameters<HqOpsClient["pluginInstall"]["assessInstallState"]>[1]>;
type RepairOptions = NonNullable<Parameters<HqOpsClient["pluginInstall"]["planInstallRepair"]>[1]>;

/**
 * Calls HQ Ops to assess command-plugin install health.
 */
export async function assessPluginInstallState(input: {
  workspaceRoot: string;
  runtimePlugins?: PluginInstallRuntimeSnapshot[];
  oclifDataDir?: string;
  traceId: string;
}): Promise<PluginInstallStateReport> {
  const client = createHqOpsClient(input.workspaceRoot);
  const assessInput = await buildAssessInput(input);
  const options = {
    context: { invocation: { traceId: input.traceId } },
  } satisfies AssessOptions;
  return client.pluginInstall.assessInstallState(assessInput, options);
}

/**
 * Calls HQ Ops to plan semantic install repair actions.
 */
export async function planPluginInstallRepair(input: {
  workspaceRoot: string;
  report: PluginInstallStateReport;
  traceId: string;
}): Promise<PluginInstallRepairPlan> {
  const client = createHqOpsClient(input.workspaceRoot);
  const options = {
    context: { invocation: { traceId: input.traceId } },
  } satisfies RepairOptions;
  return client.pluginInstall.planInstallRepair({ report: input.report }, options);
}

/**
 * Parses rawr command output when a repair action emitted JSON.
 */
function safeParseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

/**
 * Performs the projection-owned apply loop for install repair.
 *
 * The loop deliberately reassesses through HQ Ops before and after local command
 * execution so policy stays in the service while process orchestration remains
 * in the CLI.
 */
export async function reconcileWorkspaceInstallLinks(input: {
  workspaceRoot: string;
  dryRun: boolean;
  enabled: boolean;
  runtimePlugins?: PluginInstallRuntimeSnapshot[];
  oclifDataDir?: string;
}): Promise<InstallReconcileResult> {
  if (!input.enabled) return { action: "skipped", reason: "disabled by flag" };

  const before = await assessPluginInstallState({
    workspaceRoot: input.workspaceRoot,
    runtimePlugins: input.runtimePlugins,
    oclifDataDir: input.oclifDataDir,
    traceId: "plugin-plugins.plugin-install.assess-before",
  });

  const plan = await planPluginInstallRepair({
    workspaceRoot: input.workspaceRoot,
    report: before,
    traceId: "plugin-plugins.plugin-install.plan-repair",
  });

  if (plan.action === "skipped") {
    return { action: "skipped", reason: "install state already in sync", beforeStatus: before.status, afterStatus: before.status };
  }

  if (input.dryRun) {
    return {
      action: "planned",
      beforeStatus: before.status,
      actions: plan.actions,
    };
  }

  const executions: Array<{
    args: string[];
    exitCode: number;
    ok: boolean;
    stdout: string;
    stderr: string;
  }> = [];

  for (const action of plan.actions) {
    const args = pluginInstallActionCommand(action);
    const run = runRawrFromSource(input.workspaceRoot, args);
    executions.push({
      args,
      exitCode: run.exitCode,
      ok: run.ok,
      stdout: run.stdout,
      stderr: run.stderr,
    });
    if (run.ok) continue;
    return {
      action: "failed",
      beforeStatus: before.status,
      command: args,
      commands: executions,
      exitCode: run.exitCode,
      error: "install reconcile failed",
      stdout: run.stdout,
      stderr: run.stderr,
    };
  }

  const after = await assessPluginInstallState({
    workspaceRoot: input.workspaceRoot,
    runtimePlugins: input.runtimePlugins,
    oclifDataDir: input.oclifDataDir,
    traceId: "plugin-plugins.plugin-install.assess-after",
  });

  if (after.status === "LEGACY_OVERLAP") {
    return {
      action: "failed",
      beforeStatus: before.status,
      afterStatus: after.status,
      commands: executions,
      exitCode: 2,
      error: "legacy overlap remains after attempted auto-heal",
      stdout: "",
      stderr: "",
      remainingIssues: after.summary.issueCount,
    };
  }

  if (!after.inSync) {
    return {
      action: "failed",
      beforeStatus: before.status,
      afterStatus: after.status,
      commands: executions,
      exitCode: 3,
      error: "install state still out-of-sync after reconcile",
      stdout: "",
      stderr: "",
      remainingIssues: after.summary.issueCount,
    };
  }

  return {
    action: "applied",
    beforeStatus: before.status,
    afterStatus: after.status,
    converged: after.inSync,
    remainingIssues: after.summary.issueCount,
    commands: executions,
    output: executions.map((execution) => safeParseJson(execution.stdout)),
  };
}
