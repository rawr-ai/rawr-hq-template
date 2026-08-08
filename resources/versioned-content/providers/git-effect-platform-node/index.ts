import { NodeServices } from "@effect/platform-node";
import type {
  AncestryInput,
  MaterializedRemoteContentTree,
  MaterializeRemoteInput,
  ObserveRemoteInput,
  RemoteContentTree,
  VersionedContentFailure,
  VersionedContentFileMode,
  VersionedContentObjectFormat,
  VersionedContentResource,
  VersionedContentTreeEntry,
} from "@habitat-ai/resource-versioned-content";
import {
  AncestryInputSchema,
  MAX_VERSIONED_CONTENT_FAILURE_DETAIL,
  MaterializeRemoteInputSchema,
  ObserveRemoteInputSchema,
  VersionedContentTreeEntrySchema,
} from "@habitat-ai/resource-versioned-content";
import { Effect, Equal, FileSystem, Path, PlatformError, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import Schema from "typebox/schema";

const decoder = new TextDecoder("utf-8", { fatal: true });
const PRIVATE_GIT_PREFIX = "rawr-versioned-content-git-";
const PROCESS_FORCE_KILL_AFTER = "5 seconds";
const STDERR_LIMIT = 64 * 1_024;
const TEXT_OUTPUT_LIMIT = 1 * 1_024 * 1_024;

type ProviderRequirements =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path;
type Operation = VersionedContentFailure["operation"];

const observeRemoteInputValidator = Schema.Compile(ObserveRemoteInputSchema);
const materializeRemoteInputValidator = Schema.Compile(MaterializeRemoteInputSchema);
const ancestryInputValidator = Schema.Compile(AncestryInputSchema);
const versionedContentTreeEntryValidator = Schema.Compile(VersionedContentTreeEntrySchema);

/**
 * Provider options reserved for focused tests. Production resolution uses the
 * operator's ordinary `git` command and inherited process configuration.
 */
export interface GitEffectPlatformNodeOptions {
  readonly gitExecutable?: string;
}

interface PrivateGitRootAllocation {
  root: string;
  parent: string;
  identity?: Readonly<{
    dev: FileSystem.File.Info["dev"];
    ino: FileSystem.File.Info["ino"];
  }>;
}

interface GitCommandResult {
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
  readonly exitCode: number;
}

/**
 * Creates a Git-backed versioned-content resource over Effect platform
 * filesystem, path, and child-process services.
 */
export function makeVersionedContentResource(
  options: GitEffectPlatformNodeOptions = {}
): VersionedContentResource<ProviderRequirements> {
  const gitExecutable = options.gitExecutable ?? "git";

  const observeRemote = Effect.fn("versionedContent.observeRemote")(function* (
    input: ObserveRemoteInput
  ) {
    if (!observeRemoteInputValidator.Check(input)) {
      return yield* fail(
        "observe-remote",
        "InvalidInput",
        undefined,
        "Remote observation input does not match the bounded resource contract"
      );
    }
    return yield* withPrivateGitRepository(
      gitExecutable,
      input.repositoryIdentity,
      input.refName,
      true,
      "observe-remote",
      (root) => inspectFetchedTree(gitExecutable, root, input, "observe-remote")
    );
  });

  const materializeRemote = Effect.fn("versionedContent.materializeRemote")(function* (
    input: MaterializeRemoteInput
  ) {
    if (!materializeRemoteInputValidator.Check(input)) {
      return yield* fail(
        "materialize-remote",
        "InvalidInput",
        undefined,
        "Remote materialization input does not match the bounded resource contract"
      );
    }
    return yield* withPrivateGitRepository(
      gitExecutable,
      input.repositoryIdentity,
      input.refName,
      false,
      "materialize-remote",
      (root) =>
        Effect.gen(function* () {
          const observed = yield* inspectFetchedTree(
            gitExecutable,
            root,
            input,
            "materialize-remote"
          );
          let totalBytes = 0;
          const entries = yield* Effect.forEach(
            observed.entries,
            (entry) =>
              Effect.gen(function* () {
                const bytes = yield* gitBytes(
                  gitExecutable,
                  root,
                  ["cat-file", "blob", entry.blob],
                  "materialize-remote",
                  input.maxBytes - totalBytes
                );
                totalBytes += bytes.byteLength;
                if (totalBytes > input.maxBytes) {
                  return yield* fail(
                    "materialize-remote",
                    "LimitExceeded",
                    entry.path,
                    "Materialized tree exceeds the aggregate maxBytes bound"
                  );
                }
                return Object.freeze({ ...entry, bytes });
              }),
            { concurrency: 1 }
          );
          const materialized: MaterializedRemoteContentTree = Object.freeze({
            ...observed,
            entries: Object.freeze(entries),
          });
          return materialized;
        })
    );
  });

  const isAncestor = Effect.fn("versionedContent.isAncestor")(function* (input: AncestryInput) {
    if (!ancestryInputValidator.Check(input)) {
      return yield* fail(
        "ancestry",
        "InvalidInput",
        undefined,
        "Ancestry input does not match the bounded resource contract"
      );
    }
    if (input.ancestorCommit.length !== input.descendantCommit.length) {
      return yield* fail(
        "ancestry",
        "InvalidInput",
        undefined,
        "Ancestry commit identifiers use different Git object formats"
      );
    }
    return yield* withPrivateGitRepository(
      gitExecutable,
      input.repositoryIdentity,
      input.refName,
      true,
      "ancestry",
      (root) =>
        Effect.gen(function* () {
          const objectFormat = yield* gitObjectFormat(gitExecutable, root, "ancestry");
          if (
            !objectMatchesFormat(input.ancestorCommit, objectFormat) ||
            !objectMatchesFormat(input.descendantCommit, objectFormat)
          ) {
            return yield* fail(
              "ancestry",
              "InvalidInput",
              undefined,
              "Ancestry commit identifiers do not match the repository object format"
            );
          }
          const code = (yield* runGitCommand(
            gitExecutable,
            root,
            ["merge-base", "--is-ancestor", input.ancestorCommit, input.descendantCommit],
            "ancestry",
            STDERR_LIMIT
          )).exitCode;
          if (code === 0) return true;
          if (code === 1) return false;
          return yield* fail(
            "ancestry",
            "CommandFailed",
            root,
            `Git ancestry command exited ${code}`
          );
        })
    );
  });

  return Object.freeze({ observeRemote, materializeRemote, isAncestor });
}

/**
 * Realizes the Git provider as a ready Node resource while retaining typed
 * failures, scoped process cancellation, and guarded cleanup.
 */
export function makeNodeVersionedContentResource(
  options: GitEffectPlatformNodeOptions = {}
): VersionedContentResource<never> {
  const resource = makeVersionedContentResource(options);
  return Object.freeze({
    observeRemote: (input: ObserveRemoteInput) =>
      provideNodeServices(resource.observeRemote(input)),
    materializeRemote: (input: MaterializeRemoteInput) =>
      provideNodeServices(resource.materializeRemote(input)),
    isAncestor: (input: AncestryInput) => provideNodeServices(resource.isAncestor(input)),
  });
}

function provideNodeServices<A>(
  operation: Effect.Effect<A, VersionedContentFailure, ProviderRequirements>
): Effect.Effect<A, VersionedContentFailure> {
  return operation.pipe(Effect.provide(NodeServices.layer));
}

function inspectFetchedTree(
  gitExecutable: string,
  root: string,
  input: ObserveRemoteInput,
  operation: "observe-remote" | "materialize-remote"
): Effect.Effect<
  RemoteContentTree,
  VersionedContentFailure,
  ChildProcessSpawner.ChildProcessSpawner
> {
  return Effect.gen(function* () {
    const commit = yield* gitText(
      gitExecutable,
      root,
      ["rev-parse", "--verify", "refs/rawr/content^{commit}"],
      operation
    );
    const treeSpec =
      input.sourcePath === ""
        ? "refs/rawr/content^{tree}"
        : `refs/rawr/content:${input.sourcePath}`;
    const tree = yield* gitText(
      gitExecutable,
      root,
      ["rev-parse", "--verify", treeSpec],
      operation
    );
    const objectFormat = yield* gitObjectFormat(gitExecutable, root, operation);
    if (!objectMatchesFormat(commit, objectFormat) || !objectMatchesFormat(tree, objectFormat)) {
      return yield* fail(
        operation,
        "CommandFailed",
        root,
        "Git returned commit or tree identifiers inconsistent with its object format"
      );
    }
    const entries = yield* parseGitTree(
      yield* gitBytes(
        gitExecutable,
        root,
        ["ls-tree", "-r", "-z", "--full-tree", tree],
        operation,
        input.maxEntries * 4_200
      ),
      input.maxEntries,
      objectFormat,
      operation,
      root
    );
    const observed: RemoteContentTree = Object.freeze({
      repositoryIdentity: input.repositoryIdentity,
      refName: input.refName,
      sourcePath: input.sourcePath,
      commit,
      tree,
      objectFormat,
      entries,
    });
    return observed;
  });
}

function withPrivateGitRepository<A>(
  gitExecutable: string,
  repositoryIdentity: string,
  refName: string,
  metadataOnly: boolean,
  operation: "observe-remote" | "materialize-remote" | "ancestry",
  use: (
    root: string
  ) => Effect.Effect<A, VersionedContentFailure, ChildProcessSpawner.ChildProcessSpawner>
): Effect.Effect<A, VersionedContentFailure, ProviderRequirements> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    return yield* Effect.acquireUseRelease(
      fs.makeTempDirectory({ prefix: PRIVATE_GIT_PREFIX }).pipe(
        mapPlatform(operation, undefined),
        Effect.map(
          (root): PrivateGitRootAllocation => ({
            root,
            parent: paths.dirname(root),
          })
        )
      ),
      (allocation) =>
        Effect.uninterruptibleMask((restore) =>
          validatePrivateGitRoot(fs, paths, allocation, operation).pipe(
            Effect.andThen(
              restore(
                Effect.gen(function* () {
                  yield* gitText(
                    gitExecutable,
                    allocation.root,
                    ["init", "--bare", "."],
                    operation
                  );
                  yield* gitText(
                    gitExecutable,
                    allocation.root,
                    ["remote", "add", "content", repositoryIdentity],
                    operation
                  );
                  yield* gitText(
                    gitExecutable,
                    allocation.root,
                    [
                      "fetch",
                      "--quiet",
                      "--no-tags",
                      ...(metadataOnly ? ["--filter=blob:none"] : []),
                      "content",
                      `+${refName}:refs/rawr/content`,
                    ],
                    operation
                  );
                  return yield* use(allocation.root);
                })
              )
            )
          )
        ),
      (allocation) => removeOwnedPrivateGitRoot(fs, paths, allocation)
    );
  });
}

function validatePrivateGitRoot(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  allocation: PrivateGitRootAllocation,
  operation: "observe-remote" | "materialize-remote" | "ancestry"
): Effect.Effect<void, VersionedContentFailure> {
  return Effect.gen(function* () {
    const canonicalParent = yield* fs
      .realPath(allocation.parent)
      .pipe(mapPlatform(operation, allocation.parent));
    const canonicalRoot = yield* fs
      .realPath(allocation.root)
      .pipe(mapPlatform(operation, allocation.root));
    const identity = yield* fs.stat(canonicalRoot).pipe(mapPlatform(operation, canonicalRoot));
    allocation.root = canonicalRoot;
    allocation.parent = canonicalParent;
    allocation.identity = Object.freeze({ dev: identity.dev, ino: identity.ino });
    if (
      !paths.isAbsolute(canonicalRoot) ||
      paths.normalize(canonicalRoot) !== canonicalRoot ||
      paths.dirname(canonicalRoot) !== canonicalParent ||
      !paths.basename(canonicalRoot).startsWith(PRIVATE_GIT_PREFIX) ||
      identity.type !== "Directory"
    ) {
      return yield* fail(
        operation,
        "Aliased",
        allocation.root,
        "Private Git directory was not created at its exact owned path"
      );
    }
  });
}

function removeOwnedPrivateGitRoot(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  owned: PrivateGitRootAllocation
): Effect.Effect<void, VersionedContentFailure> {
  return Effect.gen(function* () {
    const canonicalParent = yield* fs
      .realPath(owned.parent)
      .pipe(mapPlatform("cleanup", owned.parent, "CleanupFailed"));
    const canonicalRoot = yield* fs
      .realPath(owned.root)
      .pipe(mapPlatform("cleanup", owned.root, "CleanupFailed"));
    const current = yield* fs
      .stat(owned.root)
      .pipe(mapPlatform("cleanup", owned.root, "CleanupFailed"));
    if (
      canonicalParent !== owned.parent ||
      canonicalRoot !== owned.root ||
      !paths.isAbsolute(owned.root) ||
      paths.normalize(owned.root) !== owned.root ||
      paths.dirname(owned.root) !== owned.parent ||
      !paths.basename(owned.root).startsWith(PRIVATE_GIT_PREFIX) ||
      current.type !== "Directory" ||
      (owned.identity !== undefined && current.dev !== owned.identity.dev) ||
      (owned.identity !== undefined && !Equal.equals(current.ino, owned.identity.ino))
    ) {
      return yield* fail(
        "cleanup",
        "CleanupFailed",
        owned.root,
        "Refusing cleanup of an unowned or substituted private Git directory"
      );
    }
    yield* fs
      .remove(owned.root, { recursive: true, force: false })
      .pipe(mapPlatform("cleanup", owned.root, "CleanupFailed"));
  });
}

function parseGitTree(
  bytes: Uint8Array,
  maxEntries: number,
  objectFormat: VersionedContentObjectFormat,
  operation: "observe-remote" | "materialize-remote",
  root: string
): Effect.Effect<readonly VersionedContentTreeEntry[], VersionedContentFailure> {
  return decodeGitOutput(bytes, operation, root).pipe(
    Effect.flatMap((text) => {
      const entries: VersionedContentTreeEntry[] = [];
      for (const raw of text.split("\0")) {
        if (raw.length === 0) continue;
        const match = /^(100644|100755) blob ([0-9a-f]{40}|[0-9a-f]{64})\t([^\0]+)$/u.exec(raw);
        if (
          match === null ||
          match[1] === undefined ||
          match[2] === undefined ||
          match[3] === undefined
        ) {
          return fail(
            operation,
            "UnsupportedEntry",
            root,
            "Git tree contains a non-regular, malformed, or non-canonical entry"
          );
        }
        if (!objectMatchesFormat(match[2], objectFormat)) {
          return fail(
            operation,
            "UnsupportedEntry",
            root,
            "Git tree entry identifier does not match the repository object format"
          );
        }
        const entry: VersionedContentTreeEntry = Object.freeze({
          mode: contentFileMode(match[1]),
          blob: match[2],
          path: match[3],
        });
        if (!versionedContentTreeEntryValidator.Check(entry)) {
          return fail(
            operation,
            "UnsupportedEntry",
            root,
            "Git tree entry falls outside the resource contract"
          );
        }
        entries.push(entry);
        if (entries.length > maxEntries) {
          return fail(operation, "LimitExceeded", root, "Git tree exceeds maxEntries");
        }
      }
      entries.sort((left, right) => compareText(left.path, right.path));
      for (let index = 1; index < entries.length; index += 1) {
        if (entries[index - 1]?.path === entries[index]?.path) {
          return fail(
            operation,
            "UnsupportedEntry",
            root,
            "Git tree contains duplicate regular-file paths"
          );
        }
      }
      return Effect.succeed(Object.freeze(entries));
    })
  );
}

function gitObjectFormat(
  executable: string,
  root: string,
  operation: Operation
): Effect.Effect<
  VersionedContentObjectFormat,
  VersionedContentFailure,
  ChildProcessSpawner.ChildProcessSpawner
> {
  return gitText(executable, root, ["rev-parse", "--show-object-format"], operation).pipe(
    Effect.flatMap((format) =>
      format === "sha1" || format === "sha256"
        ? Effect.succeed(format)
        : fail(
            operation,
            "CommandFailed",
            root,
            `Git reported unsupported object format ${format || "<empty>"}`
          )
    )
  );
}

function gitText(
  executable: string,
  root: string,
  args: readonly string[],
  operation: Operation
): Effect.Effect<string, VersionedContentFailure, ChildProcessSpawner.ChildProcessSpawner> {
  return runGitCommand(executable, root, args, operation, TEXT_OUTPUT_LIMIT).pipe(
    Effect.flatMap((result) =>
      result.exitCode === 0
        ? decodeGitOutput(result.stdout, operation, root)
        : fail(
            operation,
            "CommandFailed",
            root,
            gitFailureDetail(args, result.exitCode, result.stderr)
          )
    ),
    Effect.map((output) => output.trim())
  );
}

function gitBytes(
  executable: string,
  root: string,
  args: readonly string[],
  operation: Operation,
  maxBytes: number
): Effect.Effect<Uint8Array, VersionedContentFailure, ChildProcessSpawner.ChildProcessSpawner> {
  return runGitCommand(executable, root, args, operation, maxBytes).pipe(
    Effect.flatMap((result) =>
      result.exitCode === 0
        ? Effect.succeed(result.stdout)
        : fail(
            operation,
            "CommandFailed",
            root,
            gitFailureDetail(args, result.exitCode, result.stderr)
          )
    )
  );
}

function runGitCommand(
  executable: string,
  root: string,
  args: readonly string[],
  operation: Operation,
  maxStdoutBytes: number
): Effect.Effect<
  GitCommandResult,
  VersionedContentFailure,
  ChildProcessSpawner.ChildProcessSpawner
> {
  const command = ChildProcess.make(executable, args, {
    cwd: root,
    extendEnv: true,
    stdin: "ignore",
    forceKillAfter: PROCESS_FORCE_KILL_AFTER,
  });
  return Effect.scoped(
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const process = yield* spawner
        .spawn(command)
        .pipe(mapPlatform(operation, root, "CommandFailed"));
      const [stdout, stderr, exitCode] = yield* Effect.all(
        [
          collectBoundedOutput(process.stdout, maxStdoutBytes, operation, root, "stdout"),
          collectBoundedOutput(process.stderr, STDERR_LIMIT, operation, root, "stderr"),
          process.exitCode.pipe(mapPlatform(operation, root, "CommandFailed")),
        ],
        { concurrency: "unbounded" }
      );
      return Object.freeze({
        stdout,
        stderr,
        exitCode: Number(exitCode),
      });
    })
  );
}

function collectBoundedOutput(
  stream: Stream.Stream<Uint8Array, PlatformError.PlatformError>,
  maxBytes: number,
  operation: Operation,
  root: string,
  output: "stdout" | "stderr"
): Effect.Effect<Uint8Array, VersionedContentFailure> {
  type OutputState = Readonly<{
    chunks: readonly Uint8Array[];
    bytes: number;
  }>;
  const initial: OutputState = Object.freeze({
    chunks: Object.freeze([]),
    bytes: 0,
  });
  return Stream.runFoldEffect(
    stream.pipe(
      Stream.mapError((cause) => platformFailure(operation, root, cause, "CommandFailed"))
    ),
    () => initial,
    (state, chunk): Effect.Effect<OutputState, VersionedContentFailure> => {
      const bytes = state.bytes + chunk.byteLength;
      return bytes > maxBytes
        ? fail(
            operation,
            "LimitExceeded",
            root,
            `Git ${output} exceeds the ${maxBytes}-byte operation bound`
          )
        : Effect.succeed(
            Object.freeze({
              chunks: Object.freeze([...state.chunks, chunk]),
              bytes,
            })
          );
    }
  ).pipe(Effect.map((state) => concatenate(state.chunks, state.bytes)));
}

function decodeGitOutput(
  bytes: Uint8Array,
  operation: Operation,
  root: string
): Effect.Effect<string, VersionedContentFailure> {
  return Effect.try({
    try: () => decoder.decode(bytes),
    catch: () =>
      failure(
        operation,
        "CommandFailed",
        root,
        "Git returned non-UTF-8 output for a textual operation"
      ),
  });
}

function gitFailureDetail(args: readonly string[], exitCode: number, stderr: Uint8Array): string {
  let detail: string;
  try {
    detail = decoder.decode(stderr).trim();
  } catch {
    detail = "non-UTF-8 stderr";
  }
  const command = args[0] ?? "command";
  return detail.length === 0
    ? `Git ${command} exited ${exitCode}`
    : `Git ${command} exited ${exitCode}: ${detail}`;
}

function objectMatchesFormat(object: string, objectFormat: VersionedContentObjectFormat): boolean {
  return object.length === (objectFormat === "sha1" ? 40 : 64);
}

function contentFileMode(input: string): VersionedContentFileMode {
  return input === "100755" ? "100755" : "100644";
}

function concatenate(chunks: readonly Uint8Array[], length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function mapPlatform(
  operation: Operation,
  candidate: string | undefined,
  fallback: VersionedContentFailure["reason"] = "FilesystemFailed"
) {
  return <A, R>(effect: Effect.Effect<A, PlatformError.PlatformError, R>) =>
    effect.pipe(Effect.mapError((cause) => platformFailure(operation, candidate, cause, fallback)));
}

function platformFailure(
  operation: Operation,
  candidate: string | undefined,
  cause: PlatformError.PlatformError,
  fallback: VersionedContentFailure["reason"]
): VersionedContentFailure {
  const reason =
    fallback === "FilesystemFailed" && cause.reason._tag === "NotFound" ? "Missing" : fallback;
  return failure(operation, reason, candidate, cause.message);
}

function fail(
  operation: Operation,
  reason: VersionedContentFailure["reason"],
  candidate: string | undefined,
  detail: string
): Effect.Effect<never, VersionedContentFailure> {
  return Effect.fail(failure(operation, reason, candidate, detail));
}

function failure(
  operation: Operation,
  reason: VersionedContentFailure["reason"],
  candidate: string | undefined,
  detail: string
): VersionedContentFailure {
  const normalized = detail.trim() || "Versioned-content operation failed";
  const boundedDetail =
    normalized.length <= MAX_VERSIONED_CONTENT_FAILURE_DETAIL
      ? normalized
      : `${normalized.slice(0, MAX_VERSIONED_CONTENT_FAILURE_DETAIL - 3)}...`;
  const value: VersionedContentFailure = Object.freeze({
    _tag: "VersionedContentFailure",
    operation,
    reason,
    ...(candidate === undefined || candidate.length === 0 ? {} : { path: candidate }),
    detail: boundedDetail,
  });
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
