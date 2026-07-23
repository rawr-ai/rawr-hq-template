import { Command, CommandExecutor, FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect, Stream } from "effect";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";

import type {
  NativeAgentProviderFailure,
  NativeAgentProviderId,
  NativeAgentProviderOperation,
  NativeMarketplaceSource,
  NativeProviderCommandPhase,
  NativeProviderMarketplaceIdentityInput,
  NativeProviderMutationResult,
  NativeProviderPluginFileRead,
  NativeProviderPluginFileRequest,
  NativeProviderPluginFilesReadInput,
  NativeProviderPluginSelectorInput,
  NativeProviderSessionInput,
} from "../contract";
import {
  CanonicalGitRepositoryUrlSchema,
  NativeMarketplaceSourceSchema,
  NativeProviderMarketplaceIdentityInputSchema,
  NativeProviderPluginFilesReadInputSchema,
  NativeProviderPluginSelectorInputSchema,
  NativeProviderSessionInputSchema,
} from "../contract";

const MAX_PROCESS_OUTPUT_BYTES = 4 * 1_024 * 1_024;
const PROCESS_START_TIMEOUT = "10 seconds";
const PROCESS_RUN_TIMEOUT = "2 minutes";
const MAX_FAILURE_DETAIL = 4_096;
const processSemaphores = new Map<string, Effect.Semaphore>();

export type EffectPlatformNodeRequirements =
  | CommandExecutor.CommandExecutor
  | FileSystem.FileSystem
  | Path.Path;

type NativeCommandOutput = Readonly<{
  stdout: string;
  stderr: string;
}>;

export type EffectPlatformNodeProviderKernel = Readonly<{
  provider: NativeAgentProviderId;
  executablePath: string;
  home: string;
  serialized: <A, R>(
    operation: NativeAgentProviderOperation,
    effect: Effect.Effect<A, NativeAgentProviderFailure, R>
  ) => Effect.Effect<A, NativeAgentProviderFailure, R>;
  run: (
    operation: NativeAgentProviderOperation,
    args: readonly string[]
  ) => Effect.Effect<NativeCommandOutput, NativeAgentProviderFailure>;
  mutation: (
    operation: NativeAgentProviderOperation,
    args: readonly string[]
  ) => Effect.Effect<NativeProviderMutationResult, NativeAgentProviderFailure>;
  requireLocalDirectory: (
    operation: NativeAgentProviderOperation,
    candidate: string
  ) => Effect.Effect<string, NativeAgentProviderFailure>;
  readPluginEntry: (
    operation: NativeAgentProviderOperation,
    root: string,
    input: NativeProviderPluginFileRequest
  ) => Effect.Effect<NativeProviderPluginFileRead, NativeAgentProviderFailure>;
  homePath: (...segments: readonly string[]) => string;
}>;

export function acquireEffectPlatformNodeProvider(
  provider: NativeAgentProviderId,
  input: NativeProviderSessionInput
): Effect.Effect<
  EffectPlatformNodeProviderKernel,
  NativeAgentProviderFailure,
  EffectPlatformNodeRequirements
> {
  return Effect.gen(function* () {
    if (!Value.Check(NativeProviderSessionInputSchema, input)) {
      return yield* fail(
        provider,
        "acquire",
        "InvalidInput",
        "not-started",
        undefined,
        "Provider session input is invalid"
      );
    }
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const executor = yield* CommandExecutor.CommandExecutor;
    const executablePath = yield* requireCanonicalExecutable(
      fs,
      paths,
      provider,
      input.executablePath
    );
    const home = yield* requireCanonicalDirectory(fs, paths, provider, "acquire", input.home);
    const semaphore = processSemaphore(provider, home);

    const serialized: EffectPlatformNodeProviderKernel["serialized"] = (operation, effect) =>
      semaphore.withPermits(1)(
        requireCanonicalDirectory(fs, paths, provider, operation, home).pipe(Effect.andThen(effect))
      );

    const run: EffectPlatformNodeProviderKernel["run"] = (operation, args) =>
      runCommand({ provider, operation, executablePath, home, args, executor });

    const mutation: EffectPlatformNodeProviderKernel["mutation"] = (operation, args) =>
      run(operation, args).pipe(
        Effect.as(
          Object.freeze({
            provider,
            operation,
            commandPhase: "command-returned",
          }) satisfies NativeProviderMutationResult
        )
      );

    const requireLocalDirectory: EffectPlatformNodeProviderKernel["requireLocalDirectory"] = (
      operation,
      candidate
    ) => requireCanonicalDirectory(fs, paths, provider, operation, candidate);

    const readPluginEntry: EffectPlatformNodeProviderKernel["readPluginEntry"] = (
      operation,
      root,
      request
    ) => readBoundedPluginFile(fs, paths, provider, operation, home, root, request);

    return Object.freeze({
      provider,
      executablePath,
      home,
      serialized,
      run,
      mutation,
      requireLocalDirectory,
      readPluginEntry,
      homePath: (...segments: readonly string[]) => paths.join(home, ...segments),
    });
  });
}

export function requireMarketplaceSource(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  source: NativeMarketplaceSource
): Effect.Effect<NativeMarketplaceSource, NativeAgentProviderFailure> {
  return Value.Check(NativeMarketplaceSourceSchema, source)
    ? Effect.succeed(source)
    : fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        undefined,
        "Marketplace source is invalid"
      );
}

export function decodeProviderJson<const Schema extends TSchema>(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  schema: Schema,
  text: string
): Effect.Effect<Static<Schema>, NativeAgentProviderFailure> {
  return Effect.try({
    try: (): unknown => JSON.parse(text),
    catch: (cause) =>
      failure(
        provider,
        operation,
        "InvalidJson",
        "command-returned",
        undefined,
        errorMessage(cause)
      ),
  }).pipe(
    Effect.flatMap((value) =>
      Value.Check(schema, value)
        ? Effect.succeed(value)
        : fail(
            provider,
            operation,
            "ProtocolFailed",
            "command-returned",
            undefined,
            "Provider JSON did not match the expected native response schema"
          )
    )
  );
}

export function parseHelpCommands(stdout: string): readonly string[] {
  const commands = new Set<string>();
  for (const line of stdout.split(/\r?\n/u)) {
    const match = /^ {2,4}([a-z][a-z0-9-]*(?:\|[a-z][a-z0-9-]*)*)(?=\s|\[|<|$)/u.exec(line);
    if (match?.[1] === undefined) continue;
    for (const command of match[1].split("|")) commands.add(command);
  }
  return Object.freeze([...commands].sort(compareText));
}

export function requireMarketplaceIdentityInput(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  input: NativeProviderMarketplaceIdentityInput
): Effect.Effect<string, NativeAgentProviderFailure> {
  return Value.Check(NativeProviderMarketplaceIdentityInputSchema, input)
    ? Effect.succeed(input.identity)
    : fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        undefined,
        "Marketplace identity is not canonical"
      );
}

export function requirePluginSelectorInput(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  input: NativeProviderPluginSelectorInput
): Effect.Effect<string, NativeAgentProviderFailure> {
  return Value.Check(NativeProviderPluginSelectorInputSchema, input)
    ? Effect.succeed(input.selector)
    : fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        undefined,
        "Plugin selector is not canonical"
      );
}

export function requirePluginFilesReadInput(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  input: NativeProviderPluginFilesReadInput
): Effect.Effect<NativeProviderPluginFilesReadInput, NativeAgentProviderFailure> {
  return Value.Check(NativeProviderPluginFilesReadInputSchema, input)
    ? Effect.succeed(input)
    : fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        undefined,
        "Plugin file batch request is invalid"
      );
}

export function requireGitMarketplaceSource(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  repositoryUrl: string,
  revision: string,
  sparsePaths: readonly string[]
): Effect.Effect<
  Readonly<{ repositoryUrl: string; revision: string; sparsePaths: readonly string[] }>,
  NativeAgentProviderFailure
> {
  return Effect.gen(function* () {
    if (!Value.Check(CanonicalGitRepositoryUrlSchema, repositoryUrl)) {
      return yield* fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        undefined,
        "Git marketplace repositoryUrl must be a canonical HTTPS .git URL"
      );
    }
    if (!/^[^\s#]+$/u.test(revision) || revision.length > 256) {
      return yield* fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        undefined,
        "Git marketplace revision is not canonical"
      );
    }
    if (sparsePaths.length > 64) {
      return yield* fail(
        provider,
        operation,
        "LimitExceeded",
        "not-started",
        undefined,
        "Git marketplace sparse path count exceeds the resource limit"
      );
    }
    const canonicalSparsePaths = sparsePaths.map((path) => canonicalSparsePath(path));
    if (canonicalSparsePaths.some((path) => path === undefined)) {
      return yield* fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        undefined,
        "Git marketplace sparse paths must be canonical relative POSIX paths"
      );
    }
    const present = canonicalSparsePaths.filter((path): path is string => path !== undefined);
    if (new Set(present).size !== present.length) {
      return yield* fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        undefined,
        "Git marketplace sparse paths must be unique"
      );
    }
    return Object.freeze({
      repositoryUrl,
      revision,
      sparsePaths: Object.freeze([...present].sort(compareText)),
    });
  });
}

interface CommandRunInput {
  readonly provider: NativeAgentProviderId;
  readonly operation: NativeAgentProviderOperation;
  readonly executablePath: string;
  readonly home: string;
  readonly args: readonly string[];
  readonly executor: CommandExecutor.CommandExecutor;
}

function runCommand(
  input: CommandRunInput
): Effect.Effect<NativeCommandOutput, NativeAgentProviderFailure> {
  const command = Command.make(input.executablePath, ...input.args).pipe(
    Command.workingDirectory(input.home),
    Command.env(providerEnvironment(input.provider, input.home)),
    Command.feed("")
  );
  return Effect.scoped(
    input.executor.start(command).pipe(
      Effect.mapError((cause) =>
        platformFailure(
          input.provider,
          input.operation,
          input.executablePath,
          cause,
          "CommandFailed",
          "not-started"
        )
      ),
      Effect.timeoutFail({
        duration: PROCESS_START_TIMEOUT,
        onTimeout: () =>
          failure(
            input.provider,
            input.operation,
            "CommandTimedOut",
            "not-started",
            input.executablePath,
            "Provider command did not start within its bounded timeout"
          ),
      }),
      Effect.flatMap((process) =>
        Effect.all(
          [
            collectBoundedOutput(process.stdout, input.provider, input.operation, "started"),
            collectBoundedOutput(process.stderr, input.provider, input.operation, "started"),
            process.exitCode.pipe(
              Effect.mapError((cause) =>
                platformFailure(
                  input.provider,
                  input.operation,
                  input.executablePath,
                  cause,
                  "CommandFailed",
                  "started"
                )
              )
            ),
          ],
          { concurrency: "unbounded" }
        ).pipe(
          Effect.timeoutFail({
            duration: PROCESS_RUN_TIMEOUT,
            onTimeout: () =>
              failure(
                input.provider,
                input.operation,
                "CommandTimedOut",
                "started",
                input.executablePath,
                "Provider command exceeded its bounded execution timeout"
              ),
          })
        )
      ),
      Effect.flatMap(([stdout, stderr, exitCode]) =>
        Number(exitCode) === 0
          ? Effect.succeed(Object.freeze({ stdout, stderr }))
          : fail(
              input.provider,
              input.operation,
              "CommandFailed",
              "command-returned",
              input.executablePath,
              `Provider command exited ${Number(exitCode)}: ${stderr.trim() || stdout.trim()}`
            )
      )
    )
  );
}

function collectBoundedOutput(
  stream: Stream.Stream<Uint8Array, PlatformError>,
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  phase: NativeProviderCommandPhase
): Effect.Effect<string, NativeAgentProviderFailure> {
  type OutputState = Readonly<{ chunks: readonly Uint8Array[]; bytes: number }>;
  const initial: OutputState = Object.freeze({ chunks: Object.freeze([]), bytes: 0 });
  return Stream.runFoldEffect(
    stream.pipe(
      Stream.mapError((cause) =>
        platformFailure(provider, operation, undefined, cause, "CommandFailed", phase)
      )
    ),
    initial,
    (state, chunk): Effect.Effect<OutputState, NativeAgentProviderFailure> => {
      const bytes = state.bytes + chunk.byteLength;
      return bytes > MAX_PROCESS_OUTPUT_BYTES
        ? fail(
            provider,
            operation,
            "LimitExceeded",
            phase,
            undefined,
            "Provider command exceeded its bounded output limit"
          )
        : Effect.succeed(Object.freeze({ chunks: Object.freeze([...state.chunks, chunk]), bytes }));
    }
  ).pipe(
    Effect.flatMap((state) =>
      Effect.try({
        try: () => new TextDecoder("utf-8", { fatal: true }).decode(concatenate(state.chunks)),
        catch: (cause) =>
          failure(provider, operation, "ProtocolFailed", phase, undefined, errorMessage(cause)),
      })
    )
  );
}

function readBoundedPluginFile(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  home: string,
  rootInput: string,
  input: NativeProviderPluginFileRequest
): Effect.Effect<NativeProviderPluginFileRead, NativeAgentProviderFailure> {
  return Effect.gen(function* () {
    const relativePath = canonicalRelativeFile(input.relativePath);
    if (relativePath === undefined) {
      return yield* fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        input.relativePath,
        "Plugin file path must be one canonical relative POSIX file path"
      );
    }
    const root = yield* requireCanonicalDirectory(fs, paths, provider, operation, rootInput);
    if (!isContained(paths, home, root)) {
      return yield* fail(
        provider,
        operation,
        "Aliased",
        "not-started",
        root,
        "Installed plugin root escaped the explicit provider home"
      );
    }
    const candidate = paths.join(root, ...relativePath.split("/"));
    if (!isContained(paths, root, candidate)) {
      return yield* fail(
        provider,
        operation,
        "Aliased",
        "not-started",
        candidate,
        "Plugin file path escaped its installed package root"
      );
    }
    const resolved = yield* fs
      .realPath(candidate)
      .pipe(mapPlatform(provider, operation, candidate, "not-started"));
    if (resolved !== candidate) {
      return yield* fail(
        provider,
        operation,
        "Aliased",
        "not-started",
        candidate,
        "Plugin file path is aliased"
      );
    }
    const status = yield* fs
      .stat(candidate)
      .pipe(mapPlatform(provider, operation, candidate, "not-started"));
    const size = Number(status.size);
    if (status.type !== "File") {
      return yield* fail(
        provider,
        operation,
        "UnsupportedEntry",
        "not-started",
        candidate,
        "Plugin package entry is not a regular file"
      );
    }
    if (!Number.isSafeInteger(size) || size < 0 || size > input.maxBytes) {
      return yield* fail(
        provider,
        operation,
        "LimitExceeded",
        "not-started",
        candidate,
        "Plugin package file exceeds maxBytes"
      );
    }
    const bytes = yield* fs
      .readFile(candidate)
      .pipe(mapPlatform(provider, operation, candidate, "not-started"));
    if (bytes.byteLength !== size) {
      return yield* fail(
        provider,
        operation,
        "FilesystemFailed",
        "not-started",
        candidate,
        "Plugin package file size changed while reading"
      );
    }
    return Object.freeze({
      kind: "Read",
      relativePath,
      byteLength: bytes.byteLength,
      contentBase64: Buffer.from(bytes).toString("base64"),
    });
  });
}

function requireCanonicalExecutable(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  provider: NativeAgentProviderId,
  candidate: string
): Effect.Effect<string, NativeAgentProviderFailure> {
  return Effect.gen(function* () {
    if (!isCanonicalAbsolutePath(paths, candidate)) {
      return yield* fail(
        provider,
        "acquire",
        "InvalidInput",
        "not-started",
        candidate,
        "Provider executable must be an explicit canonical absolute path"
      );
    }
    const resolved = yield* fs
      .realPath(candidate)
      .pipe(mapPlatform(provider, "acquire", candidate, "not-started"));
    if (resolved !== candidate) {
      return yield* fail(
        provider,
        "acquire",
        "Aliased",
        "not-started",
        candidate,
        "Provider executable path is aliased"
      );
    }
    const status = yield* fs
      .stat(candidate)
      .pipe(mapPlatform(provider, "acquire", candidate, "not-started"));
    if (status.type !== "File" || (status.mode & 0o111) === 0) {
      return yield* fail(
        provider,
        "acquire",
        "UnsupportedEntry",
        "not-started",
        candidate,
        "Provider executable must be one executable regular file"
      );
    }
    return candidate;
  });
}

function requireCanonicalDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  candidate: string
): Effect.Effect<string, NativeAgentProviderFailure> {
  return Effect.gen(function* () {
    if (!isCanonicalAbsolutePath(paths, candidate)) {
      return yield* fail(
        provider,
        operation,
        "InvalidInput",
        "not-started",
        candidate,
        "Directory must be an explicit canonical absolute path"
      );
    }
    const resolved = yield* fs
      .realPath(candidate)
      .pipe(mapPlatform(provider, operation, candidate, "not-started"));
    if (resolved !== candidate) {
      return yield* fail(
        provider,
        operation,
        "Aliased",
        "not-started",
        candidate,
        "Directory path is aliased"
      );
    }
    const status = yield* fs
      .stat(candidate)
      .pipe(mapPlatform(provider, operation, candidate, "not-started"));
    if (status.type !== "Directory") {
      return yield* fail(
        provider,
        operation,
        "UnsupportedEntry",
        "not-started",
        candidate,
        "Path must be one existing directory"
      );
    }
    return candidate;
  });
}

function canonicalSparsePath(input: string): string | undefined {
  if (input.length === 0 || input.length > 1_024 || input.includes("\\") || input.startsWith("/")) {
    return undefined;
  }
  const segments = input.split("/");
  return segments.some((segment) => segment === "" || segment === "." || segment === "..")
    ? undefined
    : segments.join("/");
}

function canonicalRelativeFile(input: string): string | undefined {
  return canonicalSparsePath(input);
}

function isCanonicalAbsolutePath(paths: Path.Path, candidate: string): boolean {
  return (
    candidate.length <= 16_384 &&
    paths.isAbsolute(candidate) &&
    paths.normalize(candidate) === candidate &&
    candidate !== paths.parse(candidate).root
  );
}

function isContained(paths: Path.Path, root: string, candidate: string): boolean {
  const relative = paths.relative(root, candidate);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${paths.sep}`) &&
    !paths.isAbsolute(relative)
  );
}

function providerEnvironment(
  provider: NativeAgentProviderId,
  home: string
): Record<string, string | undefined> {
  return provider === "codex"
    ? { HOME: home, CODEX_HOME: home }
    : { HOME: home, CLAUDE_CONFIG_DIR: home };
}

function processSemaphore(provider: NativeAgentProviderId, home: string): Effect.Semaphore {
  const key = `${provider}\u0000${home}`;
  const existing = processSemaphores.get(key);
  if (existing !== undefined) return existing;
  const created = Effect.runSync(Effect.makeSemaphore(1));
  processSemaphores.set(key, created);
  return created;
}

function concatenate(chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function mapPlatform(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  candidate: string | undefined,
  phase: NativeProviderCommandPhase,
  fallback: NativeAgentProviderFailure["reason"] = "FilesystemFailed"
) {
  return <A, R>(effect: Effect.Effect<A, PlatformError, R>) =>
    effect.pipe(
      Effect.mapError((cause) =>
        platformFailure(provider, operation, candidate, cause, fallback, phase)
      )
    );
}

function platformFailure(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  candidate: string | undefined,
  cause: PlatformError,
  fallback: NativeAgentProviderFailure["reason"],
  phase: NativeProviderCommandPhase
): NativeAgentProviderFailure {
  const missing = cause._tag === "SystemError" && cause.reason === "NotFound";
  return failure(
    provider,
    operation,
    missing ? "Missing" : fallback,
    phase,
    candidate,
    cause.message
  );
}

function fail(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  reason: NativeAgentProviderFailure["reason"],
  phase: NativeProviderCommandPhase,
  candidate: string | undefined,
  detail: string
) {
  return Effect.fail(failure(provider, operation, reason, phase, candidate, detail));
}

function failure(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  reason: NativeAgentProviderFailure["reason"],
  commandPhase: NativeProviderCommandPhase,
  candidate: string | undefined,
  detail: string
): NativeAgentProviderFailure {
  return Object.freeze({
    _tag: "NativeAgentProviderFailure",
    provider,
    operation,
    reason,
    commandPhase,
    ...(candidate === undefined ? {} : { path: candidate }),
    detail: detail.slice(0, MAX_FAILURE_DETAIL),
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
