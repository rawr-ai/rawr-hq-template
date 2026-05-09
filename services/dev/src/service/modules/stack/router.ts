import {
  execStep,
  execText,
  execution,
  executionIssueFromStep,
  issue,
  parseGitStatus,
  planned,
  preflight,
  stackLooksConverged,
  warning,
} from "../../common/helpers";
import { checkScratchPolicy } from "../scratch-policy/helpers";
import { module } from "./module";

const doctor = module.doctor.handler(async ({ context, input }) => {
  const gitStatus = await execText(context.resources, context.workspaceRoot, "git", ["status", "--short", "--branch"]);
  const gtLs = await execText(context.resources, context.workspaceRoot, "gt", ["ls"]);
  const worktreeList = await execText(context.resources, context.workspaceRoot, "git", ["worktree", "list", "--porcelain"]);
  const parsedStatus = parseGitStatus(gitStatus.stdout ?? "");
  const branch = input.branch ?? parsedStatus.branch ?? "";
  const graphiteAvailable = gtLs.status === "succeeded";
  const worktreeListReadable = worktreeList.status === "succeeded";
  const needsAttention = parsedStatus.dirty || parsedStatus.detached || !graphiteAvailable || !worktreeListReadable;
  const actions = [];
  if (parsedStatus.dirty) actions.push({ command: "git status --short", reason: "working tree has uncommitted changes" });
  if (parsedStatus.detached) actions.push({ command: "git switch <branch>", reason: "current checkout is detached" });
  if (!graphiteAvailable) actions.push({ command: "gt ls", reason: "Graphite stack state is not readable" });
  if (!worktreeListReadable) actions.push({ command: "git worktree list --porcelain", reason: "worktree state is not readable" });

  return {
    workspaceRoot: context.workspaceRoot,
    repo: input.repo ?? null,
    report: {
      status: needsAttention ? "NEEDS_ATTENTION" as const : "HEALTHY" as const,
      branch,
      checks: {
        dirtyWorkingTree: parsedStatus.dirty,
        detachedHead: parsedStatus.detached,
        graphiteAvailable,
        worktreeListReadable,
        needsRestack: false,
        graphShowsStack: graphiteAvailable && (gtLs.stdout ?? "").includes("◉"),
      },
      actions,
      raw: {
        branch,
        gitStatus: gitStatus.stdout ?? gitStatus.stderr ?? "",
        gtLs: gtLs.stdout ?? gtLs.stderr ?? "",
        worktreeList: worktreeList.stdout ?? worktreeList.stderr ?? "",
      },
    },
  };
});

const drain = module.drain.handler(async ({ context, input }) => {
  const apply = Boolean(input.apply);
  const scratchPolicy = await checkScratchPolicy({
    workspaceRoot: context.workspaceRoot,
    resources: context.resources,
    request: { ...input.scratchPolicy, enforce: apply },
  });
  const plannedCommands = [
    planned("gt", ["ss", "--publish", "--stack", "--ai", "--no-interactive"]),
    planned("gt", ["merge", "--no-interactive"]),
    planned("gt", ["sync", "--no-restack", "--no-interactive"]),
    planned("gt", ["ls"]),
  ];

  const issues = [];
  const gitStatus = await execText(context.resources, context.workspaceRoot, "git", ["status", "--short", "--branch"]);
  const parsedStatus = parseGitStatus(gitStatus.stdout ?? "");
  if (parsedStatus.dirty) issues.push(issue("DIRTY_WORKING_TREE", "Working tree must be clean before stack drain."));
  if (parsedStatus.detached) issues.push(issue("DETACHED_HEAD_UNSUPPORTED", "Stack drain requires a named branch."));
  const gtLs = await execText(context.resources, context.workspaceRoot, "gt", ["ls"]);
  if (gtLs.status !== "succeeded") issues.push(issue("GRAPHITE_UNAVAILABLE", "Graphite stack state is not readable.", { stderr: gtLs.stderr }));
  if (scratchPolicy.blocked) {
    issues.push(issue("SCRATCH_POLICY_BLOCKED", "Scratch policy blocked stack drain.", { missing: scratchPolicy.missing }));
  } else if (scratchPolicy.mode === "warn" && scratchPolicy.missing.length > 0 && apply) {
    issues.push(warning("SCRATCH_POLICY_WARNING", "Scratch policy warning.", { missing: scratchPolicy.missing }));
  }

  const check = preflight(issues);
  if (!apply || !check.ok) {
    return {
      workspaceRoot: context.workspaceRoot,
      action: "planned" as const,
      converged: false,
      cycles: [],
      plannedCommands,
      preflight: check,
      execution: execution(),
      scratchPolicy,
    };
  }

  const cycles = [];
  const executionIssues = [];
  const maxCycles = input.maxCycles ?? 20;
  const sleepSeconds = input.sleepSeconds ?? 8;
  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    const publish = await execStep(context.resources, context.workspaceRoot, "gt", ["ss", "--publish", "--stack", "--ai", "--no-interactive"], 300_000);
    const publishIssue = executionIssueFromStep(publish, "STACK_DRAIN_COMMAND_FAILED", "Graphite publish failed.");
    if (publishIssue) {
      executionIssues.push(publishIssue);
      cycles.push({ cycle, publish, merge: planned("gt", ["merge", "--no-interactive"]), sync: planned("gt", ["sync", "--no-restack", "--no-interactive"]), gtLs: "" });
      break;
    }
    const merge = await execStep(context.resources, context.workspaceRoot, "gt", ["merge", "--no-interactive"], 300_000);
    const mergeIssue = executionIssueFromStep(merge, "STACK_DRAIN_COMMAND_FAILED", "Graphite merge failed.");
    if (mergeIssue) {
      executionIssues.push(mergeIssue);
      cycles.push({ cycle, publish, merge, sync: planned("gt", ["sync", "--no-restack", "--no-interactive"]), gtLs: "" });
      break;
    }
    const sync = await execStep(context.resources, context.workspaceRoot, "gt", ["sync", "--no-restack", "--no-interactive"], 300_000);
    const syncIssue = executionIssueFromStep(sync, "STACK_DRAIN_COMMAND_FAILED", "Graphite sync failed.");
    if (syncIssue) {
      executionIssues.push(syncIssue);
    }
    const gtLsRun = await execStep(context.resources, context.workspaceRoot, "gt", ["ls"]);
    const gtLsOutput = gtLsRun.stdout ?? "";
    cycles.push({ cycle, publish, merge, sync, gtLs: gtLsOutput });
    if (executionIssues.length === 0 && stackLooksConverged(gtLsOutput)) {
      return {
        workspaceRoot: context.workspaceRoot,
        action: "applied" as const,
        converged: true,
        cycles,
        plannedCommands,
        preflight: check,
        execution: execution(),
        scratchPolicy,
      };
    }
    if (executionIssues.length > 0) break;
    if (sleepSeconds > 0) await context.resources.process.sleep(sleepSeconds * 1000);
  }

  return {
    workspaceRoot: context.workspaceRoot,
    action: "applied" as const,
    converged: false,
    cycles,
    plannedCommands,
    preflight: check,
    execution: execution(executionIssues),
    scratchPolicy,
  };
});

export const router = module.router({
  doctor,
  drain,
});
