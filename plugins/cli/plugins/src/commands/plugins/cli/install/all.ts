import { spawnSync } from "node:child_process";
import path from "node:path";

import { Flags } from "@oclif/core";
import { findWorkspaceRoot, RawrCommand } from "@rawr/core";

import { createHqOpsCallOptions, createHqOpsClient } from "../../../../lib/hq-ops-client";

type PlannedLink = {
  pluginId: string;
  dirName: string;
  absPath: string;
  willInstall: boolean;
};

type Skipped = {
  pluginId: string;
  dirName: string;
  absPath: string;
  reason: string;
};

/**
 * Executes the source CLI from the workspace when oclif link operations must go
 * through the command surface rather than a service call.
 */
function runRawrFromSource(workspaceRoot: string, args: string[]): { ok: boolean; exitCode: number; stdout: string; stderr: string } {
  const cwd = path.join(workspaceRoot, "apps", "cli");
  const proc = spawnSync("bun", ["src/index.ts", ...args], { cwd, encoding: "utf8", env: { ...process.env } });
  return {
    ok: (proc.status ?? 1) === 0,
    exitCode: proc.status ?? 1,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
}

/**
 * Builds a command plugin before linking so oclif resolves compiled commands.
 */
function runPluginBuild(pluginRoot: string): { ok: boolean; exitCode: number; stdout: string; stderr: string } {
  const proc = spawnSync("bun", ["run", "build"], { cwd: pluginRoot, encoding: "utf8", env: { ...process.env } });
  return {
    ok: (proc.status ?? 1) === 0,
    exitCode: proc.status ?? 1,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
}

/**
 * Links every HQ-catalog eligible toolkit plugin into the local oclif manager.
 *
 * Eligibility comes from HQ Ops pluginCatalog; this command only performs the
 * local build/link side effects required by the user's CLI installation.
 */
export default class PluginsInstallAll extends RawrCommand {
  static description = "Link all workspace command plugins into the local oclif plugin manager (Channel A)";

  static flags = {
    ...RawrCommand.baseFlags,
    "no-install": Flags.boolean({
      description: "Link without passing --install to the plugin manager",
      default: false,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsInstallAll);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const dryRun = Boolean((flags as any)["dry-run"]);
    const willInstall = !(flags as any)["no-install"];

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const catalog = await createHqOpsClient(workspaceRoot).pluginCatalog.listWorkspacePlugins(
      { workspaceRoot, kind: "toolkit" },
      createHqOpsCallOptions("plugin-plugins.cli.install-all.catalog"),
    );
    const visible = catalog.plugins;

    const planned: PlannedLink[] = [];
    const skipped: Skipped[] = [];

    for (const plugin of visible) {
      if (!plugin.commandPlugin.eligible) {
        skipped.push({
          pluginId: plugin.id,
          dirName: plugin.dirName,
          absPath: plugin.absPath,
          reason: plugin.commandPlugin.reason,
        });
        continue;
      }

      planned.push({ pluginId: plugin.id, dirName: plugin.dirName, absPath: plugin.absPath, willInstall });
    }

    if (dryRun) {
      const result = this.ok({
        workspaceRoot,
        planned,
        skipped,
        plannedCount: planned.length,
        skippedCount: skipped.length,
      });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`planned: ${planned.length}`);
          this.log(`skipped: ${skipped.length}`);
        },
      });
      return;
    }

    const linked: { pluginId: string; buildExitCode: number; linkExitCode: number; ok: boolean }[] = [];
    const failures: { pluginId: string; step: "build" | "link"; exitCode: number; stderr: string }[] = [];

    for (const p of planned) {
      const build = runPluginBuild(p.absPath);
      if (!build.ok) {
        linked.push({ pluginId: p.pluginId, buildExitCode: build.exitCode, linkExitCode: 0, ok: false });
        failures.push({ pluginId: p.pluginId, step: "build", exitCode: build.exitCode, stderr: build.stderr.trim() });
        continue;
      }

      const args = ["plugins", "link", p.absPath];
      if (p.willInstall) args.push("--install");

      const r = runRawrFromSource(workspaceRoot, args);
      linked.push({ pluginId: p.pluginId, buildExitCode: build.exitCode, linkExitCode: r.exitCode, ok: r.ok });
      if (!r.ok) failures.push({ pluginId: p.pluginId, step: "link", exitCode: r.exitCode, stderr: r.stderr.trim() });
    }

    if (failures.length > 0) {
      const result = this.fail("One or more plugin links failed", {
        code: "PLUGIN_LINK_FAILED",
        details: { failures, plannedCount: planned.length, skippedCount: skipped.length },
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const result = this.ok({ workspaceRoot, planned, skipped, linked });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`linked: ${planned.length}`);
        if (skipped.length > 0) this.log(`skipped: ${skipped.length}`);
      },
    });
  }
}
