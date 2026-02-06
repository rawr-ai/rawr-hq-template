import { RawrCommand } from "@rawr/core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
      cliBinPath: cliBinPath,
      cliBinReal: cliBinReal,
      pnpmRawrShimPath,
      pnpmRawrShimExists: fs.existsSync(pnpmRawrShimPath),
      pnpmBeforeBunInPath,
      workspaceDependencyCount,
      recommendedMode: "bun-symlink",
    };

    const looksHealthy =
      commandResolved === bunGlobalRawrPath &&
      bunGlobalRawrReal !== null &&
      cliBinReal !== null &&
      bunGlobalRawrReal === cliBinReal;

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
          this.log("");
          this.log("Fix:");
          this.log("1. ./scripts/dev/install-global-rawr.sh");
          this.log("2. hash -r");
          this.log("3. git config core.hooksPath scripts/githooks");
        },
      });
      this.exit(1);
      return;
    }

    const warnings: string[] = [];
    if (data.pnpmRawrShimExists) warnings.push(`Stale pnpm shim exists at ${data.pnpmRawrShimPath}`);
    if (data.pnpmBeforeBunInPath)
      warnings.push("PATH currently prefers pnpm bin over Bun bin; this can shadow rawr unexpectedly.");
    if (data.workspaceDependencyCount > 0) {
      warnings.push(
        "CLI package uses workspace dependencies; Bun global install/link expects published or fully linkable deps. Use scripts/dev/install-global-rawr.sh for local-global setup.",
      );
    }

    const result = this.ok(data, undefined, warnings.length > 0 ? warnings : undefined);
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log("Global rawr is configured for Bun-global execution.");
        this.log(`- command -v rawr: ${data.commandPath}`);
        this.log(`- target: ${data.cliBinPath}`);
        if (warnings.length > 0) {
          this.log("");
          this.log("Warnings:");
          for (const warning of warnings) this.log(`- ${warning}`);
        }
      },
    });
  }
}
