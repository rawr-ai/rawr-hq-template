import { execStep } from "#dev-service/model/helpers/command-execution";
import { parseGitStatus } from "#dev-service/model/helpers/git-output";
import {
  execution,
  executionIssueFromStep,
  issue,
  planned,
  preflight,
  warning,
} from "#dev-service/model/policy/operation-outcomes";
import { stackLooksConverged } from "../model/policy/stack-convergence";
import { module } from "../module";

/** Plans or applies an ordered Graphite stack drain until convergence or failure. */
export const drain = module.drain.handler(async ({ context, input }) => {
  const apply = Boolean(input.apply);
  const scratchPolicy = await context.checkScratchPolicy({
    ...input.scratchPolicy,
    enforce: apply,
  });
  const plannedCommands = [
    planned("gt", ["ss", "--publish", "--stack", "--ai", "--no-interactive"]),
    planned("gt", ["merge", "--no-interactive"]),
    planned("gt", ["sync", "--no-restack", "--no-interactive"]),
    planned("gt", ["ls"]),
  ];

  const issues = [];
  const gitStatus = await execStep(context.process, context.workspaceRoot, "git", [
    "status",
    "--short",
    "--branch",
  ]);
  const gitStatusReadable = gitStatus.status === "succeeded";
  const parsedStatus = gitStatusReadable
    ? parseGitStatus(gitStatus.stdout ?? "")
    : { branch: null, detached: false, dirty: false };
  if (!gitStatusReadable)
    issues.push(
      issue("GIT_STATUS_FAILED", "Git status is not readable.", {
        stderr: gitStatus.stderr,
      })
    );
  if (parsedStatus.dirty)
    issues.push(issue("DIRTY_WORKING_TREE", "Working tree must be clean before stack drain."));
  if (parsedStatus.detached)
    issues.push(issue("DETACHED_HEAD_UNSUPPORTED", "Stack drain requires a named branch."));
  const gtLs = await execStep(context.process, context.workspaceRoot, "gt", ["ls"]);
  if (gtLs.status !== "succeeded")
    issues.push(
      issue("GRAPHITE_UNAVAILABLE", "Graphite stack state is not readable.", {
        stderr: gtLs.stderr,
      })
    );
  if (scratchPolicy.blocked) {
    issues.push(
      issue("SCRATCH_POLICY_BLOCKED", "Scratch policy blocked stack drain.", {
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
    const publish = await execStep(
      context.process,
      context.workspaceRoot,
      "gt",
      ["ss", "--publish", "--stack", "--ai", "--no-interactive"],
      300_000
    );
    const publishIssue = executionIssueFromStep(
      publish,
      "STACK_DRAIN_COMMAND_FAILED",
      "Graphite publish failed."
    );
    if (publishIssue) {
      executionIssues.push(publishIssue);
      cycles.push({
        cycle,
        publish,
        merge: planned("gt", ["merge", "--no-interactive"]),
        sync: planned("gt", ["sync", "--no-restack", "--no-interactive"]),
        gtLs: "",
      });
      break;
    }
    const merge = await execStep(
      context.process,
      context.workspaceRoot,
      "gt",
      ["merge", "--no-interactive"],
      300_000
    );
    const mergeIssue = executionIssueFromStep(
      merge,
      "STACK_DRAIN_COMMAND_FAILED",
      "Graphite merge failed."
    );
    if (mergeIssue) {
      executionIssues.push(mergeIssue);
      cycles.push({
        cycle,
        publish,
        merge,
        sync: planned("gt", ["sync", "--no-restack", "--no-interactive"]),
        gtLs: "",
      });
      break;
    }
    const sync = await execStep(
      context.process,
      context.workspaceRoot,
      "gt",
      ["sync", "--no-restack", "--no-interactive"],
      300_000
    );
    const syncIssue = executionIssueFromStep(
      sync,
      "STACK_DRAIN_COMMAND_FAILED",
      "Graphite sync failed."
    );
    if (syncIssue) {
      executionIssues.push(syncIssue);
    }
    const gtLsRun = await execStep(context.process, context.workspaceRoot, "gt", ["ls"]);
    const gtLsIssue = executionIssueFromStep(
      gtLsRun,
      "STACK_DRAIN_COMMAND_FAILED",
      "Graphite stack observation failed."
    );
    if (gtLsIssue) executionIssues.push(gtLsIssue);
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
    if (sleepSeconds > 0) await context.process.sleep(sleepSeconds * 1000);
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
