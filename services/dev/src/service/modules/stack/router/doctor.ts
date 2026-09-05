import { issue, observeRepository, parseWorktrees, runCommand } from "../../../model/policy";
import type { StackDoctorResult } from "../model/dto";
import { selectedStack } from "../model/policy";
import { module } from "../module";

/** Reports actual Git and Graphite observations without mutating or relabeling the checkout. */
export const doctor = module.doctor.effect(function* ({ context, input }) {
  const observed = yield* observeRepository(
    context.filesystem,
    context.childProcess,
    input.repositoryPath
  );
  const result: StackDoctorResult = {
    kind: "NeedsAttention",
    repositoryRoot: observed.repositoryRoot,
    branch: observed.branch,
    dirty: observed.dirty,
    worktrees: [],
    stack: null,
    issues: observed.issues,
    steps: observed.steps,
    scratch: null,
  };
  const root = observed.repositoryRoot;
  if (root === null) return result;
  if (observed.branch === null)
    result.issues.push(issue("DetachedHead", "The current checkout has no named branch."));
  if (observed.dirty)
    result.issues.push(issue("DirtyWorkingTree", "The current working tree has local changes."));
  const list = yield* runCommand(
    context.childProcess,
    "git",
    ["worktree", "list", "--porcelain", "-z"],
    root
  );
  result.steps.push(list);
  const worktrees = list.status === "succeeded" ? parseWorktrees(list.stdout) : undefined;
  if (worktrees === undefined)
    result.issues.push(
      issue(
        "WorktreeObservationFailed",
        list.failure ?? (list.stderr || "Git returned invalid NUL-delimited worktree records.")
      )
    );
  else result.worktrees = worktrees;
  const state = yield* runCommand(context.childProcess, "gt", ["state", "--no-interactive"], root);
  result.steps.push(state);
  const stack =
    state.status === "succeeded" && observed.branch !== null
      ? selectedStack(state.stdout, observed.branch)
      : undefined;
  if (stack === undefined)
    result.issues.push(
      issue(
        "GraphiteObservationFailed",
        state.failure ??
          (state.stderr || "The current branch has no unambiguous native Graphite ancestry.")
      )
    );
  else {
    result.stack = stack;
    for (const branch of stack.branches.filter((entry) => entry.needsRestack))
      result.issues.push(
        issue("NeedsRestack", `Native Graphite reports that ${branch.branch} needs restacking.`)
      );
  }
  result.kind = result.issues.length === 0 ? "Healthy" : "NeedsAttention";
  return result;
});
