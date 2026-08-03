import { parseGitStatus, parseWorktrees } from "../../../model/policy/git-output";
import {
  execution,
  executionIssueFromStep,
  issue,
  observedStep,
  planned,
  preflight,
  rejectedStep,
  skipped,
  warning,
} from "../../../model/policy/operation-outcomes";
import { timestampForBranch } from "../model/policy/sync-branch";
import { module } from "../module";

/** Synchronizes one admitted repository through its ordered Git and Graphite plan. */
export const syncUpstream = module.syncUpstream.handler(async ({ context, input }) => {
  const execStep = async (command: string, args: string[], timeoutMs?: number) => {
    try {
      const result = await context.process.exec(command, args, {
        cwd: context.workspaceRoot,
        timeoutMs,
      });
      return observedStep(command, args, result);
    } catch (error) {
      return rejectedStep(command, args, error);
    }
  };

  const apply = Boolean(input.apply);
  const branchPrefix = input.branchPrefix ?? "chore/upstream-sync";
  const branchName = `${branchPrefix}-${timestampForBranch(context.clock.now())}`;
  let upstreamRef: { ref: string; source: "flag" | "git-config" | "default" };
  if (input.upstreamRef) {
    upstreamRef = { ref: input.upstreamRef, source: "flag" };
  } else {
    const config = await execStep("git", ["config", "--get", "rawr.upstreamRef"]);
    const configured = (config.stdout ?? "").trim();
    upstreamRef =
      config.status === "succeeded" && configured
        ? { ref: configured, source: "git-config" }
        : { ref: "origin/main", source: "default" };
  }
  const scratchPolicy = await context.checkScratchPolicy({
    ...input.scratchPolicy,
    enforce: apply,
  });
  const steps = [
    planned("git", ["fetch", "--all", "--prune"]),
    planned("git", ["switch", "-c", branchName]),
    planned("git", ["merge", "--no-ff", upstreamRef.ref]),
    planned("gt", ["sync", "--no-restack"]),
    planned("gt", ["restack", "--upstack"]),
  ];
  const issues = [];

  const gitStatus = await execStep("git", ["status", "--short", "--branch"]);
  const parsedStatus = parseGitStatus(gitStatus.stdout ?? "");
  if (parsedStatus.dirty)
    issues.push(issue("DIRTY_WORKING_TREE", "Working tree must be clean before upstream sync."));
  if (parsedStatus.detached)
    issues.push(issue("DETACHED_HEAD_UNSUPPORTED", "Upstream sync requires a named branch."));

  const refCheck = await execStep("git", ["rev-parse", "--verify", upstreamRef.ref]);
  if (refCheck.status !== "succeeded") {
    issues.push(
      issue("UPSTREAM_REF_MISSING", "Configured upstream ref does not exist.", {
        upstreamRef: upstreamRef.ref,
      })
    );
  }

  const branchCheck = await execStep("git", ["show-ref", "--verify", `refs/heads/${branchName}`]);
  if (branchCheck.status === "succeeded") {
    issues.push(
      issue("BRANCH_ALREADY_EXISTS", "Generated sync branch already exists.", { branchName })
    );
  }

  const worktreeList = await execStep("git", ["worktree", "list", "--porcelain"]);
  if (worktreeList.status === "succeeded") {
    const occupied = parseWorktrees(worktreeList.stdout ?? "").find(
      (entry) => entry.branch === branchName
    );
    if (occupied) {
      issues.push(
        issue(
          "BRANCH_CHECKED_OUT_ELSEWHERE",
          "Generated sync branch is checked out in another worktree.",
          {
            branchName,
            path: occupied.path,
          }
        )
      );
    }
  }
  const gtLs = await execStep("gt", ["ls"]);
  if (gtLs.status !== "succeeded") {
    issues.push(
      issue("GRAPHITE_UNAVAILABLE", "Graphite stack state is not readable.", {
        stderr: gtLs.stderr,
      })
    );
  }

  if (scratchPolicy.blocked) {
    issues.push(
      issue("SCRATCH_POLICY_BLOCKED", "Scratch policy blocked upstream sync.", {
        missing: scratchPolicy.missing,
      })
    );
  } else if (scratchPolicy.mode === "warn" && scratchPolicy.missing.length > 0 && apply) {
    issues.push(
      warning("SCRATCH_POLICY_WARNING", "Scratch policy warning.", {
        missing: scratchPolicy.missing,
      })
    );
  }
  const check = preflight(issues);
  if (!apply || !check.ok) {
    return {
      workspaceRoot: context.workspaceRoot,
      action: "planned" as const,
      branchName,
      upstreamRef,
      currentBranch: parsedStatus.branch,
      steps,
      preflight: check,
      execution: execution(),
      scratchPolicy,
    };
  }

  const appliedSteps = [
    await execStep("git", ["fetch", "--all", "--prune"], 180_000),
    skipped("git", ["switch", "-c", branchName]),
    skipped("git", ["merge", "--no-ff", upstreamRef.ref]),
    skipped("gt", ["sync", "--no-restack"]),
    skipped("gt", ["restack", "--upstack"]),
  ];

  if (appliedSteps[0].status === "succeeded") {
    appliedSteps[1] = await execStep("git", ["switch", "-c", branchName]);
  }
  if (appliedSteps[1].status === "succeeded") {
    appliedSteps[2] = await execStep("git", ["merge", "--no-ff", upstreamRef.ref], 300_000);
  }
  if (appliedSteps[2].status === "succeeded") {
    appliedSteps[3] = await execStep("gt", ["sync", "--no-restack"], 120_000);
    if (appliedSteps[3].status === "succeeded") {
      appliedSteps[4] = await execStep("gt", ["restack", "--upstack"], 120_000);
    }
  }
  const executionIssues = appliedSteps
    .map((step) =>
      executionIssueFromStep(step, "REPO_SYNC_COMMAND_FAILED", "Repo sync command failed.")
    )
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    workspaceRoot: context.workspaceRoot,
    action: "applied" as const,
    branchName,
    upstreamRef,
    currentBranch: parsedStatus.branch,
    steps: appliedSteps,
    preflight: check,
    execution: execution(executionIssues),
    scratchPolicy,
  };
});
