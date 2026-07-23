import { lstat, mkdir, readdir, readlink, realpath, rename, writeFile } from "node:fs/promises";
import { dirname, join, posix, resolve } from "node:path";
import { Effect } from "effect";
import type { CommandPolicy, DigestIdentity } from "../../contracts/index.js";
import type { CommandProcessShape, CommandResult } from "../../runtime/command.js";
import type {
  ExactGitRevision,
  GitCanonicalization,
  GitPatchSubstrateIdentity,
} from "./contracts.js";
import {
  type GitBunError,
  identityMismatch,
  invalidInput,
  isAtOrBelow,
  isGitBunError,
  operationFailed,
  runChecked as runCommandChecked,
  sha256Portable,
  stableJson,
} from "./internal.js";

const strictTextDecoder = new TextDecoder("utf-8", { fatal: true });

const canonicalEnvironment = {
  GIT_ATTR_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "<adapter-owned-empty-config>",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_LITERAL_PATHSPECS: "1",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_PAGER: "cat",
  GIT_TERMINAL_PROMPT: "0",
  HOME: "<adapter-owned-home>",
  LANG: "C",
  LC_ALL: "C",
  PAGER: "cat",
  TMPDIR: "<adapter-owned-tmp>",
  TZ: "UTC",
} as const;

const canonicalDiffArguments = [
  "--binary",
  "--full-index",
  "--no-ext-diff",
  "--no-textconv",
  "--no-renames",
  "--src-prefix=a/",
  "--dst-prefix=b/",
  "--diff-algorithm=myers",
  "--no-indent-heuristic",
  "--no-color",
] as const;

const canonicalInfoAttributes =
  "* !text !eol !working-tree-encoding !ident !filter !diff !merge !export-ignore !export-subst\n" +
  "**/* !text !eol !working-tree-encoding !ident !filter !diff !merge !export-ignore !export-subst\n";

export const canonicalGitCanonicalization: GitCanonicalization = freezeGitCanonicalization({
  environment: Object.entries(canonicalEnvironment).map(([name, value]) => ({ name, value })),
  configuration: [
    { name: "core.quotePath", value: "true" },
    { name: "core.autocrlf", value: "false" },
    { name: "core.fileMode", value: "true" },
    { name: "core.symlinks", value: "true" },
    { name: "core.ignoreCase", value: "false" },
    { name: "core.precomposeUnicode", value: "false" },
    { name: "core.attributesFile", value: "<adapter-owned-empty-attributes>" },
    { name: "color.ui", value: "false" },
  ],
  attributesPolicy: canonicalInfoAttributes,
  stageArguments: ["add", "-A", "-f"],
  diffArguments: [...canonicalDiffArguments],
  applyArguments: ["apply", "--index", "--binary", "--whitespace=nowarn", "-"],
});

function freezeGitCanonicalization(value: GitCanonicalization): GitCanonicalization {
  for (const setting of [...value.environment, ...value.configuration]) {
    Object.freeze(setting);
  }
  Object.freeze(value.environment);
  Object.freeze(value.configuration);
  Object.freeze(value.stageArguments);
  Object.freeze(value.diffArguments);
  Object.freeze(value.applyArguments);
  return Object.freeze(value);
}

export interface CommandContext {
  readonly process: CommandProcessShape;
  readonly policy: CommandPolicy;
}

export interface OwnedRepository {
  readonly gitDirectory: string;
  readonly indexPath: string;
  readonly emptyConfigPath: string;
  readonly emptyAttributesPath: string;
}

export interface OwnedGitContext {
  readonly runner: CommandContext;
  readonly substrate: GitPatchSubstrateIdentity;
  readonly repository: OwnedRepository;
  readonly worktree: string;
}

export function ownedGitContext(
  runner: CommandContext,
  substrate: GitPatchSubstrateIdentity,
  repository: OwnedRepository,
  worktree: string
): OwnedGitContext {
  return { repository, runner, substrate, worktree };
}

export function repositoryRevisionIdentity(input: {
  readonly commitObjectId: string;
  readonly objectFormat: "sha1" | "sha256";
  readonly rootTreeObjectId: string;
}): DigestIdentity {
  return sha256Portable("research-sdk.git-repository-revision.v1", input);
}

export function trySynchronous<Value>(
  operation: string,
  evaluate: () => Value
): Effect.Effect<Value, GitBunError> {
  return Effect.try({
    try: evaluate,
    catch: (error) => normalizeGitBunError(operation, error),
  });
}

function tryFileSystem<Value>(
  operation: string,
  evaluate: () => Promise<Value>
): Effect.Effect<Value, GitBunError> {
  return Effect.uninterruptible(
    Effect.tryPromise({
      try: evaluate,
      catch: (error) => normalizeGitBunError(operation, error),
    })
  );
}

function normalizeGitBunError(operation: string, error: unknown): GitBunError {
  return isGitBunError(error) ? error : operationFailed(operation, error);
}

export function preflightToolchain(
  runner: CommandContext,
  substrate: GitPatchSubstrateIdentity
): Effect.Effect<void, GitBunError> {
  return Effect.gen(function* () {
    yield* trySynchronous("preflight", () => {
      if (stableJson(substrate.canonicalization) !== stableJson(canonicalGitCanonicalization)) {
        throw identityMismatch("preflight", "Git canonicalization settings differ.");
      }
      requireEqualDigest(
        substrate.environmentDigest,
        sha256Portable("research-sdk.git-environment.v1", canonicalGitCanonicalization.environment),
        "preflight",
        "Git environment"
      );
      requireEqualDigest(
        substrate.configurationDigest,
        sha256Portable("research-sdk.git-configuration.v1", {
          applyArguments: canonicalGitCanonicalization.applyArguments,
          attributesPolicy: canonicalGitCanonicalization.attributesPolicy,
          configuration: canonicalGitCanonicalization.configuration,
          diffArguments: canonicalGitCanonicalization.diffArguments,
          stageArguments: canonicalGitCanonicalization.stageArguments,
        }),
        "preflight",
        "Git configuration"
      );
    });
    yield* requireResolvedBinary(substrate.git.resolvedBinary, "Git");

    const gitVersion = yield* runCommandChecked(
      runner.process,
      {
        executable: substrate.git.resolvedBinary,
        arguments: ["--version"],
        cwd: process.cwd(),
        environment: gitEnvironment("/dev/null"),
        terminationGraceMs: runner.policy.terminationGraceMs,
        timeoutMs: runner.policy.timeoutMs,
      },
      "gitVersion"
    );
    const gitVersionMatch = yield* trySynchronous("gitVersion", () =>
      /^git version ([^\s]+)/u.exec(decodeGitText(gitVersion.stdout, "gitVersion"))
    );
    if (gitVersionMatch?.[1] !== substrate.git.version) {
      return yield* Effect.fail(
        identityMismatch(
          "preflight",
          `Resolved Git reports ${gitVersionMatch?.[1] ?? "an invalid version"}; expected ${substrate.git.version}.`
        )
      );
    }
    if (!isSupportedGitVersion(substrate.git.version)) {
      return yield* Effect.fail(invalidInput("preflight", "Git 2.48 or newer is required."));
    }
  });
}

export function verifySourceRevision(
  runner: CommandContext,
  substrate: GitPatchSubstrateIdentity,
  sourcePath: string,
  revision: ExactGitRevision
): Effect.Effect<string, GitBunError> {
  return Effect.gen(function* () {
    const root = yield* requireDirectory(sourcePath, "verifySourceRevision");
    const commit = yield* readGitText(
      runner,
      substrate,
      root,
      "/dev/null",
      [
        "-C",
        root,
        "rev-parse",
        "--verify",
        "--end-of-options",
        `${revision.commitObjectId}^{commit}`,
      ],
      "verifySourceCommit"
    );
    if (commit !== revision.commitObjectId) {
      return yield* Effect.fail(
        identityMismatch("verifySourceRevision", "The source commit identity differs.")
      );
    }
    const treeExpression =
      revision.subtree === undefined
        ? `${revision.commitObjectId}^{tree}`
        : `${revision.commitObjectId}:${revision.subtree}`;
    const tree = yield* readGitText(
      runner,
      substrate,
      root,
      "/dev/null",
      ["-C", root, "rev-parse", "--verify", "--end-of-options", treeExpression],
      "verifySourceTree"
    );
    if (tree !== revision.selectedTreeObjectId) {
      return yield* Effect.fail(
        identityMismatch("verifySourceRevision", "The selected source tree identity differs.")
      );
    }
    const rootTree = yield* readGitText(
      runner,
      substrate,
      root,
      "/dev/null",
      [
        "-C",
        root,
        "rev-parse",
        "--verify",
        "--end-of-options",
        `${revision.commitObjectId}^{tree}`,
      ],
      "verifySourceRootTree"
    );
    if (rootTree !== revision.rootTreeObjectId) {
      return yield* Effect.fail(
        identityMismatch("verifySourceRevision", "The root source tree identity differs.")
      );
    }
    const format = yield* readGitText(
      runner,
      substrate,
      root,
      "/dev/null",
      ["-C", root, "rev-parse", "--show-object-format"],
      "sourceObjectFormat"
    );
    if (format !== "sha1" && format !== "sha256") {
      return yield* Effect.fail(
        invalidInput("verifySourceRevision", `Unsupported Git object format: ${format}`)
      );
    }
    if (format !== revision.objectFormat) {
      return yield* Effect.fail(
        identityMismatch("verifySourceRevision", "The source object format differs.")
      );
    }
    yield* trySynchronous("verifySourceRevision", () =>
      requireEqualDigest(
        revision.repositoryIdentity,
        repositoryRevisionIdentity({
          commitObjectId: revision.commitObjectId,
          objectFormat: revision.objectFormat,
          rootTreeObjectId: revision.rootTreeObjectId,
        }),
        "verifySourceRevision",
        "repository revision"
      )
    );
    return root;
  });
}

export function prepareOwnedRepository(
  runner: CommandContext,
  substrate: GitPatchSubstrateIdentity,
  controlRoot: string,
  sourceRoot: string,
  revision: ExactGitRevision
): Effect.Effect<OwnedRepository, GitBunError> {
  return Effect.gen(function* () {
    yield* ensureEmptyDirectory(controlRoot, "prepareOwnedRepository");
    const emptyConfigPath = join(controlRoot, "empty.gitconfig");
    const emptyAttributesPath = join(controlRoot, "empty.gitattributes");
    const gitDirectory = join(controlRoot, "repository.git");
    const indexPath = join(controlRoot, "index");
    yield* tryFileSystem("prepareOwnedRepository", async () => {
      await mkdir(join(controlRoot, "home"), { recursive: true });
      await mkdir(join(controlRoot, "tmp"), { recursive: true });
      await writeFile(emptyConfigPath, "", { flag: "wx" });
      await writeFile(emptyAttributesPath, "", { flag: "wx" });
    });
    yield* runGitChecked(
      runner,
      substrate,
      controlRoot,
      emptyConfigPath,
      emptyAttributesPath,
      ["init", "--bare", `--object-format=${revision.objectFormat}`, gitDirectory],
      "initializeOwnedRepository"
    );
    yield* tryFileSystem("prepareOwnedRepository", async () => {
      await mkdir(join(gitDirectory, "info"), { recursive: true });
      await writeFile(join(gitDirectory, "info", "attributes"), canonicalInfoAttributes, {
        flag: "wx",
      });
    });

    const owned = {
      emptyAttributesPath,
      emptyConfigPath,
      gitDirectory,
      indexPath,
    } satisfies OwnedRepository;
    yield* runOwnedGitCheckedAt(
      runner,
      substrate,
      owned,
      controlRoot,
      undefined,
      ["fetch", "--no-tags", "--no-write-fetch-head", sourceRoot, revision.commitObjectId],
      "fetchExactRevision"
    );
    const commit = yield* readOwnedGitTextAt(
      runner,
      substrate,
      owned,
      controlRoot,
      undefined,
      ["rev-parse", "--verify", "--end-of-options", `${revision.commitObjectId}^{commit}`],
      "verifyFetchedCommit"
    );
    if (commit !== revision.commitObjectId) {
      return yield* Effect.fail(
        identityMismatch("prepareOwnedRepository", "Fetched commit identity differs.")
      );
    }
    return owned;
  });
}

export function materializeOwnedRevision(
  context: OwnedGitContext,
  revision: ExactGitRevision
): Effect.Effect<void, GitBunError> {
  return Effect.gen(function* () {
    yield* ensureEmptyDirectory(context.worktree, "materializeRevision");
    yield* runOwnedGitCheckedAt(
      context.runner,
      context.substrate,
      context.repository,
      context.worktree,
      context.worktree,
      ["read-tree", "--reset", revision.selectedTreeObjectId],
      "loadMaterializationIndex"
    );
    yield* runOwnedGitCheckedAt(
      context.runner,
      context.substrate,
      context.repository,
      context.worktree,
      context.worktree,
      ["checkout-index", "--all", "--force"],
      "checkoutMaterializedRevision"
    );
    yield* validateProductTree(context.worktree, "materializeRevision");
  });
}

export function validateProductTree(
  root: string,
  operation: "capturePatch" | "materializeRevision"
): Effect.Effect<void, GitBunError> {
  return tryFileSystem(operation, async () => {
    const canonicalRoot = await realpath(root);
    const walk = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory)) {
        if (entry === ".git") {
          throw identityMismatch(operation, "Git metadata is not materialized.");
        }
        const path = join(directory, entry);
        const stat = await lstat(path);
        if (stat.isDirectory()) {
          await walk(path);
        } else if (stat.isSymbolicLink()) {
          const target = await readlink(path);
          const resolvedTarget = resolve(dirname(path), target);
          if (!isAtOrBelow(resolvedTarget, canonicalRoot)) {
            throw identityMismatch(
              operation,
              `Archive symlink escapes the materialized tree: ${path}`
            );
          }
        } else if (!stat.isFile()) {
          throw identityMismatch(operation, `Archive contains an unsupported entry type: ${path}`);
        }
      }
    };
    await walk(canonicalRoot);
  });
}

export function preparePublicationPath(
  path: string,
  operation: "applyAndRegenerate" | "materializeRevision"
): Effect.Effect<string, GitBunError> {
  return tryFileSystem(operation, async () => {
    const parent = await realpath(dirname(path));
    const canonical = join(parent, posix.basename(path));
    if (resolve(path) !== path || canonical !== path) {
      throw invalidInput(operation, "The product destination is not a canonical path.");
    }
    await requireAbsentPath(path, operation);
    return path;
  });
}

export function publishDirectory(
  stagedPath: string,
  destinationPath: string,
  operation: "applyAndRegenerate" | "materializeRevision"
): Effect.Effect<void, GitBunError> {
  return tryFileSystem(operation, async () => {
    await requireAbsentPath(destinationPath, operation);
    await rename(stagedPath, destinationPath);
  });
}

async function requireAbsentPath(path: string, operation: string): Promise<void> {
  try {
    await lstat(path);
  } catch (error) {
    if (error !== null && typeof error === "object" && Reflect.get(error, "code") === "ENOENT") {
      return;
    }
    throw error;
  }
  throw invalidInput(operation, "The product destination already exists.");
}

function ensureEmptyDirectory(path: string, operation: string): Effect.Effect<void, GitBunError> {
  return tryFileSystem(operation, async () => {
    await mkdir(path, { recursive: true });
    if ((await readdir(path)).length !== 0) {
      throw invalidInput(operation, "The adapter-owned directory must be empty.");
    }
  });
}

export function requireDirectory(
  path: string,
  operation: string
): Effect.Effect<string, GitBunError> {
  return Effect.tryPromise({
    try: async () => {
      const canonical = await realpath(path);
      const stat = await lstat(canonical);
      if (!stat.isDirectory()) {
        throw invalidInput(operation, "The requested path is not a directory.");
      }
      return canonical;
    },
    catch: (error) =>
      isGitBunError(error)
        ? error
        : invalidInput(operation, "The requested directory is unavailable."),
  });
}

function requireResolvedBinary(path: string, label: string): Effect.Effect<void, GitBunError> {
  return Effect.tryPromise({
    try: async () => {
      if ((await realpath(path)) !== path) {
        throw identityMismatch("preflight", `${label} binary is not the exact resolved path.`);
      }
    },
    catch: (error) =>
      isGitBunError(error) ? error : invalidInput("preflight", `${label} binary is unavailable.`),
  });
}

function gitEnvironment(
  emptyConfigPath: string,
  owned?: OwnedRepository,
  worktree?: string,
  commandRoot = dirname(emptyConfigPath)
): Record<string, string> {
  const controlRoot = emptyConfigPath === "/dev/null" ? commandRoot : dirname(emptyConfigPath);
  const substitutions: Readonly<Record<string, string>> = {
    "<adapter-owned-empty-config>": emptyConfigPath,
    "<adapter-owned-home>":
      emptyConfigPath === "/dev/null" ? controlRoot : join(controlRoot, "home"),
    "<adapter-owned-tmp>": emptyConfigPath === "/dev/null" ? controlRoot : join(controlRoot, "tmp"),
  };
  const environment: Record<string, string> = Object.fromEntries(
    canonicalGitCanonicalization.environment.map(({ name, value }) => [
      name,
      substitutions[value] ?? value,
    ])
  );
  if (owned !== undefined) {
    environment.GIT_DIR = owned.gitDirectory;
    environment.GIT_INDEX_FILE = owned.indexPath;
  }
  if (worktree !== undefined) {
    environment.GIT_WORK_TREE = worktree;
  }
  return environment;
}

function gitConfigArguments(emptyAttributesPath: string): string[] {
  return canonicalGitCanonicalization.configuration.flatMap(({ name, value }) => [
    "-c",
    `${name}=${value === "<adapter-owned-empty-attributes>" ? emptyAttributesPath : value}`,
  ]);
}

function readGitText(
  runner: CommandContext,
  substrate: GitPatchSubstrateIdentity,
  cwd: string,
  emptyConfigPath: string,
  arguments_: readonly string[],
  operation: string
): Effect.Effect<string, GitBunError> {
  return Effect.flatMap(
    runGitChecked(runner, substrate, cwd, emptyConfigPath, "/dev/null", arguments_, operation),
    (result) => trySynchronous(operation, () => decodeGitText(result.stdout, operation).trim())
  );
}

function readOwnedGitTextAt(
  runner: CommandContext,
  substrate: GitPatchSubstrateIdentity,
  owned: OwnedRepository,
  cwd: string,
  worktree: string | undefined,
  arguments_: readonly string[],
  operation: string
): Effect.Effect<string, GitBunError> {
  return Effect.flatMap(
    runOwnedGitCheckedAt(runner, substrate, owned, cwd, worktree, arguments_, operation),
    (result) => trySynchronous(operation, () => decodeGitText(result.stdout, operation).trim())
  );
}

function runGitChecked(
  runner: CommandContext,
  substrate: GitPatchSubstrateIdentity,
  cwd: string,
  emptyConfigPath: string,
  emptyAttributesPath: string,
  arguments_: readonly string[],
  operation: string,
  stdin?: Uint8Array
): Effect.Effect<CommandResult, GitBunError> {
  return runCommandChecked(
    runner.process,
    {
      executable: substrate.git.resolvedBinary,
      arguments: [...gitConfigArguments(emptyAttributesPath), ...arguments_],
      cwd,
      environment: gitEnvironment(emptyConfigPath, undefined, undefined, cwd),
      terminationGraceMs: runner.policy.terminationGraceMs,
      timeoutMs: runner.policy.timeoutMs,
      ...(stdin === undefined ? {} : { stdin }),
    },
    operation
  );
}

function runOwnedGitCheckedAt(
  runner: CommandContext,
  substrate: GitPatchSubstrateIdentity,
  owned: OwnedRepository,
  cwd: string,
  worktree: string | undefined,
  arguments_: readonly string[],
  operation: string,
  stdin?: Uint8Array
): Effect.Effect<CommandResult, GitBunError> {
  return runCommandChecked(
    runner.process,
    {
      executable: substrate.git.resolvedBinary,
      arguments: [...gitConfigArguments(owned.emptyAttributesPath), ...arguments_],
      cwd,
      environment: gitEnvironment(owned.emptyConfigPath, owned, worktree),
      terminationGraceMs: runner.policy.terminationGraceMs,
      timeoutMs: runner.policy.timeoutMs,
      ...(stdin === undefined ? {} : { stdin }),
    },
    operation
  );
}

export function readOwnedGitText(
  context: OwnedGitContext,
  arguments_: readonly string[],
  operation: string
): Effect.Effect<string, GitBunError> {
  return readOwnedGitTextAt(
    context.runner,
    context.substrate,
    context.repository,
    context.worktree,
    context.worktree,
    arguments_,
    operation
  );
}

export function runOwnedGitChecked(
  context: OwnedGitContext,
  arguments_: readonly string[],
  operation: string,
  stdin?: Uint8Array
): Effect.Effect<CommandResult, GitBunError> {
  return runOwnedGitCheckedAt(
    context.runner,
    context.substrate,
    context.repository,
    context.worktree,
    context.worktree,
    arguments_,
    operation,
    stdin
  );
}

export function requireEqualDigest(
  left: DigestIdentity,
  right: DigestIdentity,
  operation: string,
  label: string
): void {
  if (
    left.algorithm !== right.algorithm ||
    left.preimageKind !== right.preimageKind ||
    left.value !== right.value
  ) {
    throw identityMismatch(operation, `${label} digest differs.`);
  }
}

export function decodeGitText(bytes: Uint8Array, operation: string): string {
  try {
    return strictTextDecoder.decode(bytes);
  } catch {
    throw identityMismatch(operation, "Git emitted non-UTF-8 structural output.");
  }
}

function isSupportedGitVersion(version: string): boolean {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?/u.exec(version);
  if (match === null) {
    return false;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 2 || (major === 2 && minor >= 48);
}
