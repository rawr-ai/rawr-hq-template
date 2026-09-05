import {
  issue,
  mutationIssues,
  observeRepository,
  observeScratch,
  outputLine,
  plannedStep,
  runCommand,
} from "../../../model/policy";
import type { RepoSyncResult } from "../model/dto";
import { module } from "../module";

/** Updates only the current checkout through native fast-forward pull semantics. */
export const syncUpstream = module.syncUpstream.effect(function* ({ context, input }) {
  const observed = yield* observeRepository(
    context.filesystem,
    context.childProcess,
    input.repositoryPath
  );
  const result: RepoSyncResult = {
    kind: "Refused",
    repositoryRoot: observed.repositoryRoot,
    branch: observed.branch,
    upstream: null,
    before: observed.head,
    after: null,
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

  if (input.upstream !== undefined) {
    const branchCheck = yield* runCommand(
      context.childProcess,
      "git",
      ["check-ref-format", `refs/heads/${input.upstream.branch}`],
      root
    );
    result.steps.push(branchCheck);
    if (branchCheck.status !== "succeeded")
      result.issues.push(issue("InvalidUpstreamBranch", branchCheck.failure ?? branchCheck.stderr));
    else result.upstream = { ...input.upstream, source: "explicit" };
  } else if (observed.branch !== null) {
    const upstream = yield* runCommand(
      context.childProcess,
      "git",
      [
        "for-each-ref",
        "--format=%(upstream:remotename)%00%(upstream:remoteref)",
        `refs/heads/${observed.branch}`,
      ],
      root
    );
    result.steps.push(upstream);
    const fields = outputLine(upstream.stdout).split("\0");
    const remote = fields[0];
    const ref = fields[1];
    if (
      upstream.status !== "succeeded" ||
      fields.length !== 2 ||
      !remote ||
      !ref?.startsWith("refs/heads/") ||
      ref === "refs/heads/"
    ) {
      result.issues.push(
        issue(
          "UpstreamUnavailable",
          "Configure a Git upstream or supply an explicit remote and branch."
        )
      );
    } else
      result.upstream = { remote, branch: ref.slice("refs/heads/".length), source: "configured" };
  }
  if (result.upstream === null) return result;
  const args = [
    "pull",
    "--ff-only",
    "--no-rebase",
    "--no-autostash",
    "--no-recurse-submodules",
    "--no-all",
    "--no-prune",
    "--no-tags",
    "--",
    result.upstream.remote,
    `refs/heads/${result.upstream.branch}`,
  ];
  const actionIndex = result.steps.push(plannedStep("git", args)) - 1;
  if (result.issues.some((finding) => finding.severity === "error")) return result;
  if (!input.apply) {
    result.kind = "Planned";
    return result;
  }
  const pulled = yield* runCommand(context.childProcess, "git", args, root, 300_000);
  result.steps[actionIndex] = pulled;
  const after = yield* runCommand(
    context.childProcess,
    "git",
    ["rev-parse", "--verify", "HEAD^{commit}"],
    root
  );
  result.steps.push(after);
  if (after.status === "succeeded") result.after = outputLine(after.stdout);
  if (pulled.status !== "succeeded")
    result.issues.push(issue("UpdateFailed", pulled.failure ?? pulled.stderr));
  if (after.status !== "succeeded")
    result.issues.push(issue("HeadUnavailable", after.failure ?? after.stderr));
  result.kind = result.issues.some((finding) => finding.severity === "error")
    ? "Failed"
    : "Updated";
  return result;
});
