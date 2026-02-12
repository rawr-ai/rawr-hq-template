import { spawnSync } from "node:child_process";
import path from "node:path";

import { assessInstallState, type InstallStateStatus, LEGACY_SYNC_PLUGIN_NAMES, type RuntimePluginSnapshot } from "./state";

export type ReconcileCommand = {
  args: string[];
  reason: string;
};

type ReconcileExecution = {
  args: string[];
  exitCode: number;
  ok: boolean;
  stdout: string;
  stderr: string;
};

export type InstallReconcileResult =
  | {
      action: "skipped";
      reason: string;
      beforeStatus?: InstallStateStatus;
      afterStatus?: InstallStateStatus;
    }
  | {
      action: "planned";
      beforeStatus: InstallStateStatus;
      commands: ReconcileCommand[];
    }
  | {
      action: "applied";
      beforeStatus: InstallStateStatus;
      afterStatus: InstallStateStatus;
      converged: boolean;
      remainingIssues: number;
      commands: ReconcileExecution[];
      output?: unknown[];
    }
  | {
      action: "failed";
      beforeStatus?: InstallStateStatus;
      afterStatus?: InstallStateStatus;
      command?: string[];
      commands?: ReconcileExecution[];
      exitCode: number;
      error: string;
      stdout: string;
      stderr: string;
      remainingIssues?: number;
    };

function runRawrFromSource(workspaceRoot: string, args: string[]): {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  const cwd = path.join(workspaceRoot, "apps", "cli");
  const proc = spawnSync("bun", ["src/index.ts", ...args], { cwd, encoding: "utf8", env: { ...process.env } });
  return {
    ok: (proc.status ?? 1) === 0,
    exitCode: proc.status ?? 1,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
}

function safeParseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

function buildReconcileCommands(beforeIssues: Array<{ kind: string; pluginName?: string }>): ReconcileCommand[] {
  const commands: ReconcileCommand[] = [];
  const legacyToUninstall = new Set<string>();
  for (const issue of beforeIssues) {
    if ((issue.kind !== "legacy_present" && issue.kind !== "legacy_overlap") || !issue.pluginName) continue;
    legacyToUninstall.add(issue.pluginName);
  }

  for (const legacyName of LEGACY_SYNC_PLUGIN_NAMES) {
    if (!legacyToUninstall.has(legacyName)) continue;
    commands.push({
      args: ["plugins", "uninstall", legacyName],
      reason: `remove legacy provider ${legacyName}`,
    });
  }

  commands.push({
    args: ["plugins", "cli", "install", "all", "--json"],
    reason: "reconcile workspace command plugin links",
  });
  return commands;
}

export async function reconcileWorkspaceInstallLinks(input: {
  workspaceRoot: string;
  dryRun: boolean;
  enabled: boolean;
  runtimePlugins?: RuntimePluginSnapshot[];
  oclifDataDir?: string;
}): Promise<InstallReconcileResult> {
  if (!input.enabled) return { action: "skipped", reason: "disabled by flag" };

  const before = await assessInstallState({
    workspaceRoot: input.workspaceRoot,
    runtimePlugins: input.runtimePlugins,
    oclifDataDir: input.oclifDataDir,
  });
  if (before.inSync) {
    return { action: "skipped", reason: "install state already in sync", beforeStatus: before.status, afterStatus: before.status };
  }

  const commands = buildReconcileCommands(before.issues);
  if (input.dryRun) {
    return {
      action: "planned",
      beforeStatus: before.status,
      commands,
    };
  }

  const executions: ReconcileExecution[] = [];
  for (const command of commands) {
    const run = runRawrFromSource(input.workspaceRoot, command.args);
    executions.push({
      args: command.args,
      exitCode: run.exitCode,
      ok: run.ok,
      stdout: run.stdout,
      stderr: run.stderr,
    });
    if (run.ok) continue;
    return {
      action: "failed",
      beforeStatus: before.status,
      command: command.args,
      commands: executions,
      exitCode: run.exitCode,
      error: "install reconcile failed",
      stdout: run.stdout,
      stderr: run.stderr,
    };
  }

  const after = await assessInstallState({
    workspaceRoot: input.workspaceRoot,
    runtimePlugins: input.runtimePlugins,
    oclifDataDir: input.oclifDataDir,
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
