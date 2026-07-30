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
  const gitStatusReadable = gitStatus.status === "succeeded";
  const parsedStatus = gitStatusReadable
    ? parseGitStatus(gitStatus.stdout ?? "")
    : { branch: null, detached: false, dirty: false };
  const branch = input.branch ?? parsedStatus.branch ?? "";
  const graphiteAvailable = gtLs.status === "succeeded";
  const worktreeListReadable = worktreeList.status === "succeeded";
  const needsAttention =
    !gitStatusReadable ||
    parsedStatus.dirty ||
    parsedStatus.detached ||
    !graphiteAvailable ||
    !worktreeListReadable;
  const actions = [];
  if (!gitStatusReadable)
    actions.push({
      command: "git status --short --branch",
      reason: "Git status is not readable",
    });
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
        gitStatus:
          gitStatus.status === "succeeded"
            ? (gitStatus.stdout ?? "")
            : gitStatus.stderr || gitStatus.stdout || "",
        gtLs: gtLs.status === "succeeded" ? (gtLs.stdout ?? "") : gtLs.stderr || gtLs.stdout || "",
        worktreeList:
          worktreeList.status === "succeeded"
            ? (worktreeList.stdout ?? "")
            : worktreeList.stderr || worktreeList.stdout || "",
      },
    },
  };
});
