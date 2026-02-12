import fs from "node:fs/promises";
import path from "node:path";

import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { checkScratchPolicy } from "@rawr/hq/lifecycle";

import { runCommand } from "../../lib/plugins-lifecycle/process";
import type { LifecycleType } from "../../lib/plugins-lifecycle/types";
import { findWorkspaceRoot, listWorkspacePlugins } from "../../lib/workspace-plugins";

type SweepCandidate = {
  target: string;
  type: LifecycleType;
  issues: string[];
};

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function inferTypeFromPath(absPath: string): LifecycleType {
  const normalized = absPath.split(path.sep).join("/");
  if (normalized.includes("/plugins/cli/")) return "cli";
  if (normalized.includes("/plugins/web/")) return "web";
  if (normalized.includes("/plugins/agents/")) return "agent";
  return "composed";
}

async function collectCandidateIssues(absPath: string): Promise<string[]> {
  const issues: string[] = [];
  if (!(await pathExists(path.join(absPath, "README.md")))) issues.push("missing README.md");

  const testDir = path.join(absPath, "test");
  if (!(await pathExists(testDir))) {
    issues.push("missing test/ directory");
  } else {
    const entries = await fs.readdir(testDir, { withFileTypes: true });
    const hasTests = entries.some((e) => e.isFile() && /\.(test|spec)\.[cm]?[jt]sx?$/.test(e.name));
    if (!hasTests) issues.push("missing test files in test/");
  }

  return issues;
}

export default class PluginsSweep extends RawrCommand {
  static description = "Run scheduled/manual plugin-system sweep and queue scoped no-policy improvement actions";

  static flags = {
    ...RawrCommand.baseFlags,
    scope: Flags.string({
      description: "Sweep scope",
      options: ["plugin-system"],
      default: "plugin-system",
    }),
    scheduled: Flags.boolean({
      description: "Mark this sweep as scheduled cadence run",
      default: false,
    }),
    manual: Flags.boolean({
      description: "Mark this sweep as manual run",
      default: false,
    }),
    target: Flags.string({
      description: "Specific target path/id (repeatable)",
      multiple: true,
    }),
    limit: Flags.integer({
      description: "Max number of candidates to queue",
      default: 20,
      min: 1,
    }),
    publish: Flags.boolean({
      description: "Execute queued improve runs with --publish",
      default: false,
    }),
    "wait-minutes": Flags.integer({
      description: "Comment wait minutes passed through to improve when publish=true",
      default: 20,
      min: 0,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsSweep);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const scheduled = Boolean(flags.scheduled);
    const manual = Boolean(flags.manual);
    if (!scheduled && !manual) {
      const result = this.fail("Sweep mode required: specify either --scheduled or --manual", {
        code: "SWEEP_MODE_REQUIRED",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }
    if (scheduled && manual) {
      const result = this.fail("Sweep mode must be exactly one of --scheduled or --manual", {
        code: "SWEEP_MODE_CONFLICT",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", {
        code: "WORKSPACE_ROOT_MISSING",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const explicitTargets = ((flags as Record<string, unknown>).target as string[] | undefined) ?? [];

    const candidates: SweepCandidate[] = [];
    if (explicitTargets.length > 0) {
      for (const t of explicitTargets) {
        const abs = path.isAbsolute(t) ? t : path.resolve(workspaceRoot, t);
        if (!(await pathExists(abs))) continue;
        const issues = await collectCandidateIssues(abs);
        if (issues.length === 0) continue;
        candidates.push({
          target: abs,
          type: inferTypeFromPath(abs),
          issues,
        });
      }
    } else {
      const plugins = await listWorkspacePlugins(workspaceRoot);
      for (const plugin of plugins) {
        const issues = await collectCandidateIssues(plugin.absPath);
        if (issues.length === 0) continue;
        candidates.push({
          target: plugin.absPath,
          type: inferTypeFromPath(plugin.absPath),
          issues,
        });
      }
    }

    const limited = candidates.slice(0, Number(flags.limit));
    const actions: Array<{ action: string; status: "planned" | "done" | "failed"; notes?: string }> = [];
    const warnings: string[] = [];

    if (flags.publish) {
      if (!baseFlags.dryRun) {
        const scratch = await checkScratchPolicy(workspaceRoot);
        if (scratch.mode === "block" && scratch.missing.length > 0) {
          const result = this.fail("Scratch policy blocked sweep --publish; required scratch docs are missing", {
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
        if (scratch.mode === "warn" && scratch.missing.length > 0) {
          warnings.push(`scratch policy warning: missing ${scratch.missing.join(", ")}`);
        }
      }

      for (const item of limited) {
        const cmd = [
          "run",
          "rawr",
          "--",
          "plugins",
          "improve",
          "--target",
          item.target,
          "--type",
          item.type,
          "--publish",
          "--wait-minutes",
          String((flags as Record<string, unknown>)["wait-minutes"] ?? 20),
          "--json",
        ];

        if (baseFlags.dryRun) {
          actions.push({ action: `bun ${cmd.join(" ")}`, status: "planned" });
          continue;
        }

        const r = await runCommand("bun", cmd, { cwd: workspaceRoot, timeoutMs: 300_000 });
        actions.push({
          action: `bun ${cmd.join(" ")}`,
          status: r.exitCode === 0 ? "done" : "failed",
          notes: r.exitCode === 0 ? undefined : r.stderr || r.stdout,
        });
      }
    } else {
      for (const item of limited) {
        actions.push({
          action: `rawr plugins improve --target ${item.target} --type ${item.type} --publish`,
          status: "planned",
          notes: `issues: ${item.issues.join("; ")}`,
        });
      }
    }

    const payload = this.ok({
      scope: "plugin-system",
      mode: scheduled ? "scheduled" : "manual",
      queued: limited.map((c) => ({ target: c.target, type: c.type, issues: c.issues })),
      actions,
    }, undefined, warnings.length > 0 ? warnings : undefined);

    this.outputResult(payload, {
      flags: baseFlags,
      human: () => {
        this.log(`mode: ${scheduled ? "scheduled" : "manual"}`);
        this.log(`scope: plugin-system`);
        for (const warning of warnings) this.log(`warning: ${warning}`);
        this.log(`queued: ${limited.length}`);
        for (const c of limited) this.log(`- ${c.type} ${c.target} (${c.issues.join("; ")})`);
      },
    });
  }
}
