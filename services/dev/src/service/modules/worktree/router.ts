import { execStep } from "#dev-service/model/helpers/command-execution";
import { parseWorktrees } from "#dev-service/model/helpers/git-output";
import {
  execution,
  executionIssueFromStep,
  issue,
  planned,
  preflight,
  warning,
} from "#dev-service/model/policy/operation-outcomes";
import { checkScratchPolicy } from "#dev-service/model/policy/scratch-policy";
import { module } from "./module";

const cleanup = module.cleanup.handler(async ({ context, input }) => {
  const apply = Boolean(input.apply);
  const mergedOnly = input.mergedOnly ?? true;
  const trunk = input.trunk ?? "main";
  const pinnedPaths = new Set(input.pinnedPaths ?? []);
  const pinnedBranches = new Set(input.pinnedBranches ?? []);
  const scratchPolicy = await checkScratchPolicy({
    workspaceRoot: context.workspaceRoot,
    fs: context.resources.fs,
    path: context.resources.path,
    request: { ...input.scratchPolicy, enforce: apply },
  });
  const issues = [];
  const candidates = [];
  const skipped = [];

  const currentRun = await execStep(context.resources.process, context.workspaceRoot, "pwd", [
    "-P",
  ]);
  const currentPath = (currentRun.stdout ?? "").trim() || context.workspaceRoot;
  const listRun = await execStep(context.resources.process, context.workspaceRoot, "git", [
    "worktree",
    "list",
    "--porcelain",
  ]);
  if (listRun.status !== "succeeded") {
    issues.push(
      issue("WORKTREE_LIST_FAILED", "Git worktree list was not readable.", {
        stderr: listRun.stderr,
      })
    );
  }

  for (const entry of parseWorktrees(listRun.stdout ?? "")) {
    const baseName = context.resources.path.basename(entry.path);
    if (!baseName.startsWith(input.prefix)) continue;
    if (
      context.resources.path.resolve(entry.path) === context.resources.path.resolve(currentPath)
    ) {
      issues.push(
        issue("UNSAFE_CURRENT_WORKTREE_MATCH", "Cleanup candidate matches the current worktree.", {
          path: entry.path,
        })
      );
      skipped.push({ path: entry.path, reason: "current-worktree" });
      continue;
    }
    if (pinnedPaths.has(entry.path) || (entry.branch && pinnedBranches.has(entry.branch))) {
      skipped.push({ path: entry.path, reason: "pinned" });
      continue;
    }
    if (!entry.branch) {
      skipped.push({ path: entry.path, reason: "detached" });
      continue;
    }
    if (entry.branch === trunk) {
      skipped.push({ path: entry.path, reason: "trunk" });
      continue;
    }
    if (mergedOnly) {
      const mergedRun = await execStep(context.resources.process, context.workspaceRoot, "git", [
        "branch",
        "--merged",
        trunk,
        "--list",
        entry.branch,
      ]);
      if (mergedRun.status !== "succeeded" || !(mergedRun.stdout ?? "").trim()) {
        skipped.push({ path: entry.path, reason: "not-merged" });
        continue;
      }
    }
    candidates.push({ path: entry.path, branch: entry.branch, reason: "basename-prefix-match" });
  }

  if (scratchPolicy.blocked) {
    issues.push(
      issue("SCRATCH_POLICY_BLOCKED", "Scratch policy blocked worktree cleanup.", {
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
  const plannedRemovals = candidates.map((candidate) =>
    planned("git", ["worktree", "remove", candidate.path])
  );
  const followUpCommands: ReturnType<typeof planned>[] = [];
  const check = preflight(issues);
  if (!apply || !check.ok) {
    return {
      workspaceRoot: context.workspaceRoot,
      action: "planned" as const,
      prefix: input.prefix,
      candidates,
      skipped,
      removed: [],
      followUpCommands,
      preflight: check,
      execution: execution(),
      scratchPolicy,
    };
  }

  const removed = [];
  for (const candidate of candidates) {
    removed.push(
      await execStep(
        context.resources.process,
        context.workspaceRoot,
        "git",
        ["worktree", "remove", candidate.path],
        120_000
      )
    );
  }
  const executionIssues = removed
    .map((step) =>
      executionIssueFromStep(step, "WORKTREE_REMOVE_FAILED", "Worktree removal failed.")
    )
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    workspaceRoot: context.workspaceRoot,
    action: "applied" as const,
    prefix: input.prefix,
    candidates,
    skipped,
    removed,
    followUpCommands,
    preflight: check,
    execution: execution(executionIssues),
    scratchPolicy,
  };
});

export const router = module.router({
  cleanup,
});
