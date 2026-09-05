import {
  issue,
  mutationIssues,
  observeRepository,
  observeScratch,
  plannedStep,
  runCommand,
} from "../../../model/policy";
import type { StackDrainResult } from "../model/dto";
import { selectedStack } from "../model/policy";
import { module } from "../module";

/** Requests native current/downstack submission and merge once, without awaiting remote completion. */
export const drain = module.drain.effect(function* ({ context, input }) {
  const observed = yield* observeRepository(
    context.filesystem,
    context.childProcess,
    input.repositoryPath
  );
  const result: StackDrainResult = {
    kind: "Refused",
    repositoryRoot: observed.repositoryRoot,
    branch: observed.branch,
    stack: null,
    issues: mutationIssues(observed),
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
    if (stack.branches.length === 0)
      result.issues.push(
        issue("StackRequired", "A merge request must start on a tracked non-trunk branch.")
      );
    for (const branch of stack.branches.filter((entry) => entry.needsRestack))
      result.issues.push(
        issue("NeedsRestack", `Restack ${branch.branch} explicitly before requesting a merge.`)
      );
  }
  const submitArgs = [
    "submit",
    "--publish",
    "--no-stack",
    "--no-ai",
    "--no-edit",
    "--no-interactive",
  ];
  const mergeArgs = ["merge", "--no-interactive"];
  const first = result.steps.length;
  result.steps.push(plannedStep("gt", submitArgs), plannedStep("gt", mergeArgs));
  if (result.issues.some((finding) => finding.severity === "error")) return result;
  if (!input.apply) {
    result.kind = "Planned";
    return result;
  }
  const submitted = yield* runCommand(context.childProcess, "gt", submitArgs, root, 300_000);
  result.steps[first] = submitted;
  if (submitted.status !== "succeeded") {
    result.steps[first + 1] = { ...plannedStep("gt", mergeArgs), status: "skipped" };
    result.issues.push(issue("SubmitFailed", submitted.failure ?? submitted.stderr));
    result.kind = "Failed";
    return result;
  }
  const requested = yield* runCommand(context.childProcess, "gt", mergeArgs, root, 300_000);
  result.steps[first + 1] = requested;
  if (requested.status !== "succeeded")
    result.issues.push(issue("MergeRequestFailed", requested.failure ?? requested.stderr));
  result.kind = requested.status === "succeeded" ? "Requested" : "Failed";
  return result;
});
