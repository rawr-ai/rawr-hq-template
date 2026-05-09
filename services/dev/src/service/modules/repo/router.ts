import {
  execStep,
  execText,
  execution,
  executionIssueFromStep,
  issue,
  parseGitStatus,
  parseWorktrees,
  planned,
  preflight,
  skipped,
  timestampForBranch,
  warning,
} from "../../common/helpers";
import { checkScratchPolicy } from "../scratch-policy/helpers";
import { module } from "./module";

async function resolveUpstreamRef(context: { workspaceRoot: string; resources: any }, explicit?: string) {
  if (explicit) return { ref: explicit, source: "flag" as const };
  const config = await execText(context.resources, context.workspaceRoot, "git", ["config", "--get", "rawr.upstreamRef"]);
  const configured = (config.stdout ?? "").trim();
  if (config.status === "succeeded" && configured) return { ref: configured, source: "git-config" as const };
  return { ref: "origin/main", source: "default" as const };
}

const syncUpstream = module.syncUpstream.handler(async ({ context, input }) => {
  const apply = Boolean(input.apply);
  const branchPrefix = input.branchPrefix ?? "chore/upstream-sync";
  const branchName = `${branchPrefix}-${timestampForBranch(context.resources.clock.now())}`;
  const upstreamRef = await resolveUpstreamRef(context, input.upstreamRef);
  const scratchPolicy = await checkScratchPolicy({
    workspaceRoot: context.workspaceRoot,
    resources: context.resources,
    request: { ...input.scratchPolicy, enforce: apply },
  });
  const steps = [
    planned("git", ["fetch", "--all", "--prune"]),
    planned("git", ["switch", "-c", branchName]),
    planned("git", ["merge", "--no-ff", upstreamRef.ref]),
    planned("gt", ["sync", "--no-restack"]),
    planned("gt", ["restack", "--upstack"]),
  ];
  const followUpCommands = input.convergeAfter
    ? [
        planned("rawr", ["plugins", "status", "--checks", "install", "--repair", "--no-fail", "--json"]),
        planned("rawr", ["plugins", "sync", "all", "--json"]),
        planned("rawr", ["plugins", "status", "--checks", "all", "--json"]),
      ]
    : [];
  const issues = [];

  const gitStatus = await execText(context.resources, context.workspaceRoot, "git", ["status", "--short", "--branch"]);
  const parsedStatus = parseGitStatus(gitStatus.stdout ?? "");
  if (parsedStatus.dirty) issues.push(issue("DIRTY_WORKING_TREE", "Working tree must be clean before upstream sync."));
  if (parsedStatus.detached) issues.push(issue("DETACHED_HEAD_UNSUPPORTED", "Upstream sync requires a named branch."));

  const refCheck = await execText(context.resources, context.workspaceRoot, "git", ["rev-parse", "--verify", upstreamRef.ref]);
  if (refCheck.status !== "succeeded") {
    issues.push(issue("UPSTREAM_REF_MISSING", "Configured upstream ref does not exist.", { upstreamRef: upstreamRef.ref }));
  }

  const branchCheck = await execText(context.resources, context.workspaceRoot, "git", ["show-ref", "--verify", `refs/heads/${branchName}`]);
  if (branchCheck.status === "succeeded") {
    issues.push(issue("BRANCH_ALREADY_EXISTS", "Generated sync branch already exists.", { branchName }));
  }

  const worktreeList = await execText(context.resources, context.workspaceRoot, "git", ["worktree", "list", "--porcelain"]);
  if (worktreeList.status === "succeeded") {
    const occupied = parseWorktrees(worktreeList.stdout ?? "").find((entry) => entry.branch === branchName);
    if (occupied) {
      issues.push(issue("BRANCH_CHECKED_OUT_ELSEWHERE", "Generated sync branch is checked out in another worktree.", {
        branchName,
        path: occupied.path,
      }));
    }
  }
  const gtLs = await execText(context.resources, context.workspaceRoot, "gt", ["ls"]);
  if (gtLs.status !== "succeeded") {
    issues.push(issue("GRAPHITE_UNAVAILABLE", "Graphite stack state is not readable.", { stderr: gtLs.stderr }));
  }

  if (scratchPolicy.blocked) {
    issues.push(issue("SCRATCH_POLICY_BLOCKED", "Scratch policy blocked upstream sync.", { missing: scratchPolicy.missing }));
  } else if (scratchPolicy.mode === "warn" && scratchPolicy.missing.length > 0 && apply) {
    issues.push(warning("SCRATCH_POLICY_WARNING", "Scratch policy warning.", { missing: scratchPolicy.missing }));
  }
  if (input.convergeAfter) {
    issues.push(warning("CONVERGE_AFTER_PLANNED_ONLY", "Plugin convergence is emitted as explicit follow-up commands, not executed inside DevOps sync."));
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
      followUpCommands,
      preflight: check,
      execution: execution(),
      scratchPolicy,
    };
  }

  const appliedSteps = [
    await execStep(context.resources, context.workspaceRoot, "git", ["fetch", "--all", "--prune"], 180_000),
    skipped("git", ["switch", "-c", branchName]),
    skipped("git", ["merge", "--no-ff", upstreamRef.ref]),
    skipped("gt", ["sync", "--no-restack"]),
    skipped("gt", ["restack", "--upstack"]),
  ];

  if (appliedSteps[0].status === "succeeded") {
    appliedSteps[1] = await execStep(context.resources, context.workspaceRoot, "git", ["switch", "-c", branchName]);
  }
  if (appliedSteps[1].status === "succeeded") {
    appliedSteps[2] = await execStep(context.resources, context.workspaceRoot, "git", ["merge", "--no-ff", upstreamRef.ref], 300_000);
  }
  if (appliedSteps[2].status === "succeeded") {
    appliedSteps[3] = await execStep(context.resources, context.workspaceRoot, "gt", ["sync", "--no-restack"], 120_000);
    if (appliedSteps[3].status === "succeeded") {
      appliedSteps[4] = await execStep(context.resources, context.workspaceRoot, "gt", ["restack", "--upstack"], 120_000);
    }
  }
  const executionIssues = appliedSteps
    .map((step) => executionIssueFromStep(step, "REPO_SYNC_COMMAND_FAILED", "Repo sync command failed."))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    workspaceRoot: context.workspaceRoot,
    action: "applied" as const,
    branchName,
    upstreamRef,
    currentBranch: parsedStatus.branch,
    steps: appliedSteps,
    followUpCommands,
    preflight: check,
    execution: execution(executionIssues),
    scratchPolicy,
  };
});

export const router = module.router({
  syncUpstream,
});
