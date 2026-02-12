import { spawnSync } from "node:child_process";
import path from "node:path";

import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { checkScratchPolicy } from "@rawr/hq/lifecycle";

import { findWorkspaceRoot } from "../../lib/workspace-plugins";

type StepRun = {
  step: "install-repair" | "sync-all" | "final-status";
  args: string[];
  exitCode: number;
  ok: boolean;
  stdout: string;
  stderr: string;
  json?: unknown;
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

function parseJsonMaybe(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

function statusFromResult(parsed: unknown): string | null {
  const candidate = (parsed as any)?.data?.statuses?.overall;
  return typeof candidate === "string" ? candidate : null;
}

function stepSummary(step: StepRun): Record<string, unknown> {
  const parsed = step.json as any;
  if (!parsed || typeof parsed !== "object") {
    return { parsed: false };
  }

  if (step.step === "install-repair") {
    return {
      parsed: true,
      status: parsed?.data?.status ?? parsed?.data?.report?.status ?? null,
      repair: parsed?.data?.repair?.result?.action ?? null,
      issueCount: parsed?.data?.report?.summary?.issueCount ?? null,
    };
  }

  if (step.step === "sync-all") {
    return {
      parsed: true,
      ok: parsed?.ok ?? null,
      syncedPlugins: Array.isArray(parsed?.data?.results) ? parsed.data.results.length : null,
      skippedPlugins: Array.isArray(parsed?.data?.skipped) ? parsed.data.skipped.length : null,
      installReconcile: parsed?.data?.installReconcile?.action ?? null,
    };
  }

  return {
    parsed: true,
    overall: parsed?.data?.statuses?.overall ?? null,
    sync: parsed?.data?.statuses?.sync ?? null,
    install: parsed?.data?.statuses?.install ?? null,
  };
}

export default class PluginsConverge extends RawrCommand {
  static description = "Deterministic convergence loop: install repair -> sync all -> final health status";

  static flags = {
    ...RawrCommand.baseFlags,
    "install-repair": Flags.boolean({
      description: "Run install/link repair before sync",
      default: true,
      allowNo: true,
    }),
    sync: Flags.boolean({
      description: "Run plugins sync all as part of convergence",
      default: true,
      allowNo: true,
    }),
    "no-fail": Flags.boolean({
      description: "Return zero even when final status is unhealthy",
      default: false,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsConverge);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const includeInstallRepair = Boolean((flags as any)["install-repair"]);
    const includeSync = Boolean(flags.sync);
    const noFail = Boolean((flags as any)["no-fail"]);

    try {
      const workspaceRoot = await findWorkspaceRoot(process.cwd());
      if (!workspaceRoot) {
        const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", {
          code: "WORKSPACE_ROOT_MISSING",
        });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      const mutating = !baseFlags.dryRun && (includeInstallRepair || includeSync);
      const scratch = mutating ? await checkScratchPolicy(workspaceRoot) : null;
      if (scratch?.mode === "block" && scratch.missing.length > 0) {
        const result = this.fail("Scratch policy blocked convergence; required scratch docs are missing", {
          code: "SCRATCH_POLICY_BLOCKED",
          details: {
            mode: scratch.mode,
            missing: scratch.missing,
            hint: "Create docs/projects/*/PLAN_SCRATCH.md and WORKING_PAD.md or set RAWR_SCRATCH_POLICY_MODE=warn/off for this run.",
          },
        });
        this.outputResult(result, { flags: baseFlags });
        this.exit(2);
        return;
      }

      const warnings: string[] = [];
      if (scratch?.mode === "warn" && scratch.missing.length > 0) {
        warnings.push(`scratch policy warning: missing ${scratch.missing.join(", ")}`);
      }

      const steps: StepRun[] = [];

      if (includeInstallRepair) {
        const args = ["plugins", "doctor", "links", "--repair", "--no-fail", "--json"];
        if (baseFlags.dryRun) args.push("--dry-run");
        const run = runRawrFromSource(workspaceRoot, args);
        steps.push({
          step: "install-repair",
          args,
          exitCode: run.exitCode,
          ok: run.ok,
          stdout: run.stdout,
          stderr: run.stderr,
          json: parseJsonMaybe(run.stdout),
        });
      }

      if (includeSync) {
        const args = ["plugins", "sync", "all", "--json"];
        if (baseFlags.dryRun) args.push("--dry-run");
        const run = runRawrFromSource(workspaceRoot, args);
        steps.push({
          step: "sync-all",
          args,
          exitCode: run.exitCode,
          ok: run.ok,
          stdout: run.stdout,
          stderr: run.stderr,
          json: parseJsonMaybe(run.stdout),
        });
      }

      const finalArgs = ["plugins", "status", "--checks", "all", "--json"];
      if (baseFlags.dryRun) finalArgs.push("--dry-run");
      const finalRun = runRawrFromSource(workspaceRoot, finalArgs);
      const finalJson = parseJsonMaybe(finalRun.stdout);
      const finalOverall = statusFromResult(finalJson);
      const healthy = finalOverall === "HEALTHY";
      const failures = steps.filter((step) => !step.ok);

      steps.push({
        step: "final-status",
        args: finalArgs,
        exitCode: finalRun.exitCode,
        ok: finalRun.ok,
        stdout: finalRun.stdout,
        stderr: finalRun.stderr,
        json: finalJson,
      });

      const result = this.ok({
        workspaceRoot,
        healthy,
        finalOverall: finalOverall ?? "UNKNOWN",
        scratchPolicy: scratch
          ? {
              mode: scratch.mode,
              missing: scratch.missing,
              bypassed: scratch.bypassed,
            }
          : { mode: "off", missing: [], bypassed: false },
        steps: steps.map((step) => ({
          step: step.step,
          args: step.args,
          exitCode: step.exitCode,
          ok: step.ok,
          summary: stepSummary(step),
        })),
        failures: failures.map((failure) => ({
          step: failure.step,
          exitCode: failure.exitCode,
          stderr: failure.stderr.trim(),
        })),
      }, undefined, warnings.length > 0 ? warnings : undefined);

      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`workspace: ${workspaceRoot}`);
          this.log(`final: ${finalOverall ?? "UNKNOWN"}`);
          for (const warning of warnings) this.log(`warning: ${warning}`);
          for (const step of steps) this.log(`- ${step.step}: ${step.ok ? "ok" : "failed"} (exit=${step.exitCode})`);
        },
      });

      if (!noFail && (!healthy || failures.length > 0)) {
        this.exit(1);
        return;
      }
    } catch (error) {
      if ((error as any)?.code === "EEXIT") throw error;
      const message = error instanceof Error ? error.message : String(error);
      const result = this.fail(message, { code: "PLUGINS_CONVERGE_FAILED" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
    }
  }
}
