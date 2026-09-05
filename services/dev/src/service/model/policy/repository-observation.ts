import type { ChildProcessResource } from "@habitat-ai/resource-child-process";
import type { FilesystemResource } from "@habitat-ai/resource-filesystem";
import { Effect } from "effect";
import type { CommandStep, Issue } from "../dto";
import { failureMessage, runCommand } from "./command-execution";

/** Facts observed for this invocation, not a cached workspace-discovery authority. */
export type RepositoryObservation = {
  repositoryRoot: string | null;
  branch: string | null;
  head: string | null;
  dirty: boolean | null;
  steps: CommandStep[];
  issues: Issue[];
};

/** Constructs one explicit service-owned finding. */
export function issue(code: string, message: string, severity: Issue["severity"] = "error"): Issue {
  return { code, message, severity };
}

/** Removes only the command record terminator, preserving whitespace in native identities. */
export function outputLine(output: string): string {
  return output.endsWith("\n") ? output.slice(0, -1) : output;
}

/** Resolves the caller's locator with Git, then observes native branch, HEAD and cleanliness. */
export function observeRepository(
  filesystem: FilesystemResource,
  spawner: ChildProcessResource,
  repositoryPath: string
): Effect.Effect<RepositoryObservation> {
  return Effect.gen(function* () {
    const result: RepositoryObservation = {
      repositoryRoot: null,
      branch: null,
      head: null,
      dirty: null,
      steps: [],
      issues: [],
    };
    const requested = yield* Effect.result(
      filesystem.fileSystem.realPath(filesystem.path.resolve(repositoryPath))
    );
    if (requested._tag === "Failure") {
      result.issues.push(issue("RepositoryUnavailable", failureMessage(requested.failure)));
      return result;
    }
    const root = yield* runCommand(
      spawner,
      "git",
      ["rev-parse", "--show-toplevel"],
      requested.success
    );
    result.steps.push(root);
    if (root.status !== "succeeded") {
      result.issues.push(issue("RepositoryUnavailable", root.failure ?? root.stderr));
      return result;
    }
    const physical = yield* Effect.result(filesystem.fileSystem.realPath(outputLine(root.stdout)));
    if (physical._tag === "Failure") {
      result.issues.push(issue("RepositoryUnavailable", failureMessage(physical.failure)));
      return result;
    }
    result.repositoryRoot = physical.success;
    const branch = yield* runCommand(
      spawner,
      "git",
      ["symbolic-ref", "--quiet", "--short", "HEAD"],
      physical.success
    );
    result.steps.push(branch);
    if (branch.status === "succeeded") result.branch = outputLine(branch.stdout);
    else if (branch.exitCode !== 1 || branch.failure !== null)
      result.issues.push(issue("BranchUnavailable", branch.failure ?? branch.stderr));
    const head = yield* runCommand(
      spawner,
      "git",
      ["rev-parse", "--verify", "HEAD^{commit}"],
      physical.success
    );
    result.steps.push(head);
    if (head.status === "succeeded") result.head = outputLine(head.stdout);
    else result.issues.push(issue("HeadUnavailable", head.failure ?? head.stderr));
    const status = yield* runCommand(
      spawner,
      "git",
      ["status", "--porcelain=v1", "-z", "--untracked-files=normal"],
      physical.success
    );
    result.steps.push(status);
    if (status.status === "succeeded") result.dirty = status.stdout.length > 0;
    else result.issues.push(issue("StatusUnavailable", status.failure ?? status.stderr));
    return result;
  });
}

/** Admits mutation only from successful named, clean repository observations. */
export function mutationIssues(repository: RepositoryObservation): Issue[] {
  return [
    ...repository.issues,
    ...(repository.branch === null
      ? [issue("NamedBranchRequired", "The checkout must have a named branch.")]
      : []),
    ...(repository.dirty === true
      ? [issue("DirtyWorkingTree", "The current working tree must be clean.")]
      : []),
  ];
}
