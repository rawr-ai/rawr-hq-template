import { execStep } from "#dev-service/model/helpers/command-execution";
import { parseGitStatus } from "#dev-service/model/helpers/git-output";
import { module } from "../module";

/** Diagnoses Git, Graphite, and worktree observations for one workspace. */
export const doctor = module.doctor.handler(async ({ context, input }) => {
  const gitStatus = await execStep(context.process, context.workspaceRoot, "git", [
    "status",
    "--short",
    "--branch",
  ]);
  const gtLs = await execStep(context.process, context.workspaceRoot, "gt", ["ls"]);
  const worktreeList = await execStep(context.process, context.workspaceRoot, "git", [
    "worktree",
    "list",
    "--porcelain",
  ]);
  const parsedStatus = parseGitStatus(gitStatus.stdout ?? "");
  const branch = input.branch ?? parsedStatus.branch ?? "";
  const graphiteAvailable = gtLs.status === "succeeded";
  const worktreeListReadable = worktreeList.status === "succeeded";
  const needsAttention =
    parsedStatus.dirty || parsedStatus.detached || !graphiteAvailable || !worktreeListReadable;
  const actions = [];
  if (parsedStatus.dirty)
    actions.push({ command: "git status --short", reason: "working tree has uncommitted changes" });
  if (parsedStatus.detached)
    actions.push({ command: "git switch <branch>", reason: "current checkout is detached" });
  if (!graphiteAvailable)
    actions.push({ command: "gt ls", reason: "Graphite stack state is not readable" });
  if (!worktreeListReadable)
    actions.push({
      command: "git worktree list --porcelain",
      reason: "worktree state is not readable",
    });

  return {
    workspaceRoot: context.workspaceRoot,
    repo: input.repo ?? null,
    report: {
      status: needsAttention ? ("NEEDS_ATTENTION" as const) : ("HEALTHY" as const),
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
