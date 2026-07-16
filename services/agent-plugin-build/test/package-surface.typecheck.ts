import { createGitContentWorkspaceSnapshotReader } from "../src/index";

// @ts-expect-error Generic command construction is internal to the Git owner and tests.
import { createGitCommandRunner } from "../src/index";
// @ts-expect-error Generic command arguments are not a public package type.
import type { GitCommandLimits } from "../src/index";
// @ts-expect-error Generic command results are not a public package type.
import type { GitCommandResult } from "../src/index";
// @ts-expect-error Generic command runners are not a public package type.
import type { GitCommandRunner } from "../src/index";

void createGitCommandRunner;
declare const limits: GitCommandLimits;
declare const result: GitCommandResult;
declare const runner: GitCommandRunner;
void limits;
void result;
void runner;

void createGitContentWorkspaceSnapshotReader({
  gitExecutable: "/usr/bin/git",
  // @ts-expect-error The public factory selects its own fixed Git command vocabulary.
  args: ["status", "--porcelain"],
});
