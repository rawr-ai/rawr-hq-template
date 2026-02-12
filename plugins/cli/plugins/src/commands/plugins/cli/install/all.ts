import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { filterOperationalPlugins, findWorkspaceRoot, listWorkspacePlugins } from "../../../../lib/workspace-plugins";

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

async function readJsonFile(p: string): Promise<unknown | null> {
  try {
    return JSON.parse(await fs.readFile(p, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function isOclifPluginPackage(pkgJson: unknown): boolean {
  if (!pkgJson || typeof pkgJson !== "object") return false;
  const oclif = (pkgJson as any).oclif;
  if (!oclif || typeof oclif !== "object") return false;
  const commands = oclif.commands;
  const tsCommands = oclif.typescript?.commands;
  return typeof commands === "string" && commands.length > 0 && typeof tsCommands === "string" && tsCommands.length > 0;
}

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

export default class PluginsInstallAll extends RawrCommand {
  static description = "Link all workspace command plugins into the local oclif plugin manager (Channel A)";

  static flags = {
    ...RawrCommand.baseFlags,
    "no-install": Flags.boolean({
      description: "Link without passing --install to the plugin manager",
      default: false,
    }),
    "include-non-operational": Flags.boolean({
      description: "Include fixture/example plugins (default: true for install-all convenience)",
      default: true,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsInstallAll);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const dryRun = Boolean((flags as any)["dry-run"]);
    const willInstall = !(flags as any)["no-install"];
    const includeNonOperational = Boolean((flags as any)["include-non-operational"]);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const allPlugins = await listWorkspacePlugins(workspaceRoot);
    const visible = filterOperationalPlugins(allPlugins, includeNonOperational);

    const planned: PlannedLink[] = [];
    const skipped: Skipped[] = [];

    for (const plugin of visible) {
      const pkgJsonPath = path.join(plugin.absPath, "package.json");
      const pkgJson = await readJsonFile(pkgJsonPath);
      const channelHasA = plugin.channel === "A" || plugin.channel === "both";

      if (!pkgJson) {
        skipped.push({ pluginId: plugin.id, dirName: plugin.dirName, absPath: plugin.absPath, reason: "missing package.json" });
        continue;
      }

      // Channel A wiring only makes sense for oclif command plugins.
      if (!isOclifPluginPackage(pkgJson)) {
        skipped.push({
          pluginId: plugin.id,
          dirName: plugin.dirName,
          absPath: plugin.absPath,
          reason: channelHasA ? "rawr.channel includes A, but package.json#oclif is missing/invalid" : "not an oclif command plugin",
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

    const linked: { pluginId: string; exitCode: number; ok: boolean }[] = [];
    const failures: { pluginId: string; exitCode: number; stderr: string }[] = [];

    for (const p of planned) {
      const args = ["plugins", "link", p.absPath];
      if (p.willInstall) args.push("--install");

      const r = runRawrFromSource(workspaceRoot, args);
      linked.push({ pluginId: p.pluginId, exitCode: r.exitCode, ok: r.ok });
      if (!r.ok) failures.push({ pluginId: p.pluginId, exitCode: r.exitCode, stderr: r.stderr.trim() });
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
