import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type {
  VendorPayloadEntry,
  VendorPayloadPreparationQuery,
  VendorPayloadPreparationResult,
  VendorSourceIdentity,
  VendorUpstreamObserver,
  VendorUpstreamQuery,
  VendorUpstreamReadResult,
} from "@rawr/agent-plugin-lifecycle/ports/vendors";

import { createGitCommandRunner, type GitCommandRunner } from "../releases/git/process";
import { vendorPayloadDigest } from "./canonical";

const TEMP_PREFIX = "rawr-vendor-git-";
const decoder = new TextDecoder("utf-8", { fatal: true });

export async function createGitVendorUpstreamObserver(options: Readonly<{
  gitExecutable: string;
  now?: () => Date;
}>): Promise<VendorUpstreamObserver> {
  const runner = await createGitCommandRunner({ gitExecutable: options.gitExecutable });
  const now = options.now ?? (() => new Date());
  return Object.freeze({
    observe: async (query: VendorUpstreamQuery) => await observe(runner, now, query),
    prepare: async (query: VendorPayloadPreparationQuery) => await prepare(runner, now, query),
  });
}

async function observe(
  runner: GitCommandRunner,
  now: () => Date,
  query: VendorUpstreamQuery,
): Promise<VendorUpstreamReadResult> {
  const operation = await withPrivateRepository(runner, query, true, async (root) => {
    const observed = await observeFetched(runner, root, query, now);
    return observed;
  });
  if (operation.cleanupFailure !== undefined) {
    return Object.freeze({ kind: "CleanupFailed", detail: operation.cleanupFailure });
  }
  return operation.result;
}

async function prepare(
  runner: GitCommandRunner,
  now: () => Date,
  query: VendorPayloadPreparationQuery,
): Promise<VendorPayloadPreparationResult> {
  const operation = await withPrivateRepository(runner, query, false, async (root) => {
    const observed = await observeFetched(runner, root, query, now);
    if (observed.kind !== "Observed") {
      return observed.kind === "Invalid"
        ? Object.freeze({ kind: "Invalid" as const, detail: observed.detail })
        : Object.freeze({ kind: "Unavailable" as const, detail: observed.detail });
    }
    if (!sameIdentity(observed.identity, query.expected) || !sameEntries(observed.entries, query.expectedEntries)) {
      return Object.freeze({ kind: "Stale" as const, detail: "Upstream identity changed after classification" });
    }
    const entries = [];
    for (const entry of observed.entries) {
      const bytes = await gitBytes(runner, root, ["cat-file", "blob", entry.blob], 64 * 1024 * 1024);
      entries.push(Object.freeze({ ...entry, bytes }));
    }
    return Object.freeze({
      kind: "Prepared" as const,
      payload: Object.freeze({ identity: observed.identity, entries: Object.freeze(entries) }),
      observedAt: observed.observedAt,
    });
  });
  if (operation.cleanupFailure !== undefined) {
    return Object.freeze({ kind: "CleanupFailed", detail: operation.cleanupFailure });
  }
  return operation.result;
}

async function observeFetched(
  runner: GitCommandRunner,
  root: string,
  query: VendorUpstreamQuery,
  now: () => Date,
): Promise<VendorUpstreamReadResult> {
  try {
    const commit = await gitText(runner, root, ["rev-parse", "--verify", "refs/rawr/vendor^{commit}"]);
    const sourceTree = await gitText(runner, root, [
      "rev-parse",
      "--verify",
      `refs/rawr/vendor:${query.sourcePath}`,
    ]);
    const entries = parseTree(await gitBytes(runner, root, [
      "ls-tree",
      "-r",
      "-z",
      "--full-tree",
      sourceTree,
    ], 64 * 1024 * 1024));
    const identity = Object.freeze({
      repositoryIdentity: query.repositoryIdentity,
      refName: query.refName,
      sourceCommit: commit,
      sourceTree,
      payloadDigest: vendorPayloadDigest(entries),
    });
    const ancestry = commit === query.admitted.sourceCommit
      ? "same"
      : await isAncestor(runner, root, query.admitted.sourceCommit, commit)
        ? "fast-forward"
        : "diverged";
    const observedAt = now().toISOString();
    return Object.freeze({
      kind: "Observed",
      repositoryIdentity: query.repositoryIdentity,
      refName: query.refName,
      sourcePath: query.sourcePath,
      identity,
      observedAt,
      ancestry,
      entries,
    });
  } catch (error) {
    return Object.freeze({ kind: "Invalid", detail: errorMessage(error) });
  }
}

async function withPrivateRepository<T>(
  runner: GitCommandRunner,
  query: VendorUpstreamQuery,
  metadataOnly: boolean,
  operation: (root: string) => Promise<T>,
): Promise<Readonly<{ result: T; cleanupFailure?: string }>> {
  const parent = await realpath(tmpdir());
  const root = await mkdtemp(path.join(parent, TEMP_PREFIX));
  const identity = await lstat(root, { bigint: true });
  let result: T;
  try {
    await gitOk(runner, root, ["init", "--bare", "."]);
    await gitOk(runner, root, ["remote", "add", "vendor", query.repositoryIdentity]);
    await gitOk(runner, root, [
      "fetch",
      "--quiet",
      "--no-tags",
      ...(metadataOnly ? ["--filter=blob:none"] : []),
      "vendor",
      `+${query.refName}:refs/rawr/vendor`,
    ], 120_000);
    result = await operation(root);
  } catch (error) {
    result = Object.freeze({ kind: "Unavailable", detail: errorMessage(error) }) as T;
  }
  try {
    await removeOwnedPrivateRepository(parent, root, identity.dev, identity.ino);
    return Object.freeze({ result });
  } catch (error) {
    return Object.freeze({ result, cleanupFailure: errorMessage(error) });
  }
}

async function removeOwnedPrivateRepository(
  parent: string,
  root: string,
  dev: bigint,
  ino: bigint,
): Promise<void> {
  const canonicalParent = await realpath(parent);
  const canonicalRoot = await realpath(root);
  const status = await lstat(root, { bigint: true });
  if (
    canonicalParent !== parent
    || canonicalRoot !== root
    || path.dirname(root) !== parent
    || !path.basename(root).startsWith(TEMP_PREFIX)
    || !status.isDirectory()
    || status.isSymbolicLink()
    || status.dev !== dev
    || status.ino !== ino
  ) {
    throw new Error("Refusing recursive cleanup of an unowned or substituted vendor Git root");
  }
  await rm(root, { recursive: true, force: false });
}

function parseTree(bytes: Uint8Array): readonly VendorPayloadEntry[] {
  const entries: VendorPayloadEntry[] = [];
  for (const raw of decoder.decode(bytes).split("\0")) {
    if (raw.length === 0) continue;
    const match = /^(100644|100755) blob ([0-9a-f]{40}|[0-9a-f]{64})\t([^\0]+)$/u.exec(raw);
    if (match === null) throw new Error("Vendor source tree contains a non-regular or malformed entry");
    entries.push(Object.freeze({
      mode: match[1] as "100644" | "100755",
      blob: match[2],
      path: match[3],
    }));
  }
  entries.sort((left, right) => compareText(left.path, right.path));
  return Object.freeze(entries);
}

async function isAncestor(runner: GitCommandRunner, root: string, prior: string, next: string): Promise<boolean> {
  const result = await runner.run(root, ["merge-base", "--is-ancestor", prior, next]);
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new Error(decoder.decode(result.stderr).trim() || "Git ancestry query failed");
}

async function gitOk(
  runner: GitCommandRunner,
  root: string,
  args: readonly string[],
  durationMs = 30_000,
): Promise<void> {
  const result = await runner.run(root, args, { durationMs });
  if (result.exitCode !== 0) throw new Error(decoder.decode(result.stderr).trim() || `Git ${args[0]} failed`);
}

async function gitBytes(
  runner: GitCommandRunner,
  root: string,
  args: readonly string[],
  stdoutBytes = 1024 * 1024,
): Promise<Uint8Array> {
  const result = await runner.run(root, args, { stdoutBytes });
  if (result.exitCode !== 0) throw new Error(decoder.decode(result.stderr).trim() || `Git ${args[0]} failed`);
  return result.stdout;
}

async function gitText(runner: GitCommandRunner, root: string, args: readonly string[]): Promise<string> {
  return decoder.decode(await gitBytes(runner, root, args)).trim();
}

function sameIdentity(left: VendorSourceIdentity, right: VendorSourceIdentity): boolean {
  return left.repositoryIdentity === right.repositoryIdentity
    && left.refName === right.refName
    && left.sourceCommit === right.sourceCommit
    && left.sourceTree === right.sourceTree
    && left.payloadDigest === right.payloadDigest;
}

function sameEntries(left: readonly VendorPayloadEntry[], right: readonly VendorPayloadEntry[]): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined
      && entry.path === candidate.path
      && entry.mode === candidate.mode
      && entry.blob === candidate.blob;
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
