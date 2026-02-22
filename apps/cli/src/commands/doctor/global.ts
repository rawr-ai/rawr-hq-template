import { RawrCommand } from "@rawr/core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

type AliasInstanceSeamStatus =
  | "owner-file-missing"
  | "owner-file-empty"
  | "owner-current-instance"
  | "owner-other-instance";

type DoctorGlobalData = {
  commandPath: string | null;
  commandPathReal: string | null;
  bunGlobalBinDir: string;
  bunGlobalRawrPath: string;
  bunGlobalRawrReal: string | null;
  cliBinPath: string;
  cliBinReal: string | null;
  pnpmRawrShimPath: string;
  pnpmRawrShimExists: boolean;
  pnpmBeforeBunInPath: boolean;
  workspaceDependencyCount: number;
  currentInstanceRoot: string;
  currentInstanceRootReal: string | null;
  ownerFilePath: string;
  ownerFileExists: boolean;
  ownerWorkspacePath: string | null;
  ownerWorkspaceReal: string | null;
  ownerMatchesCurrentInstanceByRealpath: boolean | null;
  aliasInstanceSeamStatus: AliasInstanceSeamStatus;
  commandSurfaces: {
    externalCliPlugins: "rawr plugins ...";
    workspaceRuntimePlugins: "rawr plugins web ...";
  };
  recommendedMode: "bun-symlink";
};

function readStdout(cmd: string, args: string[]): string {
  const proc = spawnSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env },
  });
  if (proc.status !== 0) return "";
  return (proc.stdout ?? "").trim();
}

function commandPath(name: string): string | null {
  const output = readStdout("sh", ["-lc", `command -v ${name} || true`]);
  return output.length > 0 ? output : null;
}

function safeRealpath(target: string): string | null {
  try {
    return fs.realpathSync(target);
  } catch {
    return null;
  }
}

function pathIndex(pathEntries: string[], needle: string): number {
  const normalizedNeedle = path.resolve(needle);
  return pathEntries.findIndex((entry) => path.resolve(entry) === normalizedNeedle);
}

export default class DoctorGlobal extends RawrCommand {
  static description = "Validate Bun-global rawr wiring for this checkout";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(DoctorGlobal);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const home = os.homedir();
    const bunGlobalBinDir = readStdout("bun", ["pm", "bin", "-g"]) || path.join(home, ".bun", "bin");
    const bunGlobalRawrPath = path.join(bunGlobalBinDir, "rawr");
    const pnpmRawrShimPath = path.join(home, "Library", "pnpm", "rawr");
    const commandResolved = commandPath("rawr");
    const commandResolvedReal = commandResolved ? safeRealpath(commandResolved) : null;

    const cliBinPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../bin/run.js");
    const cliBinReal = safeRealpath(cliBinPath);
    const bunGlobalRawrReal = safeRealpath(bunGlobalRawrPath);

    const currentInstanceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
    const currentInstanceRootReal = safeRealpath(currentInstanceRoot);

    const ownerFilePath = path.join(home, ".rawr", "global-rawr-owner-path");
    const ownerFileExists = fs.existsSync(ownerFilePath);
    let ownerWorkspacePath: string | null = null;
    if (ownerFileExists) {
      try {
        const raw = fs.readFileSync(ownerFilePath, "utf8").trim();
        if (raw.length > 0) ownerWorkspacePath = path.resolve(raw);
      } catch {
        ownerWorkspacePath = null;
      }
    }

    const ownerWorkspaceReal = ownerWorkspacePath ? safeRealpath(ownerWorkspacePath) : null;
    let aliasInstanceSeamStatus: AliasInstanceSeamStatus = "owner-file-missing";
    let ownerMatchesCurrentInstanceByRealpath: boolean | null = null;

    if (ownerFileExists) {
      if (!ownerWorkspacePath) {
        aliasInstanceSeamStatus = "owner-file-empty";
      } else {
        const ownerComparable = ownerWorkspaceReal ?? path.resolve(ownerWorkspacePath);
        const currentComparable = currentInstanceRootReal ?? path.resolve(currentInstanceRoot);
        ownerMatchesCurrentInstanceByRealpath = ownerComparable === currentComparable;
        aliasInstanceSeamStatus = ownerMatchesCurrentInstanceByRealpath ? "owner-current-instance" : "owner-other-instance";
      }
    }

    const pathEntries = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
    const pnpmBinDir = path.join(home, "Library", "pnpm");
    const pnpmIndex = pathIndex(pathEntries, pnpmBinDir);
    const bunIndex = pathIndex(pathEntries, bunGlobalBinDir);
    const pnpmBeforeBunInPath = pnpmIndex !== -1 && bunIndex !== -1 && pnpmIndex < bunIndex;

    const cliPackageJsonPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../package.json");
    let workspaceDependencyCount = 0;
    try {
      const parsed = JSON.parse(fs.readFileSync(cliPackageJsonPath, "utf8")) as {
        dependencies?: Record<string, string>;
      };
      workspaceDependencyCount = Object.values(parsed.dependencies ?? {}).filter((value) =>
        String(value).startsWith("workspace:"),
      ).length;
    } catch {
      workspaceDependencyCount = 0;
    }

    const data: DoctorGlobalData = {
      commandPath: commandResolved,
      commandPathReal: commandResolvedReal,
      bunGlobalBinDir,
      bunGlobalRawrPath,
      bunGlobalRawrReal,
      cliBinPath,
      cliBinReal,
      pnpmRawrShimPath,
      pnpmRawrShimExists: fs.existsSync(pnpmRawrShimPath),
      pnpmBeforeBunInPath,
      workspaceDependencyCount,
      currentInstanceRoot,
      currentInstanceRootReal,
      ownerFilePath,
      ownerFileExists,
      ownerWorkspacePath,
      ownerWorkspaceReal,
      ownerMatchesCurrentInstanceByRealpath,
      aliasInstanceSeamStatus,
      commandSurfaces: {
        externalCliPlugins: "rawr plugins ...",
        workspaceRuntimePlugins: "rawr plugins web ...",
      },
      recommendedMode: "bun-symlink",
    };

    const looksHealthy =
      commandResolved === bunGlobalRawrPath &&
      bunGlobalRawrReal !== null &&
      cliBinReal !== null &&
      bunGlobalRawrReal === cliBinReal;

    const warnings: string[] = [];
    if (data.pnpmRawrShimExists) warnings.push(`Stale pnpm shim exists at ${data.pnpmRawrShimPath}`);
    if (data.pnpmBeforeBunInPath)
      warnings.push("PATH currently prefers pnpm bin over Bun bin; this can shadow rawr unexpectedly.");
    if (data.workspaceDependencyCount > 0) {
      warnings.push(
        "CLI package uses workspace dependencies; Bun global install/link expects published or fully linkable deps. Use scripts/dev/install-global-rawr.sh for local-global setup.",
      );
    }
    if (data.aliasInstanceSeamStatus === "owner-file-empty") {
      warnings.push(`Owner file exists but is empty: ${data.ownerFilePath}`);
    }
    if (data.aliasInstanceSeamStatus === "owner-other-instance") {
      warnings.push(
        `Owner file points to another checkout (${data.ownerWorkspacePath}); run ./scripts/dev/activate-global-rawr.sh in this checkout to transfer ownership explicitly.`,
      );
    }

    if (!looksHealthy) {
      const result = this.fail("Global rawr is not configured for Bun-global execution", {
        code: "GLOBAL_RAWR_MISCONFIGURED",
        details: data,
      });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log("Global rawr check failed.");
          this.log(`- command -v rawr: ${commandResolved ?? "(not found)"}`);
          this.log(`- expected path: ${bunGlobalRawrPath}`);
          this.log(`- expected target: ${cliBinPath}`);
          this.log(`- alias/instance seam: ${data.aliasInstanceSeamStatus}`);
          this.log(`- owner file: ${data.ownerFilePath}`);
          if (data.ownerWorkspacePath) this.log(`- owner workspace: ${data.ownerWorkspacePath}`);
          this.log(`- current instance root: ${data.currentInstanceRoot}`);
          this.log("");
          this.log("Fix:");
          let step = 1;
          if (data.aliasInstanceSeamStatus === "owner-other-instance") {
            this.log(`${step}. ./scripts/dev/activate-global-rawr.sh`);
            step += 1;
          }
          this.log(`${step}. ./scripts/dev/install-global-rawr.sh`);
          step += 1;
          this.log(`${step}. hash -r`);
          step += 1;
          this.log(`${step}. git config core.hooksPath scripts/githooks`);
          this.log("");
          this.log("Command surfaces:");
          this.log(`- ${data.commandSurfaces.externalCliPlugins} (external CLI plugin channel)`);
          this.log(`- ${data.commandSurfaces.workspaceRuntimePlugins} (workspace runtime plugin channel)`);
        },
      });
      this.exit(1);
      return;
    }

    const result = this.ok(data, undefined, warnings.length > 0 ? warnings : undefined);
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log("Global rawr is configured for Bun-global execution.");
        this.log(`- command -v rawr: ${data.commandPath}`);
        this.log(`- target: ${data.cliBinPath}`);
        this.log(`- alias/instance seam: ${data.aliasInstanceSeamStatus}`);
        this.log(`- owner file: ${data.ownerFilePath}`);
        if (data.ownerWorkspacePath) this.log(`- owner workspace: ${data.ownerWorkspacePath}`);
        this.log(`- current instance root: ${data.currentInstanceRoot}`);
        if (warnings.length > 0) {
          this.log("");
          this.log("Warnings:");
          for (const warning of warnings) this.log(`- ${warning}`);
        }
        this.log("");
        this.log("Command surfaces:");
        this.log(`- ${data.commandSurfaces.externalCliPlugins} (external CLI plugin channel)`);
        this.log(`- ${data.commandSurfaces.workspaceRuntimePlugins} (workspace runtime plugin channel)`);
      },
    });
  }
}
