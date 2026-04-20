import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import {
  checkScratchPolicy,
  collectChangedFiles,
  decideMergePolicy,
  evaluateLifecycleCompleteness,
  gitTrackedFiles,
  readPrContext,
  resolveLifecycleTarget,
  runJudge,
  verifySyncAndDrift,
} from "../../lib/plugin-lifecycle-service";
import { runCommand } from "../../lib/process-execution";
import type { DecideMergePolicyResult, LifecycleCheckData, LifecycleType, PrContext } from "@rawr/hq-ops/types";
import { findWorkspaceRoot } from "@rawr/core";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ImprovementResult = {
  changeUnitId: string;
  scope: "plugin-system";
  lifecycleCheck: LifecycleCheckData;
  policyAssessment: DecideMergePolicyResult["policyAssessment"];
  prContext: PrContext;
  decision: DecideMergePolicyResult["decision"];
  actions: Array<{ action: string; status: "planned" | "done" | "skipped" | "failed"; notes?: string }>;
};

export default class PluginsImprove extends RawrCommand {
  static description = "Propose/apply no-policy plugin quality improvements with two-pass policy judgment";

  static flags = {
    ...RawrCommand.baseFlags,
    target: Flags.string({
      description: "Target path or plugin id",
      required: true,
    }),
    type: Flags.string({
      description: "Change unit type",
      options: ["cli", "web", "agent", "skill", "workflow", "composed"],
      required: true,
    }),
    scope: Flags.string({
      description: "Improvement scope",
      options: ["plugin-system"],
      default: "plugin-system",
    }),
    publish: Flags.boolean({
      description: "Publish stack with Graphite (`gt submit --stack --ai`)",
      default: false,
    }),
    wait: Flags.boolean({
      description: "Wait for PR comment window before judgment",
      default: true,
      allowNo: true,
    }),
    "wait-minutes": Flags.integer({
      description: "Minutes to wait after publish before reading comments",
      default: 20,
      min: 0,
    }),
    base: Flags.string({
      description: "Optional git base ref for changed-file calculation",
    }),
    "changed-file": Flags.string({
      description: "Explicit changed file (repeatable); bypasses git diff discovery",
      multiple: true,
    }),
    "skip-sync-check": Flags.boolean({
      description: "Skip sync/drift verification commands",
      default: false,
      allowNo: true,
    }),
    "judge1-cmd": Flags.string({
      description: "Judge A shell command; reads JSON from stdin and returns JSON verdict",
    }),
    "judge2-cmd": Flags.string({
      description: "Judge B shell command; reads JSON from stdin and returns JSON verdict",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(PluginsImprove);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)", {
        code: "WORKSPACE_ROOT_MISSING",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const targetInput = String(flags.target);
    const target = await resolveLifecycleTarget({
      workspaceRoot,
      target: targetInput,
      type: String(flags.type) as LifecycleType,
      traceId: "plugin-plugins.plugin-lifecycle.improve-resolve-target",
    });
    if (!target) {
      const result = this.fail("Unable to resolve lifecycle target path/id", {
        code: "TARGET_NOT_FOUND",
        details: { target: targetInput },
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const changedFiles =
      ((flags as Record<string, unknown>)["changed-file"] as string[] | undefined)?.map((s) => s.trim()).filter(Boolean) ?? [];
    const derivedChanged =
      changedFiles.length > 0
        ? changedFiles
        : await collectChangedFiles(workspaceRoot, typeof flags.base === "string" ? flags.base : undefined);

    const repoFiles = await gitTrackedFiles(workspaceRoot);
    const sync = (flags as Record<string, unknown>)["skip-sync-check"]
      ? { syncVerified: true, driftVerified: true, driftDetected: false }
      : await verifySyncAndDrift(workspaceRoot);

    const lifecycle = await evaluateLifecycleCompleteness({
      workspaceRoot,
      targetInput,
      targetAbs: target.absPath,
      type: String(flags.type) as LifecycleType,
      changedFiles: derivedChanged,
      repoFiles,
      syncVerified: sync.syncVerified,
      driftVerified: sync.driftVerified,
      driftDetected: sync.driftDetected,
      traceId: "plugin-plugins.plugin-lifecycle.improve-evaluate-completeness",
    });

    const actions: ImprovementResult["actions"] = [];
    const warnings: string[] = [];

    const publish = Boolean(flags.publish);
    if (publish && !baseFlags.dryRun) {
      const scratch = await checkScratchPolicy(workspaceRoot);
      if (scratch.mode === "block" && scratch.missing.length > 0) {
        const result = this.fail("Scratch policy blocked improve --publish; required scratch docs are missing", {
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

    if (publish) {
      if (baseFlags.dryRun) {
        actions.push({ action: "gt submit --stack --ai", status: "planned" });
      } else {
        const publishRun = await runCommand("gt", ["submit", "--stack", "--ai"], { cwd: workspaceRoot, timeoutMs: 180_000 });
        actions.push({
          action: "gt submit --stack --ai",
          status: publishRun.exitCode === 0 ? "done" : "failed",
          notes: publishRun.exitCode === 0 ? undefined : publishRun.stderr || publishRun.stdout,
        });
      }

      const waitEnabled = Boolean((flags as Record<string, unknown>).wait);
      const waitMinutes = Number((flags as Record<string, unknown>)["wait-minutes"] ?? 20);
      if (waitEnabled && waitMinutes > 0) {
        if (baseFlags.dryRun) {
          actions.push({ action: `wait ${waitMinutes}m for PR comments`, status: "planned" });
        } else {
          await sleep(waitMinutes * 60_000);
          actions.push({ action: `wait ${waitMinutes}m for PR comments`, status: "done" });
        }
      }
    }

    const prContext = await readPrContext(workspaceRoot);

    const judgeInput = {
      lifecycleContract: lifecycle,
      policyVocabularyPath:
        "plugins/agents/hq/skills/agent-plugin-management/references/policy-classification.md",
      stackDiff: {
        changedFiles: lifecycle.details.changedFilesConsidered,
        relevantChangedFiles: lifecycle.details.relevantChangedFiles,
      },
      prContext,
    };

    const judge1Cmd =
      (typeof (flags as Record<string, unknown>)["judge1-cmd"] === "string"
        ? String((flags as Record<string, unknown>)["judge1-cmd"])
        : undefined) ?? process.env.RAWR_POLICY_JUDGE1_CMD;
    const judge2Cmd =
      (typeof (flags as Record<string, unknown>)["judge2-cmd"] === "string"
        ? String((flags as Record<string, unknown>)["judge2-cmd"])
        : undefined) ?? process.env.RAWR_POLICY_JUDGE2_CMD;

    const judge1 = await runJudge("A", judge1Cmd, judgeInput, workspaceRoot);
    const judge2 = await runJudge("B", judge2Cmd, judgeInput, workspaceRoot);
    const mergePolicy = await decideMergePolicy({
      workspaceRoot,
      lifecycle,
      prContext,
      judgeA: judge1,
      judgeB: judge2,
      baseBranch: prContext.branch,
      changeUnitId: `${String(flags.type)}:${targetInput}`,
      traceId: "plugin-plugins.plugin-lifecycle.improve-merge-policy",
    });

    if (mergePolicy.decision === "auto_merge" && publish) {
      if (baseFlags.dryRun) {
        actions.push({ action: "gt merge", status: "planned" });
        actions.push({ action: "gt sync --no-restack", status: "planned" });
      } else {
        const mergeRun = await runCommand("gt", ["merge"], { cwd: workspaceRoot, timeoutMs: 120_000 });
        actions.push({
          action: "gt merge",
          status: mergeRun.exitCode === 0 ? "done" : "failed",
          notes: mergeRun.exitCode === 0 ? undefined : mergeRun.stderr || mergeRun.stdout,
        });

        if (mergeRun.exitCode === 0) {
          const syncRun = await runCommand("gt", ["sync", "--no-restack"], { cwd: workspaceRoot, timeoutMs: 120_000 });
          actions.push({
            action: "gt sync --no-restack",
            status: syncRun.exitCode === 0 ? "done" : "failed",
            notes: syncRun.exitCode === 0 ? undefined : syncRun.stderr || syncRun.stdout,
          });
        }
      }
    } else if (mergePolicy.decision === "fix_first") {
      const fixBranch = mergePolicy.fixSlicePlan?.branchName;

      if (!publish) {
        actions.push({
          action: "create follow-up fix slice",
          status: "planned",
          notes: fixBranch
            ? `fix lifecycle blockers and/or PR feedback before merge (rerun with --publish to auto-create: ${fixBranch})`
            : "fix lifecycle blockers and/or PR feedback before merge",
        });
      } else if (baseFlags.dryRun) {
        actions.push({
          action: `gt create --insert ${fixBranch ?? "<fix-slice>"}`,
          status: "planned",
          notes: "create follow-up fix slice for lifecycle blockers and/or PR feedback",
        });
      } else {
        const createFixRun = await runCommand("gt", ["create", "--insert", fixBranch ?? `${prContext.branch}-fix`], {
          cwd: workspaceRoot,
          timeoutMs: 120_000,
        });
        actions.push({
          action: `gt create --insert ${fixBranch ?? "<fix-slice>"}`,
          status: createFixRun.exitCode === 0 ? "done" : "failed",
          notes: createFixRun.exitCode === 0 ? "created follow-up fix slice" : createFixRun.stderr || createFixRun.stdout,
        });
      }
    } else if (mergePolicy.decision === "policy_escalation") {
      actions.push({
        action: "escalate for human or human+agent review",
        status: "planned",
      });
    } else {
      actions.push({
        action: "hold stack for review",
        status: "planned",
        notes: "comments present, disagreement, or insufficient confidence",
      });
    }

    const payload: ImprovementResult = {
      changeUnitId: `${String(flags.type)}:${targetInput}`,
      scope: "plugin-system",
      lifecycleCheck: lifecycle,
      policyAssessment: mergePolicy.policyAssessment,
      prContext: mergePolicy.prContext,
      decision: mergePolicy.decision,
      actions,
    };

    if (lifecycle.status !== "pass") {
      const result = this.fail("Lifecycle check failed; improvement cannot proceed to no-policy merge flow", {
        code: "LIFECYCLE_CHECK_FAILED",
        details: payload,
      });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`decision: fix_first`);
          this.log(`reason: lifecycle check failed`);
          if (lifecycle.missingTests.length > 0) this.log(`missing_tests: ${lifecycle.missingTests.join("; ")}`);
          if (lifecycle.missingDocs.length > 0) this.log(`missing_docs: ${lifecycle.missingDocs.join("; ")}`);
          if (lifecycle.missingDependents.length > 0) {
            this.log("missing_dependents:");
            for (const item of lifecycle.missingDependents) this.log(`- ${item}`);
          }
        },
      });
      this.exit(2);
      return;
    }

    const result = this.ok(payload, undefined, warnings.length > 0 ? warnings : undefined);
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`target: ${lifecycle.target.relPath}`);
        this.log(`decision: ${payload.decision}`);
        for (const warning of warnings) this.log(`warning: ${warning}`);
        this.log(`judgeA: ${payload.policyAssessment.judge1.outcome} (${payload.policyAssessment.judge1.confidence.toFixed(2)})`);
        this.log(`judgeB: ${payload.policyAssessment.judge2.outcome} (${payload.policyAssessment.judge2.confidence.toFixed(2)})`);
        this.log(`comments: ${payload.prContext.commentsCount}`);
        for (const action of payload.actions) {
          this.log(`${action.status}: ${action.action}${action.notes ? ` (${action.notes})` : ""}`);
        }
      },
    });
  }
}
