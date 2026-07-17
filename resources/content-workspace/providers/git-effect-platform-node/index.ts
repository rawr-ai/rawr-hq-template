import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

import { Command, CommandExecutor, FileSystem } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { NodeContext } from "@effect/platform-node";
import type {
  ContentFileMode,
  ContentWorkspaceAsyncPort,
  ContentTreeEntry,
  ContentWorkspaceCapture,
  ContentWorkspaceFailure,
  ContentWorkspaceResource,
  ContentWorkspaceReleaseReceipt,
  ContentWorkspaceSettleReceipt,
  ContentWorkspaceWrite,
  ContentWorkspaceWriteReceipt,
  GitObjectFormat,
  MaterializedContentTreeEntry,
  MaterializedRemoteContentTree,
  RemoteContentTree,
} from "@rawr/resource-content-workspace";
import { Effect, Equal, Exit, Stream } from "effect";

const decoder = new TextDecoder("utf-8", { fatal: true });
const PRIVATE_GIT_PREFIX = "rawr-content-workspace-git-";
const ATOMIC_FILE_PREFIX = ".rawr-content-workspace-";
const OBJECT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const REF_PATTERN = /^refs\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u;

type ProviderRequirements = FileSystem.FileSystem | CommandExecutor.CommandExecutor;

export interface GitEffectPlatformNodeOptions {
  readonly gitExecutable: string;
}

interface ContentFileImage {
  readonly kind: "File";
  readonly path: string;
  readonly mode: number;
  readonly bytes: Uint8Array;
}

interface ContentDirectoryImage {
  readonly kind: "Directory";
  readonly path: string;
  readonly mode: number;
}

type ContentPathImageEntry = ContentFileImage | ContentDirectoryImage;

interface ContentPathImage {
  readonly path: string;
  readonly entries: readonly ContentPathImageEntry[] | null;
}

type CaptureLifecycle = "Captured" | "Applying" | "Partial" | "Applied" | "Converged" | "Restoring" | "Restored";

interface CaptureAuthority {
  readonly handle: string;
  readonly root: string;
  readonly readToken: string;
  readonly rootDev: number;
  readonly rootIno: import("effect").Option.Option<number>;
  readonly maxEntries: number;
  readonly maxBytes: number;
  readonly preimages: ReadonlyMap<string, ContentPathImage>;
  readonly paths: readonly string[];
  readonly postimages: Map<string, ContentPathImage>;
  readonly mutatedPaths: Set<string>;
  readonly restoredPaths: Set<string>;
  readonly uncertainPaths: Set<string>;
  lifecycle: CaptureLifecycle;
  planDigest?: string;
}

interface CaptureBudget {
  entries: number;
  bytes: number;
  readonly maxEntries: number;
  readonly maxBytes: number;
}

function makeCaptureBudget(limits: Readonly<{ maxEntries: number; maxBytes: number }>): CaptureBudget {
  return { entries: 0, bytes: 0, maxEntries: limits.maxEntries, maxBytes: limits.maxBytes };
}

interface PrivateGitRootAllocation {
  readonly root: string;
  readonly parent: string;
  identity?: Readonly<{
    dev: number;
    ino: import("effect").Option.Option<number>;
  }>;
}

export function makeContentWorkspaceResource(
  options: GitEffectPlatformNodeOptions,
): ContentWorkspaceResource<ProviderRequirements> {
  const captureAuthorities = new Map<string, CaptureAuthority>();
  const consumedHandles = new Set<string>();
  const inspectWorkspace = Effect.fn("contentWorkspace.inspect")(function* (
    input: Readonly<{ locator: string }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* requireCanonicalRoot(fs, input.locator, "inspect");
    const observedRoot = yield* gitText(options.gitExecutable, root, ["rev-parse", "--show-toplevel"], "inspect");
    if (observedRoot !== root) {
      return yield* fail("inspect", "Aliased", root, "Workspace locator resolves to a different Git root");
    }
    const [refName, commit, tree, objectFormat, remoteNames] = yield* Effect.all([
      gitText(options.gitExecutable, root, ["symbolic-ref", "--quiet", "HEAD"], "inspect"),
      gitText(options.gitExecutable, root, ["rev-parse", "--verify", "HEAD^{commit}"], "inspect"),
      gitText(options.gitExecutable, root, ["rev-parse", "--verify", "HEAD^{tree}"], "inspect"),
      gitObjectFormat(options.gitExecutable, root, "inspect"),
      gitLines(options.gitExecutable, root, ["remote"], "inspect"),
    ]);
    const remoteUrls = yield* Effect.forEach(remoteNames, (remote) =>
      gitLines(options.gitExecutable, root, ["remote", "get-url", "--all", remote], "inspect"));
    return Object.freeze({
      root,
      refName,
      commit,
      tree,
      objectFormat,
      remoteUrls: Object.freeze(remoteUrls.flat().sort(compareText)),
    });
  });

  const readFile = Effect.fn("contentWorkspace.readFile")(function* (
    input: Readonly<{ root: string; path: string; maxBytes: number }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* requireCanonicalRoot(fs, input.root, "read-file");
    const candidate = yield* checked("read-file", () => {
      validateLimit(input.maxBytes, "maxBytes", "read-file");
      return resolveContained(root, input.path, false, "read-file");
    });
    return yield* readBoundedRegularFile(fs, candidate, input.maxBytes, "read-file");
  });

  const readTree = Effect.fn("contentWorkspace.readTree")(function* (
    input: Readonly<{
      root: string;
      path: string;
      objectFormat: GitObjectFormat;
      maxEntries: number;
      maxBytes: number;
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* requireCanonicalRoot(fs, input.root, "read-tree");
    const candidate = yield* checked("read-tree", () => {
      validateLimits(input.maxEntries, input.maxBytes, "read-tree");
      return resolveContained(root, input.path, true, "read-tree");
    });
    return yield* readLocalTree(fs, candidate, input.objectFormat, input.maxEntries, input.maxBytes);
  });

  const observeRemote = Effect.fn("contentWorkspace.observeRemote")(function* (
    input: Readonly<{
      repositoryIdentity: string;
      refName: string;
      sourcePath: string;
      maxEntries: number;
    }>,
  ) {
    yield* checked("observe-remote", () => validateRemoteInput(input.refName, input.sourcePath, input.maxEntries, "observe-remote"));
    return yield* withPrivateGitRepository(options.gitExecutable, input.repositoryIdentity, input.refName, true, "observe-remote", (root) =>
      inspectFetchedTree(options.gitExecutable, root, input, "observe-remote"));
  });

  const materializeRemote = Effect.fn("contentWorkspace.materializeRemote")(function* (
    input: Readonly<{
      repositoryIdentity: string;
      refName: string;
      sourcePath: string;
      maxEntries: number;
      maxBytes: number;
    }>,
  ) {
    yield* checked("materialize-remote", () => {
      validateRemoteInput(input.refName, input.sourcePath, input.maxEntries, "materialize-remote");
      validateLimit(input.maxBytes, "maxBytes", "materialize-remote");
    });
    return yield* withPrivateGitRepository(options.gitExecutable, input.repositoryIdentity, input.refName, false, "materialize-remote", (root) =>
      Effect.gen(function* () {
        const observed = yield* inspectFetchedTree(options.gitExecutable, root, input, "materialize-remote");
        let total = 0;
        const entries = yield* Effect.forEach(observed.entries, (entry) => Effect.gen(function* () {
          const bytes = yield* gitBytes(
            options.gitExecutable,
            root,
            ["cat-file", "blob", entry.blob],
            "materialize-remote",
            input.maxBytes - total,
          );
          total += bytes.byteLength;
          if (total > input.maxBytes) {
            return yield* fail(
              "materialize-remote",
              "LimitExceeded",
              entry.path,
              "Remote content exceeds maxBytes",
            );
          }
          return Object.freeze({ ...entry, bytes });
        }));
        return Object.freeze({ ...observed, entries: Object.freeze(entries) }) satisfies MaterializedRemoteContentTree;
      }));
  });

  const isAncestor = Effect.fn("contentWorkspace.isAncestor")(function* (
    input: Readonly<{
      repositoryIdentity: string;
      refName: string;
      ancestorCommit: string;
      descendantCommit: string;
    }>,
  ) {
    yield* checked("ancestry", () => {
      validateObject(input.ancestorCommit, "ancestorCommit", "ancestry");
      validateObject(input.descendantCommit, "descendantCommit", "ancestry");
      validateRemoteInput(input.refName, "", 1, "ancestry");
    });
    return yield* withPrivateGitRepository(options.gitExecutable, input.repositoryIdentity, input.refName, true, "ancestry", (root) =>
      Effect.gen(function* () {
        const code = yield* gitExitCode(
          options.gitExecutable,
          root,
          ["merge-base", "--is-ancestor", input.ancestorCommit, input.descendantCommit],
          "ancestry",
        );
        if (code === 0) return true;
        if (code === 1) return false;
        return yield* fail("ancestry", "GitFailed", undefined, `Git ancestry query exited ${code}`);
      }));
  });

  const capture = Effect.fn("contentWorkspace.capture")(function* (
    input: Readonly<{
      root: string;
      readToken: string;
      paths: readonly string[];
      maxEntries: number;
      maxBytes: number;
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* requireCanonicalRoot(fs, input.root, "capture");
    yield* requireGitWorkspaceRoot(options.gitExecutable, root, "capture");
    const rootIdentity = yield* fs.stat(root).pipe(mapPlatform("capture", root));
    yield* checked("capture", () => {
      validateOpaque(input.readToken, "readToken", "capture");
      validateLimits(input.maxEntries, input.maxBytes, "capture");
      validateDistinctPaths(input.paths, "capture");
    });
    const budget = makeCaptureBudget(input);
    const paths = yield* Effect.forEach(input.paths, (relative) => Effect.gen(function* () {
      const candidate = yield* checked("capture", () => resolveContained(root, relative, false, "capture"));
      const present = yield* fs.exists(candidate).pipe(mapPlatform("capture", candidate));
      if (!present) return Object.freeze({ path: relative, entries: null });
      const captured = yield* captureTree(fs, candidate, "capture", budget);
      return Object.freeze({ path: relative, entries: captured });
    }));
    const handle = randomUUID();
    const publicPaths = Object.freeze(paths.map((image) => image.path));
    captureAuthorities.set(handle, {
      handle,
      root,
      readToken: input.readToken,
      rootDev: rootIdentity.dev,
      rootIno: rootIdentity.ino,
      maxEntries: input.maxEntries,
      maxBytes: input.maxBytes,
      preimages: new Map(paths.map((image) => [image.path, image])),
      paths: publicPaths,
      postimages: new Map(),
      mutatedPaths: new Set(),
      restoredPaths: new Set(),
      uncertainPaths: new Set(),
      lifecycle: "Captured",
    });
    return Object.freeze({ handle, readToken: input.readToken, paths: publicPaths }) satisfies ContentWorkspaceCapture;
  });

  const apply = Effect.fn("contentWorkspace.apply")(function* (
    input: Readonly<{
      root: string;
      planDigest: string;
      readToken: string;
      captureHandle: string;
      writes: readonly ContentWorkspaceWrite[];
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* requireCanonicalRoot(fs, input.root, "apply");
    yield* requireGitWorkspaceRoot(options.gitExecutable, root, "apply");
    yield* checked("apply", () => {
      validateOpaque(input.planDigest, "planDigest", "apply");
      validateOpaque(input.readToken, "readToken", "apply");
      validateOpaque(input.captureHandle, "captureHandle", "apply");
    });
    const authority = yield* requireCaptureAuthority(
      fs,
      captureAuthorities,
      consumedHandles,
      input.captureHandle,
      root,
      input.readToken,
      input.planDigest,
      "apply",
    );
    if (authority.lifecycle === "Partial" || authority.lifecycle === "Applying" || authority.lifecycle === "Restoring") {
      return yield* fail("apply", "HandleState", undefined, `Capture handle is ${authority.lifecycle}`);
    }
    if (authority.lifecycle === "Restored") {
      return yield* fail("apply", "HandleConsumed", undefined, "Capture handle has already been restored");
    }
    yield* validateWriteSet(root, authority, input.writes);
    const converged = yield* Effect.forEach(
      input.writes,
      (write) => writeIsExact(fs, root, write, makeCaptureBudget(authority)),
    );
    if (converged.every(Boolean)) {
      authority.planDigest = input.planDigest;
      authority.lifecycle = authority.lifecycle === "Applied" ? "Applied" : "Converged";
      return receipt(input.planDigest, input.readToken, "Converged", []);
    }
    if (authority.lifecycle !== "Captured") {
      return yield* fail("apply", "HandleState", undefined, `Capture handle cannot apply from ${authority.lifecycle}`);
    }
    for (const write of input.writes) {
      const expected = authority.preimages.get(write.path);
      if (expected === undefined) {
        return yield* fail("apply", "InvalidInput", write.path, "Write path has no captured preimage");
      }
      const current = yield* observePreimage(fs, root, write.path, "apply", makeCaptureBudget(authority));
      if (!equalPreimage(current, expected)) {
        return yield* fail("apply", "IdentityChanged", write.path, "Write path changed after capture");
      }
    }
    authority.planDigest = input.planDigest;
    authority.lifecycle = "Applying";
    const changedPaths: string[] = [];
    for (const write of input.writes) {
      const expected = authority.preimages.get(write.path);
      if (expected === undefined) {
        authority.lifecycle = "Partial";
        return yield* fail("apply", "InvalidInput", write.path, "Write path lost its captured preimage");
      }
      const immediate = yield* observePreimage(fs, root, write.path, "apply", makeCaptureBudget(authority));
      if (!equalPreimage(immediate, expected)) {
        authority.lifecycle = "Partial";
        return yield* fail("apply", "IdentityChanged", write.path, "Write path changed immediately before mutation");
      }
      authority.mutatedPaths.add(write.path);
      const applied = yield* Effect.either(applyWrite(fs, root, write, makeCaptureBudget(authority)));
      const postimage = yield* Effect.either(
        observePreimage(fs, root, write.path, "apply", makeCaptureBudget(authority)),
      );
      if (postimage._tag === "Right") authority.postimages.set(write.path, postimage.right);
      else authority.uncertainPaths.add(write.path);
      if (applied._tag === "Left") {
        authority.lifecycle = "Partial";
        return yield* Effect.fail(applied.left);
      }
      changedPaths.push(write.path);
    }
    authority.lifecycle = "Applied";
    return receipt(input.planDigest, input.readToken, "Applied", changedPaths);
  });

  const restore = Effect.fn("contentWorkspace.restore")(function* (
    input: Readonly<{
      root: string;
      planDigest: string;
      readToken: string;
      captureHandle: string;
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* requireCanonicalRoot(fs, input.root, "restore");
    yield* requireGitWorkspaceRoot(options.gitExecutable, root, "restore");
    yield* checked("restore", () => {
      validateOpaque(input.planDigest, "planDigest", "restore");
      validateOpaque(input.readToken, "readToken", "restore");
      validateOpaque(input.captureHandle, "captureHandle", "restore");
    });
    const authority = yield* requireCaptureAuthority(
      fs,
      captureAuthorities,
      consumedHandles,
      input.captureHandle,
      root,
      input.readToken,
      input.planDigest,
      "restore",
    );
    if (authority.lifecycle === "Converged") {
      authority.lifecycle = "Restored";
      return receipt(input.planDigest, input.readToken, "Restored", []);
    }
    if (authority.lifecycle !== "Applied" && authority.lifecycle !== "Partial") {
      return yield* fail(
        "restore",
        authority.lifecycle === "Restored" ? "HandleConsumed" : "HandleState",
        undefined,
        `Capture handle cannot restore from ${authority.lifecycle}`,
      );
    }
    if (authority.uncertainPaths.size > 0) {
      return yield* fail("restore", "HandleState", undefined, "Capture handle has an unobservable partial postimage");
    }
    for (const relative of authority.paths) {
      const preimage = authority.preimages.get(relative);
      const postimage = authority.postimages.get(relative);
      if (preimage === undefined) return yield* fail("restore", "HandleState", relative, "Capture evidence is incomplete");
      const current = yield* observePreimage(fs, root, relative, "restore", makeCaptureBudget(authority));
      if (equalPreimage(current, preimage)) {
        if (authority.mutatedPaths.has(relative)) authority.restoredPaths.add(relative);
        continue;
      }
      if (postimage === undefined || !equalPreimage(current, postimage)) {
        authority.lifecycle = "Partial";
        return yield* fail("restore", "IdentityChanged", relative, "Path changed after apply; restore refused");
      }
    }
    authority.lifecycle = "Restoring";
    const restored: string[] = [];
    for (const relative of authority.paths) {
      if (!authority.mutatedPaths.has(relative) || authority.restoredPaths.has(relative)) continue;
      const preimage = authority.preimages.get(relative);
      const postimage = authority.postimages.get(relative);
      if (preimage === undefined || postimage === undefined) {
        authority.lifecycle = "Partial";
        return yield* fail("restore", "HandleState", relative, "Restore evidence is incomplete");
      }
      const immediate = yield* observePreimage(fs, root, relative, "restore", makeCaptureBudget(authority));
      if (equalPreimage(immediate, preimage)) {
        authority.restoredPaths.add(relative);
        continue;
      }
      if (!equalPreimage(immediate, postimage)) {
        authority.lifecycle = "Partial";
        return yield* fail("restore", "IdentityChanged", relative, "Path changed immediately before restore");
      }
      const restoredPath = yield* Effect.either(restorePreimage(fs, root, preimage, makeCaptureBudget(authority)));
      if (restoredPath._tag === "Left") {
        authority.lifecycle = "Partial";
        const observed = yield* Effect.either(
          observePreimage(fs, root, relative, "restore", makeCaptureBudget(authority)),
        );
        if (observed._tag === "Left") authority.uncertainPaths.add(relative);
        else if (equalPreimage(observed.right, preimage)) authority.restoredPaths.add(relative);
        return yield* Effect.fail(restoredPath.left);
      }
      const verified = yield* observePreimage(fs, root, relative, "restore", makeCaptureBudget(authority));
      if (!equalPreimage(verified, preimage)) {
        authority.lifecycle = "Partial";
        return yield* fail("restore", "IdentityChanged", relative, "Restored path did not match its captured preimage");
      }
      authority.restoredPaths.add(relative);
      authority.postimages.set(relative, preimage);
      restored.push(relative);
    }
    authority.lifecycle = "Restored";
    return receipt(input.planDigest, input.readToken, "Restored", restored);
  });

  const settle = Effect.fn("contentWorkspace.settle")(function* (
    input: Readonly<{ root: string; planDigest: string; readToken: string; captureHandle: string }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* requireCanonicalRoot(fs, input.root, "settle");
    yield* requireGitWorkspaceRoot(options.gitExecutable, root, "settle");
    yield* checked("settle", () => {
      validateOpaque(input.planDigest, "planDigest", "settle");
      validateOpaque(input.readToken, "readToken", "settle");
      validateOpaque(input.captureHandle, "captureHandle", "settle");
    });
    const authority = yield* requireCaptureAuthority(
      fs,
      captureAuthorities,
      consumedHandles,
      input.captureHandle,
      root,
      input.readToken,
      input.planDigest,
      "settle",
    );
    if (authority.lifecycle !== "Applied" && authority.lifecycle !== "Converged" && authority.lifecycle !== "Restored") {
      return yield* fail("settle", "HandleState", undefined, `Capture handle cannot settle from ${authority.lifecycle}`);
    }
    captureAuthorities.delete(input.captureHandle);
    consumedHandles.add(input.captureHandle);
    return Object.freeze({
      planDigest: input.planDigest,
      readToken: input.readToken,
      outcome: "Settled",
      handle: input.captureHandle,
    }) satisfies ContentWorkspaceSettleReceipt;
  });

  const release = Effect.fn("contentWorkspace.release")(function* (
    input: Readonly<{
      root: string;
      readToken: string;
      captureHandle: string;
      disposition: "NoMutation" | "UnsettledRecovery";
    }>,
  ) {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* requireCanonicalRoot(fs, input.root, "release");
    yield* requireGitWorkspaceRoot(options.gitExecutable, root, "release");
    yield* checked("release", () => {
      validateOpaque(input.readToken, "readToken", "release");
      validateOpaque(input.captureHandle, "captureHandle", "release");
    });
    const authority = yield* requireCaptureAuthority(
      fs,
      captureAuthorities,
      consumedHandles,
      input.captureHandle,
      root,
      input.readToken,
      undefined,
      "release",
    );
    const noMutation = authority.lifecycle === "Captured" || authority.lifecycle === "Converged";
    const unsettled = authority.lifecycle === "Partial" || authority.lifecycle === "Applying" || authority.lifecycle === "Restoring";
    if (input.disposition === "NoMutation" && !noMutation) {
      return yield* fail("release", "HandleState", undefined, `No-mutation release is false from ${authority.lifecycle}`);
    }
    if (input.disposition === "UnsettledRecovery" && !unsettled) {
      return yield* fail("release", "HandleState", undefined, `Unsettled release is false from ${authority.lifecycle}`);
    }
    captureAuthorities.delete(input.captureHandle);
    consumedHandles.add(input.captureHandle);
    return Object.freeze({
      readToken: input.readToken,
      outcome: input.disposition === "NoMutation" ? "ReleasedUnmutated" : "ReleasedUnsettled",
      handle: input.captureHandle,
    }) satisfies ContentWorkspaceReleaseReceipt;
  });

  return Object.freeze({
    inspectWorkspace,
    readFile,
    readTree,
    observeRemote,
    materializeRemote,
    isAncestor,
    capture,
    apply,
    restore,
    settle,
    release,
  });
}

export type NodeContentWorkspaceResult<A> =
  | Readonly<{ ok: true; value: A }>
  | Readonly<{ ok: false; failure: ContentWorkspaceFailure }>;

export function runNodeContentWorkspace<A>(
  operation: Effect.Effect<A, ContentWorkspaceFailure, ProviderRequirements>,
): Promise<NodeContentWorkspaceResult<A>> {
  return Effect.runPromise(operation.pipe(
    Effect.map((value): NodeContentWorkspaceResult<A> => successfulNodeResult(value)),
    Effect.catchAll((failure) => Effect.succeed<NodeContentWorkspaceResult<A>>(failedNodeResult(failure))),
    Effect.provide(NodeContext.layer),
  ));
}

export function makeNodeContentWorkspacePort(options: GitEffectPlatformNodeOptions): ContentWorkspaceAsyncPort {
  const resource = makeContentWorkspaceResource(options);
  return Object.freeze({
    inspectWorkspace: (input: Parameters<typeof resource.inspectWorkspace>[0]) => runNodeOrReject(resource.inspectWorkspace(input)),
    readFile: (input: Parameters<typeof resource.readFile>[0]) => runNodeOrReject(resource.readFile(input)),
    readTree: (input: Parameters<typeof resource.readTree>[0]) => runNodeOrReject(resource.readTree(input)),
    observeRemote: (input: Parameters<typeof resource.observeRemote>[0]) => runNodeOrReject(resource.observeRemote(input)),
    materializeRemote: (input: Parameters<typeof resource.materializeRemote>[0]) => runNodeOrReject(resource.materializeRemote(input)),
    isAncestor: (input: Parameters<typeof resource.isAncestor>[0]) => runNodeOrReject(resource.isAncestor(input)),
    capture: (input: Parameters<typeof resource.capture>[0]) => runNodeOrReject(resource.capture(input)),
    apply: (input: Parameters<typeof resource.apply>[0]) => runNodeOrReject(resource.apply(input)),
    restore: (input: Parameters<typeof resource.restore>[0]) => runNodeOrReject(resource.restore(input)),
    settle: (input: Parameters<typeof resource.settle>[0]) => runNodeOrReject(resource.settle(input)),
    release: (input: Parameters<typeof resource.release>[0]) => runNodeOrReject(resource.release(input)),
  });
}

function runNodeOrReject<A>(
  operation: Effect.Effect<A, ContentWorkspaceFailure, ProviderRequirements>,
): Promise<A> {
  return runNodeContentWorkspace(operation).then((result) => result.ok
    ? result.value
    : Promise.reject(result.failure));
}

function inspectFetchedTree(
  gitExecutable: string,
  root: string,
  input: Readonly<{
    repositoryIdentity: string;
    refName: string;
    sourcePath: string;
    maxEntries: number;
  }>,
  operation: "observe-remote" | "materialize-remote",
): Effect.Effect<RemoteContentTree, ContentWorkspaceFailure, CommandExecutor.CommandExecutor> {
  return Effect.gen(function* () {
    const commit = yield* gitText(gitExecutable, root, ["rev-parse", "--verify", "refs/rawr/content^{commit}"], operation);
    const treeSpec = input.sourcePath === "" ? "refs/rawr/content^{tree}" : `refs/rawr/content:${input.sourcePath}`;
    const tree = yield* gitText(gitExecutable, root, ["rev-parse", "--verify", treeSpec], operation);
    const objectFormat = yield* gitObjectFormat(gitExecutable, root, operation);
    const entries = yield* parseGitTree(
      yield* gitBytes(
        gitExecutable,
        root,
        ["ls-tree", "-r", "-z", "--full-tree", tree],
        operation,
        maxTreeListingBytes(input.maxEntries),
      ),
      input.maxEntries,
      operation,
    );
    return Object.freeze({
      repositoryIdentity: input.repositoryIdentity,
      refName: input.refName,
      sourcePath: input.sourcePath,
      commit,
      tree,
      objectFormat,
      entries,
    });
  });
}

function withPrivateGitRepository<A>(
  gitExecutable: string,
  repositoryIdentity: string,
  refName: string,
  metadataOnly: boolean,
  operation: "observe-remote" | "materialize-remote" | "ancestry",
  use: (root: string) => Effect.Effect<A, ContentWorkspaceFailure, ProviderRequirements>,
): Effect.Effect<A, ContentWorkspaceFailure, ProviderRequirements> {
  return Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const parent = yield* fs.realPath(tmpdir()).pipe(mapPlatform(operation, tmpdir()));
    const root = yield* fs.makeTempDirectory({ directory: parent, prefix: PRIVATE_GIT_PREFIX }).pipe(
      mapPlatform(operation, parent),
    );
    const allocation: PrivateGitRootAllocation = { root, parent };
    const outcome = yield* Effect.exit(restore(Effect.gen(function* () {
      const canonicalRoot = yield* fs.realPath(root).pipe(mapPlatform(operation, root));
      const identity = yield* fs.stat(root).pipe(mapPlatform(operation, root));
      allocation.identity = Object.freeze({ dev: identity.dev, ino: identity.ino });
      if (
        canonicalRoot !== root
        || path.dirname(root) !== parent
        || !path.basename(root).startsWith(PRIVATE_GIT_PREFIX)
        || identity.type !== "Directory"
      ) {
        return yield* fail(operation, "Aliased", root, "Private Git directory was not created at its exact owned path");
      }
      yield* gitText(gitExecutable, root, ["init", "--bare", "."], operation);
      yield* gitText(gitExecutable, root, ["remote", "add", "content", repositoryIdentity], operation);
      yield* gitText(gitExecutable, root, [
        "fetch",
        "--quiet",
        "--no-tags",
        ...(metadataOnly ? ["--filter=blob:none"] : []),
        "content",
        `+${refName}:refs/rawr/content`,
      ], operation);
      return yield* use(root);
    })));
    const cleanup = yield* Effect.either(removeOwnedPrivateGitRoot(fs, allocation));
    if (cleanup._tag === "Left") return yield* Effect.fail(cleanup.left);
    return yield* Exit.matchEffect(outcome, {
      onFailure: (cause) => Effect.failCause(cause),
      onSuccess: (value) => Effect.succeed(value),
    });
  }));
}

function removeOwnedPrivateGitRoot(
  fs: FileSystem.FileSystem,
  owned: PrivateGitRootAllocation,
) {
  return Effect.gen(function* () {
    const canonicalParent = yield* fs.realPath(owned.parent).pipe(mapPlatform("cleanup", owned.parent));
    const canonicalRoot = yield* fs.realPath(owned.root).pipe(mapPlatform("cleanup", owned.root));
    const current = yield* fs.stat(owned.root).pipe(mapPlatform("cleanup", owned.root));
    if (
      canonicalParent !== owned.parent
      || canonicalRoot !== owned.root
      || path.dirname(owned.root) !== owned.parent
      || !path.basename(owned.root).startsWith(PRIVATE_GIT_PREFIX)
      || current.type !== "Directory"
      || (owned.identity !== undefined && current.dev !== owned.identity.dev)
      || (owned.identity !== undefined && !Equal.equals(current.ino, owned.identity.ino))
    ) {
      return yield* fail("cleanup", "CleanupFailed", owned.root, "Refusing cleanup of an unowned or substituted private Git root");
    }
    yield* fs.remove(owned.root, { recursive: true, force: false }).pipe(
      Effect.mapError((cause) => platformFailure("cleanup", owned.root, cause, "CleanupFailed")),
    );
  });
}

function readLocalTree(
  fs: FileSystem.FileSystem,
  root: string,
  objectFormat: GitObjectFormat,
  maxEntries: number,
  maxBytes: number,
) {
  const entries: ContentTreeEntry[] = [];
  let bytesRead = 0;
  const walk = (directory: string, relative: string): Effect.Effect<void, ContentWorkspaceFailure> => Effect.gen(function* () {
    yield* requireExactExistingPath(fs, directory, "read-tree");
    const info = yield* fs.stat(directory).pipe(mapPlatform("read-tree", directory));
    if (info.type !== "Directory") {
      return yield* fail("read-tree", "UnsupportedEntry", directory, "Content tree root must be a directory");
    }
    const names = (yield* fs.readDirectory(directory).pipe(mapPlatform("read-tree", directory))).sort(compareText);
    for (const name of names) {
      const childRelative = relative === "" ? name : `${relative}/${name}`;
      yield* checked("read-tree", () => validateRelativePath(childRelative, false, "read-tree"));
      const child = path.join(directory, name);
      yield* requireExactExistingPath(fs, child, "read-tree");
      const childInfo = yield* fs.stat(child).pipe(mapPlatform("read-tree", child));
      if (childInfo.type === "Directory") {
        yield* walk(child, childRelative);
        continue;
      }
      if (childInfo.type !== "File") {
        return yield* fail("read-tree", "UnsupportedEntry", childRelative, "Content tree contains a non-regular entry");
      }
      if (entries.length >= maxEntries) {
        return yield* fail("read-tree", "LimitExceeded", childRelative, "Content tree exceeds maxEntries");
      }
      const remaining = maxBytes - bytesRead;
      if (remaining < 0) return yield* fail("read-tree", "LimitExceeded", childRelative, "Content tree exceeds maxBytes");
      const bytes = yield* readBoundedRegularFile(fs, child, remaining, "read-tree");
      bytesRead += bytes.byteLength;
      entries.push(Object.freeze({
        path: childRelative,
        mode: (childInfo.mode & 0o111) === 0 ? "100644" : "100755",
        blob: gitBlobId(bytes, objectFormat),
      }));
    }
  });
  return walk(root, "").pipe(Effect.map(() => Object.freeze(entries)));
}

function captureTree(
  fs: FileSystem.FileSystem,
  root: string,
  operation: "capture" | "apply" | "restore",
  budget: CaptureBudget,
): Effect.Effect<readonly ContentPathImageEntry[], ContentWorkspaceFailure> {
  const entries: ContentPathImageEntry[] = [];
  const walk = (candidate: string, relative: string): Effect.Effect<void, ContentWorkspaceFailure> => Effect.gen(function* () {
    yield* requireExactExistingPath(fs, candidate, operation);
    const info = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    if (budget.entries >= budget.maxEntries) {
      return yield* fail(operation, "LimitExceeded", candidate, "Captured paths exceed maxEntries");
    }
    budget.entries += 1;
    if (info.type === "File") {
      const remaining = budget.maxBytes - budget.bytes;
      if (remaining < 0 || info.size > BigInt(remaining)) {
        return yield* fail(operation, "LimitExceeded", candidate, "Captured paths exceed maxBytes");
      }
      const bytes = yield* readBoundedRegularFile(fs, candidate, remaining, operation);
      budget.bytes += bytes.byteLength;
      entries.push(Object.freeze({
        kind: "File",
        path: relative,
        mode: info.mode & 0o777,
        bytes,
      }));
      return;
    }
    if (info.type !== "Directory") {
      return yield* fail(operation, "UnsupportedEntry", candidate, "Path preimage contains a non-regular entry");
    }
    entries.push(Object.freeze({ kind: "Directory", path: relative, mode: info.mode & 0o777 }));
    const names = (yield* fs.readDirectory(candidate).pipe(mapPlatform(operation, candidate))).sort(compareText);
    for (const name of names) {
      const nextRelative = relative === "" ? name : `${relative}/${name}`;
      yield* checked(operation, () => validateRelativePath(nextRelative, false, operation));
      yield* walk(path.join(candidate, name), nextRelative);
    }
  });
  return walk(root, "").pipe(Effect.map(() => Object.freeze(entries)));
}

function removePathIfPresent(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: "apply" | "restore",
  budget: CaptureBudget,
) {
  return Effect.gen(function* () {
    if (!(yield* fs.exists(candidate).pipe(mapPlatform(operation, candidate)))) return;
    const entries = yield* captureTree(fs, candidate, operation, budget);
    for (const entry of [...entries].reverse()) {
      const target = entry.path === "" ? candidate : path.join(candidate, ...entry.path.split("/"));
      yield* requireExactExistingPath(fs, target, operation);
      if (entry.kind === "File") {
        yield* fs.remove(target).pipe(mapPlatform(operation, target));
      } else {
        yield* removeEmptyDirectory(fs, target, operation);
      }
    }
  });
}

function observePreimage(
  fs: FileSystem.FileSystem,
  root: string,
  relative: string,
  operation: "apply" | "restore",
  budget: CaptureBudget,
): Effect.Effect<ContentPathImage, ContentWorkspaceFailure> {
  return Effect.gen(function* () {
    const candidate = yield* checked(operation, () => resolveContained(root, relative, false, operation));
    const present = yield* fs.exists(candidate).pipe(mapPlatform(operation, candidate));
    if (!present) return Object.freeze({ path: relative, entries: null });
    const entries = yield* captureTree(fs, candidate, operation, budget);
    return Object.freeze({ path: relative, entries });
  });
}

function requireCaptureAuthority(
  fs: FileSystem.FileSystem,
  authorities: ReadonlyMap<string, CaptureAuthority>,
  consumed: ReadonlySet<string>,
  handle: string,
  root: string,
  readToken: string,
  planDigest: string | undefined,
  operation: "apply" | "restore" | "settle" | "release",
) {
  return Effect.gen(function* () {
    if (consumed.has(handle)) return yield* fail(operation, "HandleConsumed", undefined, "Capture handle was already settled");
    const authority = authorities.get(handle);
    if (authority === undefined) return yield* fail(operation, "InvalidHandle", undefined, "Capture handle is not owned by this provider");
    if (authority.root !== root) return yield* fail(operation, "WrongRoot", root, "Capture handle belongs to a different Git root");
    const rootIdentity = yield* fs.stat(root).pipe(mapPlatform(operation, root));
    if (rootIdentity.dev !== authority.rootDev || !Equal.equals(rootIdentity.ino, authority.rootIno)) {
      return yield* fail(operation, "WrongRoot", root, "Capture handle Git-root filesystem identity changed");
    }
    if (authority.readToken !== readToken) return yield* fail(operation, "WrongToken", undefined, "Capture handle readToken does not match");
    if (planDigest !== undefined && authority.planDigest !== undefined && authority.planDigest !== planDigest) {
      return yield* fail(operation, "WrongPlan", undefined, "Capture handle belongs to a different write plan");
    }
    if (operation !== "apply" && operation !== "release" && authority.planDigest === undefined) {
      return yield* fail(operation, "WrongPlan", undefined, "Capture handle has not been bound to a write plan");
    }
    return authority;
  });
}

function validateDistinctPaths(paths: readonly string[], operation: "capture"): void {
  const seen = new Set<string>();
  for (const relative of paths) {
    validateRelativePath(relative, false, operation);
    if (seen.has(relative)) throw invalidInput(operation, relative, "Capture contains duplicate paths");
    if ([...seen].some((existing) => pathsOverlap(existing, relative))) {
      throw invalidInput(operation, relative, "Capture contains overlapping paths");
    }
    seen.add(relative);
  }
}

function validateWriteSet(
  root: string,
  authority: CaptureAuthority,
  writes: readonly ContentWorkspaceWrite[],
): Effect.Effect<void, ContentWorkspaceFailure> {
  return checked("apply", () => {
    const writePaths = new Set<string>();
    for (const write of writes) {
      resolveContained(root, write.path, false, "apply");
      if (!authority.preimages.has(write.path)) throw invalidInput("apply", write.path, "Write path was not captured by this handle");
      if (writePaths.has(write.path)) throw invalidInput("apply", write.path, "Write plan contains duplicate paths");
      if ([...writePaths].some((existing) => pathsOverlap(existing, write.path))) {
        throw invalidInput("apply", write.path, "Write plan contains overlapping paths");
      }
      writePaths.add(write.path);
      if (write.kind === "ReplaceTree") {
        const entryPaths = new Set<string>();
        for (const entry of write.entries) {
          validateRelativePath(entry.path, false, "apply");
          if (entryPaths.has(entry.path)) throw invalidInput("apply", entry.path, "Replacement tree contains duplicate paths");
          if ([...entryPaths].some((existing) => pathsOverlap(existing, entry.path))) {
            throw invalidInput("apply", entry.path, "Replacement tree contains a file/descendant collision");
          }
          entryPaths.add(entry.path);
        }
      }
    }
  });
}

function equalPreimage(left: ContentPathImage, right: ContentPathImage): boolean {
  if (left.path !== right.path) return false;
  if (left.entries === null || right.entries === null) return left.entries === right.entries;
  if (left.entries.length !== right.entries.length) return false;
  return left.entries.every((entry, index) => {
    const candidate = right.entries?.[index];
    if (candidate === undefined || entry.kind !== candidate.kind || entry.path !== candidate.path || entry.mode !== candidate.mode) {
      return false;
    }
    return entry.kind === "Directory" || (candidate.kind === "File" && equalBytes(entry.bytes, candidate.bytes));
  });
}

function writeIsExact(
  fs: FileSystem.FileSystem,
  root: string,
  write: ContentWorkspaceWrite,
  budget: CaptureBudget,
): Effect.Effect<boolean, ContentWorkspaceFailure> {
  return Effect.gen(function* () {
    const current = yield* observePreimage(fs, root, write.path, "apply", budget);
    if (current.entries === null) return false;
    if (write.kind === "ReplaceFile") {
      const entry = current.entries[0];
      return current.entries.length === 1
        && entry?.kind === "File"
        && entry.path === ""
        && entry.mode === fileMode(write.mode)
        && equalBytes(entry.bytes, write.bytes);
    }
    const expectedDirectories = new Set<string>([""]);
    const expectedFiles = new Map<string, MaterializedContentTreeEntry>();
    for (const entry of write.entries) {
      yield* checked("apply", () => validateRelativePath(entry.path, false, "apply"));
      expectedFiles.set(entry.path, entry);
      const segments = entry.path.split("/");
      for (let index = 1; index < segments.length; index += 1) {
        expectedDirectories.add(segments.slice(0, index).join("/"));
      }
    }
    const actualDirectories = current.entries.filter((entry) => entry.kind === "Directory");
    const actualFiles = current.entries.filter((entry) => entry.kind === "File");
    if (actualDirectories.length !== expectedDirectories.size || actualFiles.length !== expectedFiles.size) return false;
    if (actualDirectories.some((entry) => !expectedDirectories.has(entry.path))) return false;
    return actualFiles.every((entry) => {
      const expected = expectedFiles.get(entry.path);
      return expected !== undefined
        && entry.mode === fileMode(expected.mode)
        && equalBytes(entry.bytes, expected.bytes);
    });
  });
}

function replaceTree(
  fs: FileSystem.FileSystem,
  candidate: string,
  entries: readonly MaterializedContentTreeEntry[],
  operation: "apply",
  budget: CaptureBudget,
) {
  return Effect.gen(function* () {
    yield* removePathIfPresent(fs, candidate, operation, budget);
    yield* ensureDirectoryChain(fs, path.dirname(candidate), operation);
    yield* fs.makeDirectory(candidate, { recursive: false, mode: 0o700 }).pipe(mapPlatform(operation, candidate));
    yield* requireExactExistingPath(fs, candidate, operation);
    const seen = new Set<string>();
    for (const entry of entries) {
      yield* checked(operation, () => validateRelativePath(entry.path, false, operation));
      if (seen.has(entry.path)) return yield* fail(operation, "InvalidInput", entry.path, "Replacement tree has duplicate paths");
      seen.add(entry.path);
      const destination = path.join(candidate, ...entry.path.split("/"));
      yield* writeAtomic(fs, destination, entry.bytes, fileMode(entry.mode), operation);
    }
  });
}

function applyWrite(
  fs: FileSystem.FileSystem,
  root: string,
  write: ContentWorkspaceWrite,
  budget: CaptureBudget,
) {
  return Effect.gen(function* () {
    const candidate = yield* checked("apply", () => resolveContained(root, write.path, false, "apply"));
    if (write.kind === "ReplaceFile") {
      yield* removePathIfPresent(fs, candidate, "apply", budget);
      yield* writeAtomic(fs, candidate, write.bytes, fileMode(write.mode), "apply");
    } else {
      yield* replaceTree(fs, candidate, write.entries, "apply", budget);
    }
  });
}

function restorePreimage(
  fs: FileSystem.FileSystem,
  root: string,
  preimage: ContentPathImage,
  budget: CaptureBudget,
) {
  return Effect.gen(function* () {
    const candidate = yield* checked("restore", () => resolveContained(root, preimage.path, false, "restore"));
    yield* removePathIfPresent(fs, candidate, "restore", budget);
    if (preimage.entries !== null) yield* restoreTree(fs, candidate, preimage.entries);
  });
}

function restoreTree(
  fs: FileSystem.FileSystem,
  candidate: string,
  entries: readonly ContentPathImageEntry[],
) {
  return Effect.gen(function* () {
    const directories = entries.filter((entry) => entry.kind === "Directory").sort((left, right) => left.path.length - right.path.length);
    for (const entry of directories) {
      const destination = entry.path === "" ? candidate : path.join(candidate, ...entry.path.split("/"));
      yield* ensureDirectoryChain(fs, path.dirname(destination), "restore");
      if (!(yield* fs.exists(destination).pipe(mapPlatform("restore", destination)))) {
        yield* fs.makeDirectory(destination, { recursive: false, mode: entry.mode }).pipe(mapPlatform("restore", destination));
      }
      yield* requireExactExistingPath(fs, destination, "restore");
      yield* fs.chmod(destination, entry.mode).pipe(mapPlatform("restore", destination));
    }
    for (const entry of entries) {
      if (entry.kind !== "File") continue;
      const destination = entry.path === "" ? candidate : path.join(candidate, ...entry.path.split("/"));
      yield* writeAtomic(fs, destination, entry.bytes, entry.mode, "restore");
    }
  });
}

function writeAtomic(
  fs: FileSystem.FileSystem,
  destination: string,
  bytes: Uint8Array,
  mode: number,
  operation: "apply" | "restore",
) {
  return Effect.gen(function* () {
    const parent = path.dirname(destination);
    yield* ensureDirectoryChain(fs, parent, operation);
    const temporary = path.join(parent, `${ATOMIC_FILE_PREFIX}${randomUUID()}.tmp`);
    yield* Effect.acquireUseRelease(
      fs.writeFile(temporary, bytes, { flag: "wx", mode: 0o600 }).pipe(
        mapPlatform(operation, temporary),
        Effect.as(temporary),
      ),
      (owned) => Effect.gen(function* () {
        yield* fs.chmod(owned, mode).pipe(mapPlatform(operation, owned));
        yield* fs.rename(owned, destination).pipe(mapPlatform(operation, destination));
      }),
      (owned) => fs.exists(owned).pipe(
        Effect.flatMap((exists) => exists ? fs.remove(owned, { force: false }) : Effect.void),
        Effect.ignore,
      ),
    );
  });
}

function readBoundedRegularFile(
  fs: FileSystem.FileSystem,
  candidate: string,
  maxBytes: number,
  operation: "read-file" | "read-tree" | "capture" | "apply" | "restore",
) {
  return Effect.gen(function* () {
    const canonical = yield* fs.realPath(candidate).pipe(mapPlatform(operation, candidate));
    if (canonical !== candidate) return yield* fail(operation, "Aliased", candidate, "File path is not canonical");
    const before = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    if (before.type !== "File") return yield* fail(operation, "UnsupportedEntry", candidate, "Expected a regular file");
    if (before.size > BigInt(maxBytes)) return yield* fail(operation, "LimitExceeded", candidate, "File exceeds maxBytes");
    const bytes = yield* fs.readFile(candidate).pipe(mapPlatform(operation, candidate));
    const after = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    if (
      after.type !== "File"
      || before.dev !== after.dev
      || !Equal.equals(before.ino, after.ino)
      || before.size !== after.size
      || bytes.byteLength !== Number(after.size)
    ) {
      return yield* fail(operation, "IdentityChanged", candidate, "File identity changed while reading");
    }
    return bytes;
  });
}

function requireCanonicalRoot(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: ContentWorkspaceFailure["operation"],
) {
  return Effect.gen(function* () {
    if (!path.isAbsolute(candidate) || path.normalize(candidate) !== candidate) {
      return yield* fail(operation, "InvalidInput", candidate, "Workspace root must be a normalized absolute path");
    }
    const canonical = yield* fs.realPath(candidate).pipe(mapPlatform(operation, candidate));
    const info = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    if (canonical !== candidate || info.type !== "Directory") {
      return yield* fail(operation, "Aliased", candidate, "Workspace root must be a canonical directory");
    }
    return candidate;
  });
}

function requireGitWorkspaceRoot(
  gitExecutable: string,
  root: string,
  operation: "capture" | "apply" | "restore" | "settle" | "release",
) {
  return Effect.gen(function* () {
    if (root === path.parse(root).root) {
      return yield* fail(operation, "InvalidInput", root, "Filesystem root cannot be a content workspace mutation root");
    }
    const observed = yield* gitText(gitExecutable, root, ["rev-parse", "--show-toplevel"], operation);
    if (observed !== root) {
      return yield* fail(operation, "Aliased", root, "Mutation root must be the exact Git workspace root");
    }
  });
}

function requireExactExistingPath(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: "read-tree" | "capture" | "apply" | "restore",
) {
  return Effect.gen(function* () {
    const canonical = yield* fs.realPath(candidate).pipe(mapPlatform(operation, candidate));
    if (canonical !== candidate) {
      return yield* fail(operation, "Aliased", candidate, "Refusing to traverse an aliased or symbolic path");
    }
  });
}

function ensureDirectoryChain(
  fs: FileSystem.FileSystem,
  directory: string,
  operation: "apply" | "restore",
) {
  return Effect.gen(function* () {
    const parsed = path.parse(directory);
    const segments = directory.slice(parsed.root.length).split(path.sep).filter((segment) => segment !== "");
    let current = parsed.root;
    for (const segment of segments) {
      current = path.join(current, segment);
      const exists = yield* fs.exists(current).pipe(mapPlatform(operation, current));
      if (!exists) {
        yield* fs.makeDirectory(current, { recursive: false, mode: 0o700 }).pipe(mapPlatform(operation, current));
      }
      yield* requireExactExistingPath(fs, current, operation);
      const info = yield* fs.stat(current).pipe(mapPlatform(operation, current));
      if (info.type !== "Directory") {
        return yield* fail(operation, "UnsupportedEntry", current, "Write parent must be a directory");
      }
    }
  });
}

function removeEmptyDirectory(
  fs: FileSystem.FileSystem,
  candidate: string,
  operation: "apply" | "restore",
) {
  return Effect.gen(function* () {
    yield* requireExactExistingPath(fs, candidate, operation);
    const before = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    const entries = yield* fs.readDirectory(candidate).pipe(mapPlatform(operation, candidate));
    if (before.type !== "Directory" || entries.length !== 0) {
      return yield* fail(operation, "IdentityChanged", candidate, "Exact directory is no longer empty");
    }
    yield* requireExactExistingPath(fs, candidate, operation);
    const after = yield* fs.stat(candidate).pipe(mapPlatform(operation, candidate));
    if (after.type !== "Directory" || before.dev !== after.dev || !Equal.equals(before.ino, after.ino)) {
      return yield* fail(operation, "IdentityChanged", candidate, "Exact empty directory identity changed before removal");
    }
    yield* fs.remove(candidate, { recursive: true, force: false }).pipe(mapPlatform(operation, candidate));
  });
}

function resolveContained(
  root: string,
  relative: string,
  allowEmpty: boolean,
  operation: ContentWorkspaceFailure["operation"],
): string {
  validateRelativePath(relative, allowEmpty, operation);
  if (relative === "") return root;
  const candidate = path.join(root, ...relative.split("/"));
  const offset = path.relative(root, candidate);
  if (offset === "" || offset === ".." || offset.startsWith(`..${path.sep}`) || path.isAbsolute(offset)) {
    throw invalidInput(operation, relative, "Path escapes or aliases the workspace root");
  }
  return candidate;
}

function validateRelativePath(
  relative: string,
  allowEmpty: boolean,
  operation: ContentWorkspaceFailure["operation"],
): void {
  if ((allowEmpty && relative === "") || (
    relative.length > 0
    && relative.length <= 4096
    && !relative.startsWith("/")
    && !relative.endsWith("/")
    && !relative.includes("\\")
    && !relative.includes("\0")
    && relative.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..")
  )) return;
  throw invalidInput(operation, relative, "Path must be a canonical repository-relative path");
}

function validateRemoteInput(
  refName: string,
  sourcePath: string,
  maxEntries: number,
  operation: "observe-remote" | "materialize-remote" | "ancestry",
): void {
  if (!REF_PATTERN.test(refName) || refName.includes("..") || refName.endsWith(".")) {
    throw invalidInput(operation, refName, "Remote ref must be a canonical full ref name");
  }
  validateRelativePath(sourcePath, true, operation);
  validateLimit(maxEntries, "maxEntries", operation);
}

function validateLimits(maxEntries: number, maxBytes: number, operation: ContentWorkspaceFailure["operation"]): void {
  validateLimit(maxEntries, "maxEntries", operation);
  validateLimit(maxBytes, "maxBytes", operation);
}

function validateLimit(value: number, label: string, operation: ContentWorkspaceFailure["operation"]): void {
  if (!Number.isSafeInteger(value) || value < 1) throw invalidInput(operation, undefined, `${label} must be a positive safe integer`);
}

function validateOpaque(value: string, label: string, operation: "capture" | "apply" | "restore" | "settle" | "release"): void {
  if (value.length === 0 || value.length > 4096 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw invalidInput(operation, undefined, `${label} must be a bounded opaque value`);
  }
}

function validateObject(value: string, label: string, operation: "ancestry"): void {
  if (!OBJECT_PATTERN.test(value)) throw invalidInput(operation, value, `${label} must be a Git object ID`);
}

function parseGitTree(
  bytes: Uint8Array,
  maxEntries: number,
  operation: "observe-remote" | "materialize-remote",
) {
  return Effect.try({
    try: () => {
      const entries: ContentTreeEntry[] = [];
      for (const raw of decoder.decode(bytes).split("\0")) {
        if (raw.length === 0) continue;
        const match = /^(100644|100755) blob ([0-9a-f]{40}|[0-9a-f]{64})\t([^\0]+)$/u.exec(raw);
        if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
          throw new Error("Git tree contains a non-regular or malformed entry");
        }
        validateRelativePath(match[3], false, operation);
        entries.push(Object.freeze({ mode: parseContentFileMode(match[1]), blob: match[2], path: match[3] }));
        if (entries.length > maxEntries) throw new Error("Git tree exceeds maxEntries");
      }
      entries.sort((left, right) => compareText(left.path, right.path));
      return Object.freeze(entries);
    },
    catch: (cause) => failure(operation, "UnsupportedEntry", undefined, errorMessage(cause)),
  });
}

function gitObjectFormat(
  executable: string,
  root: string,
  operation: "inspect" | "observe-remote" | "materialize-remote",
): Effect.Effect<GitObjectFormat, ContentWorkspaceFailure, CommandExecutor.CommandExecutor> {
  return gitText(executable, root, ["rev-parse", "--show-object-format"], operation).pipe(
    Effect.flatMap((format) => format === "sha1" || format === "sha256"
      ? Effect.succeed(format === "sha1" ? "sha1" : "sha256")
      : fail(operation, "GitFailed", root, `Unsupported Git object format: ${format}`)),
  );
}

function gitText(
  executable: string,
  root: string,
  args: readonly string[],
  operation: ContentWorkspaceFailure["operation"],
) {
  return runGitCommand(executable, root, args, operation, 1024 * 1024).pipe(
    Effect.flatMap((result) => result.exitCode === 0
      ? decodeGitOutput(result.stdout, operation, root)
      : fail(operation, "GitFailed", root, gitFailureDetail(args, result.stderr))),
    Effect.map((output) => output.trim()),
  );
}

function gitLines(
  executable: string,
  root: string,
  args: readonly string[],
  operation: "inspect",
) {
  return gitText(executable, root, args, operation).pipe(
    Effect.map((output) => output === "" ? [] : output.split("\n").filter((line) => line !== "")),
  );
}

function gitBytes(
  executable: string,
  root: string,
  args: readonly string[],
  operation: "observe-remote" | "materialize-remote",
  maxBytes: number,
) {
  return runGitCommand(executable, root, args, operation, maxBytes).pipe(
    Effect.flatMap((result) => result.exitCode === 0
      ? Effect.succeed(result.stdout)
      : fail(operation, "GitFailed", root, gitFailureDetail(args, result.stderr))),
  );
}

function emptyByteAccumulator(): { chunks: Uint8Array[]; bytes: number } {
  return { chunks: [], bytes: 0 };
}

function maxTreeListingBytes(maxEntries: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, maxEntries * 4_200);
}

function gitExitCode(
  executable: string,
  root: string,
  args: readonly string[],
  operation: "ancestry",
) {
  return runGitCommand(executable, root, args, operation, 64 * 1024).pipe(
    Effect.map((result) => result.exitCode),
  );
}

function runGitCommand(
  executable: string,
  root: string,
  args: readonly string[],
  operation: ContentWorkspaceFailure["operation"],
  maxStdoutBytes: number,
) {
  const command = Command.make(executable, ...args).pipe(Command.workingDirectory(root));
  return Effect.scoped(Effect.gen(function* () {
    const process = yield* Command.start(command).pipe(
      Effect.mapError((cause) => platformFailure(operation, root, cause, "GitFailed")),
    );
    const [stdout, stderr, exitCode] = yield* Effect.all([
      collectBoundedGitStream(process.stdout, maxStdoutBytes, operation, root, "stdout"),
      collectBoundedGitStream(process.stderr, 64 * 1024, operation, root, "stderr"),
      process.exitCode.pipe(
        Effect.map((code) => Number(code)),
        Effect.mapError((cause) => platformFailure(operation, root, cause, "GitFailed")),
      ),
    ], { concurrency: "unbounded" });
    return Object.freeze({ stdout, stderr, exitCode });
  }));
}

function collectBoundedGitStream(
  stream: Stream.Stream<Uint8Array, PlatformError>,
  maxBytes: number,
  operation: ContentWorkspaceFailure["operation"],
  root: string,
  channel: "stdout" | "stderr",
) {
  return stream.pipe(
    Stream.mapError((cause) => platformFailure(operation, root, cause, "GitFailed")),
    Stream.runFoldEffect(emptyByteAccumulator(), (state, chunk) => {
      const nextBytes = state.bytes + chunk.byteLength;
      if (nextBytes > maxBytes) {
        return fail(operation, "LimitExceeded", root, `Git ${channel} exceeds ${maxBytes} bytes`);
      }
      state.chunks.push(chunk);
      state.bytes = nextBytes;
      return Effect.succeed(state);
    }),
    Effect.map((state) => concatenateBytes(state.chunks)),
  );
}

function decodeGitOutput(
  bytes: Uint8Array,
  operation: ContentWorkspaceFailure["operation"],
  root: string,
) {
  return Effect.try({
    try: () => decoder.decode(bytes),
    catch: (cause) => failure(operation, "GitFailed", root, errorMessage(cause)),
  });
}

function gitFailureDetail(args: readonly string[], stderr: Uint8Array): string {
  try {
    return decoder.decode(stderr).trim() || `Git ${args[0] ?? "command"} failed`;
  } catch {
    return `Git ${args[0] ?? "command"} failed with non-UTF-8 stderr`;
  }
}

function concatenateBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function gitBlobId(bytes: Uint8Array, objectFormat: GitObjectFormat): string {
  const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const digest = createHash(objectFormat);
  digest.update(header);
  digest.update(bytes);
  return digest.digest("hex");
}

function fileMode(mode: ContentFileMode): number {
  return mode === "100755" ? 0o755 : 0o644;
}

function parseContentFileMode(input: string): ContentFileMode {
  if (input === "100644" || input === "100755") return input;
  throw new Error(`Unsupported content file mode: ${input}`);
}

function successfulNodeResult<A>(value: A): NodeContentWorkspaceResult<A> {
  return Object.freeze({ ok: true, value });
}

function failedNodeResult<A>(failure: ContentWorkspaceFailure): NodeContentWorkspaceResult<A> {
  return Object.freeze({ ok: false, failure });
}

function receipt(
  planDigest: string,
  readToken: string,
  outcome: ContentWorkspaceWriteReceipt["outcome"],
  changedPaths: readonly string[],
): ContentWorkspaceWriteReceipt {
  return Object.freeze({ planDigest, readToken, outcome, changedPaths: Object.freeze([...changedPaths]) });
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}

function pathsOverlap(left: string, right: string): boolean {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function mapPlatform(
  operation: ContentWorkspaceFailure["operation"],
  candidate: string,
) {
  return <A, R>(effect: Effect.Effect<A, PlatformError, R>) => effect.pipe(
    Effect.mapError((cause) => platformFailure(operation, candidate, cause)),
  );
}

function platformFailure(
  operation: ContentWorkspaceFailure["operation"],
  candidate: string,
  cause: PlatformError,
  fallback: ContentWorkspaceFailure["reason"] = "FilesystemFailed",
): ContentWorkspaceFailure {
  const missing = cause._tag === "SystemError" && cause.reason === "NotFound";
  return failure(operation, missing ? "Missing" : fallback, candidate, cause.message);
}

function invalidInput(
  operation: ContentWorkspaceFailure["operation"],
  candidate: string | undefined,
  detail: string,
): ContentWorkspaceFailure {
  return failure(operation, "InvalidInput", candidate, detail);
}

function checked<A>(
  operation: ContentWorkspaceFailure["operation"],
  evaluate: () => A,
): Effect.Effect<A, ContentWorkspaceFailure> {
  return Effect.try({
    try: evaluate,
    catch: (cause) => isContentWorkspaceFailure(cause)
      ? cause
      : failure(operation, "InvalidInput", undefined, errorMessage(cause)),
  });
}

function isContentWorkspaceFailure(input: unknown): input is ContentWorkspaceFailure {
  return typeof input === "object"
    && input !== null
    && "_tag" in input
    && input._tag === "ContentWorkspaceFailure";
}

function fail(
  operation: ContentWorkspaceFailure["operation"],
  reason: ContentWorkspaceFailure["reason"],
  candidate: string | undefined,
  detail: string,
) {
  return Effect.fail(failure(operation, reason, candidate, detail));
}

function failure(
  operation: ContentWorkspaceFailure["operation"],
  reason: ContentWorkspaceFailure["reason"],
  candidate: string | undefined,
  detail: string,
): ContentWorkspaceFailure {
  return Object.freeze({
    _tag: "ContentWorkspaceFailure",
    operation,
    reason,
    ...(candidate === undefined ? {} : { path: candidate }),
    detail,
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
