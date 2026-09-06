import { Effect } from "effect";
import {
  failureMessage,
  issue,
  observeRepository,
  observeScratch,
  parseWorktrees,
  plannedStep,
  runCommand,
} from "../../../model/policy";
import type { WorktreeCleanupResult } from "../model/dto";
import { module } from "../module";

/** Removes only admitted native worktrees, stopping after the first failed removal. */
export const cleanup = module.cleanup.effect(function* ({ context, input }) {
  const observed = yield* observeRepository(
    context.filesystem,
    context.childProcess,
    input.repositoryPath
  );
  const result: WorktreeCleanupResult = {
    kind: "Refused",
    repositoryRoot: observed.repositoryRoot,
    candidates: [],
    skipped: [],
    removed: [],
    issues: observed.issues,
    steps: observed.steps,
    scratch: null,
  };
  const root = observed.repositoryRoot;
  if (root === null) return result;
  const scratch = yield* observeScratch(context.filesystem, root, input.scratch);
  result.scratch = scratch.report;
  result.issues.push(...scratch.issues);
  if (scratch.failed) {
    result.kind = "Failed";
    return result;
  }
  const trunk = yield* runCommand(
    context.childProcess,
    "git",
    ["show-ref", "--verify", "--quiet", `refs/heads/${input.trunk}`],
    root
  );
  result.steps.push(trunk);
  if (trunk.status !== "succeeded")
    result.issues.push(issue("TrunkUnavailable", "The explicit local trunk branch must exist."));
  const list = yield* runCommand(
    context.childProcess,
    "git",
    ["worktree", "list", "--porcelain", "-z"],
    root
  );
  result.steps.push(list);
  const worktrees = list.status === "succeeded" ? parseWorktrees(list.stdout) : undefined;
  if (worktrees === undefined) {
    result.issues.push(
      issue(
        "WorktreeObservationFailed",
        list.failure ?? (list.stderr || "Git returned invalid NUL-delimited worktree records.")
      )
    );
    return result;
  }
  const pinnedPaths = new Set<string>();
  for (const requested of input.pinnedPaths ?? []) {
    const pinned = yield* Effect.result(
      context.filesystem.fileSystem.realPath(context.filesystem.path.resolve(root, requested))
    );
    if (pinned._tag === "Failure")
      result.issues.push(issue("PinnedPathUnavailable", failureMessage(pinned.failure)));
    else pinnedPaths.add(pinned.success);
  }
  const pinnedBranches = new Set(input.pinnedBranches ?? []);
  for (const entry of worktrees) {
    if (!context.filesystem.path.basename(entry.path).startsWith(input.prefix)) continue;
    const physical = yield* Effect.result(context.filesystem.fileSystem.realPath(entry.path));
    if (physical._tag === "Failure") {
      result.issues.push(
        issue("WorktreeIdentityUnavailable", `${entry.path}: ${failureMessage(physical.failure)}`)
      );
      continue;
    }
    const skip = (reason: string) => {
      result.skipped.push({ path: entry.path, reason });
    };
    if (physical.success === root) {
      skip("current-worktree");
      result.issues.push(
        issue("CurrentWorktreeProtected", "The requested prefix matches the current worktree.")
      );
    } else if (
      pinnedPaths.has(physical.success) ||
      (entry.branch !== null && pinnedBranches.has(entry.branch))
    )
      skip("pinned");
    else if (entry.locked) skip("locked");
    else if (entry.detached || entry.branch === null) skip("detached");
    else if (entry.branch === input.trunk) skip("trunk");
    else {
      if (input.mergedOnly !== false) {
        const merged = yield* runCommand(
          context.childProcess,
          "git",
          [
            "merge-base",
            "--is-ancestor",
            `refs/heads/${entry.branch}`,
            `refs/heads/${input.trunk}`,
          ],
          root
        );
        result.steps.push(merged);
        if (merged.status !== "succeeded") {
          if (merged.exitCode === 1 && merged.failure === null) skip("not-merged");
          else result.issues.push(issue("MergeObservationFailed", merged.failure ?? merged.stderr));
          continue;
        }
      }
      result.candidates.push({ path: entry.path, branch: entry.branch });
    }
  }
  const first = result.steps.length;
  for (const candidate of result.candidates)
    result.steps.push(plannedStep("git", ["worktree", "remove", "--", candidate.path]));
  if (result.issues.some((finding) => finding.severity === "error")) return result;
  if (!input.apply) {
    result.kind = "Planned";
    return result;
  }
  for (const [index, candidate] of result.candidates.entries()) {
    const removed = yield* runCommand(
      context.childProcess,
      "git",
      ["worktree", "remove", "--", candidate.path],
      root,
      120_000
    );
    result.steps[first + index] = removed;
    if (removed.status !== "succeeded") {
      result.issues.push(issue("WorktreeRemoveFailed", removed.failure ?? removed.stderr));
      for (let skipped = index + 1; skipped < result.candidates.length; skipped += 1) {
        const step = result.steps[first + skipped];
        if (step !== undefined) result.steps[first + skipped] = { ...step, status: "skipped" };
      }
      result.kind = "Failed";
      return result;
    }
    result.removed.push(candidate.path);
  }
  result.kind = "Applied";
  return result;
});
