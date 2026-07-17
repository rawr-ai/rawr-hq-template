import { lstat, realpath } from "node:fs/promises";

import type { GitBlobSelection } from "@rawr/agent-plugin-lifecycle/ports/governance";

import { createGitCommandRunner, type GitCommandRunner } from "../../releases/git/process";
import type { ReadOnlyGitBackend } from "./git";

const decoder = new TextDecoder("utf-8", { fatal: true });

export async function createNodeReadOnlyGitBackend(options: Readonly<{
  gitExecutable: string;
}>): Promise<ReadOnlyGitBackend> {
  const git = await createGitCommandRunner({ gitExecutable: options.gitExecutable });
  const backend: ReadOnlyGitBackend = {
    inspect: async (workspacePath, canonicalRef, expectedRepositoryIdentity) =>
      await inspect(git, workspacePath, canonicalRef, expectedRepositoryIdentity),
    readBlob: async (workspacePath, selection) => await readBlob(git, workspacePath, selection),
    isAncestor: async (workspacePath, ancestor, descendant) =>
      await isAncestor(git, workspacePath, ancestor, descendant),
    listChangedPaths: async (workspacePath, from, to) =>
      await listChangedPaths(git, workspacePath, from, to),
  };
  return Object.freeze(backend);
}

async function inspect(
  git: GitCommandRunner,
  workspacePath: string,
  canonicalRef: string,
  expectedRepositoryIdentity: string,
): Promise<unknown> {
  const root = await requireExactWorkspace(git, workspacePath);
  const repositoryIdentity = await exactRepositoryIdentity(git, root, expectedRepositoryIdentity);
  if (repositoryIdentity !== expectedRepositoryIdentity) {
    return Object.freeze({ kind: "WrongRepository", actualRepositoryIdentity: repositoryIdentity });
  }
  const symbolicRef = await gitText(git, root, ["symbolic-ref", "--quiet", "HEAD"]);
  if (symbolicRef !== canonicalRef) {
    return Object.freeze({
      kind: "UnreachableRepository",
      reason: "Workspace HEAD does not select the requested canonical ref",
    });
  }
  const status = await gitBytes(git, root, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ], 64 * 1024 * 1024);
  if (status.byteLength !== 0) return Object.freeze({ kind: "DirtyRepository" });
  const headCommit = await gitText(git, root, ["rev-parse", "--verify", `${canonicalRef}^{commit}`]);
  const headTree = await gitText(git, root, ["rev-parse", "--verify", `${headCommit}^{tree}`]);
  return Object.freeze({
    kind: "Ready",
    repositoryIdentity,
    canonicalRef,
    headCommit,
    headTree,
  });
}

async function readBlob(
  git: GitCommandRunner,
  workspacePath: string,
  selection: GitBlobSelection,
): Promise<unknown> {
  const root = await requireExactWorkspace(git, workspacePath);
  const repositoryIdentity = await exactRepositoryIdentity(git, root, selection.repositoryIdentity);
  if (repositoryIdentity !== selection.repositoryIdentity) {
    throw new Error("Git object selection belongs to another repository identity");
  }
  const selectedRef = await gitText(git, root, ["rev-parse", "--verify", `${selection.ref}^{commit}`]);
  if (!await isAncestor(git, root, selection.commit, selectedRef)) {
    throw new Error("Git object commit is not reachable from its selected ref");
  }
  const commit = await gitText(git, root, ["rev-parse", "--verify", `${selection.commit}^{commit}`]);
  if (commit !== selection.commit) throw new Error("Git object commit is not exact");
  const tree = await gitText(git, root, ["rev-parse", "--verify", `${commit}^{tree}`]);
  if (tree !== selection.tree) throw new Error("Git object tree does not bind its commit");
  const blob = await gitText(git, root, ["rev-parse", "--verify", `${commit}:${selection.path}`]);
  const bytes = await gitBytes(git, root, ["cat-file", "blob", blob], 128 * 1024 * 1024);
  return Object.freeze({
    pointer: Object.freeze({ ...selection, blob }),
    bytes,
  });
}

async function listChangedPaths(
  git: GitCommandRunner,
  workspacePath: string,
  from: string,
  to: string,
): Promise<readonly string[]> {
  const root = await requireExactWorkspace(git, workspacePath);
  await requireCommit(git, root, from);
  await requireCommit(git, root, to);
  const bytes = await gitBytes(git, root, [
    "diff",
    "--name-only",
    "--no-renames",
    "-z",
    from,
    to,
    "--",
  ], 64 * 1024 * 1024);
  return Object.freeze(decoder.decode(bytes).split("\0").filter((entry) => entry.length > 0));
}

async function isAncestor(
  git: GitCommandRunner,
  workspacePath: string,
  ancestor: string,
  descendant: string,
): Promise<boolean> {
  const root = await requireExactWorkspace(git, workspacePath);
  await requireCommit(git, root, ancestor);
  await requireCommit(git, root, descendant);
  const result = await git.run(root, ["merge-base", "--is-ancestor", ancestor, descendant]);
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new Error(decoder.decode(result.stderr).trim() || "Git ancestry query failed");
}

async function requireExactWorkspace(git: GitCommandRunner, workspacePath: string): Promise<string> {
  const status = await lstat(workspacePath);
  const canonical = await realpath(workspacePath);
  if (!status.isDirectory() || status.isSymbolicLink() || canonical !== workspacePath) {
    throw new Error("Governance Git workspace must be a canonical non-symlink directory");
  }
  const root = await gitText(git, workspacePath, ["rev-parse", "--show-toplevel"]);
  if (root !== workspacePath) throw new Error("Governance Git locator aliases another workspace root");
  return root;
}

async function exactRepositoryIdentity(
  git: GitCommandRunner,
  root: string,
  expected: string,
): Promise<string> {
  const remotes = (await gitText(git, root, ["remote"])).split("\n").filter(Boolean);
  const urls: string[] = [];
  for (const remote of remotes) {
    urls.push(...(await gitText(git, root, ["remote", "get-url", "--all", remote]))
      .split("\n")
      .filter(Boolean));
  }
  if (urls.includes(expected)) return expected;
  const unique = [...new Set(urls)].sort(compareText);
  return unique.length === 1 ? unique[0]! : "unresolved:multiple-or-missing-remotes";
}

async function requireCommit(git: GitCommandRunner, root: string, candidate: string): Promise<void> {
  const observed = await gitText(git, root, ["rev-parse", "--verify", `${candidate}^{commit}`]);
  if (observed !== candidate) throw new Error("Git commit selection is not exact");
}

async function gitText(git: GitCommandRunner, root: string, args: readonly string[]): Promise<string> {
  return decoder.decode(await gitBytes(git, root, args)).trim();
}

async function gitBytes(
  git: GitCommandRunner,
  root: string,
  args: readonly string[],
  stdoutBytes = 1024 * 1024,
): Promise<Uint8Array> {
  const result = await git.run(root, args, { stdoutBytes });
  if (result.exitCode !== 0) {
    throw new Error(decoder.decode(result.stderr).trim() || `Git ${args[0]} failed`);
  }
  return result.stdout;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
