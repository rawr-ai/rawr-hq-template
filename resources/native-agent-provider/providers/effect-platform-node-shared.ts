import { Command, CommandExecutor, FileSystem, Path } from "@effect/platform";
import type { PlatformError } from "@effect/platform/Error";
import { Effect, Queue, Stream } from "effect";

import type {
  NativeAgentProviderFailure,
  NativeAgentProviderId,
  NativeAgentProviderOperation,
  NativeProviderCommandResult,
  NativeProviderJsonObservation,
  NativeProviderJsonValue,
  NativeProviderPackageObservation,
  NativeProviderPackageReadInput,
  NativeProviderSessionInput,
} from "../contract";

const MAX_PROCESS_OUTPUT_BYTES = 4 * 1024 * 1024;
const PROCESS_TIMEOUT = "30 seconds";
const APP_SERVER_TIMEOUT = "20 seconds";

export type EffectPlatformNodeRequirements =
  | CommandExecutor.CommandExecutor
  | FileSystem.FileSystem
  | Path.Path;

export interface EffectPlatformNodeProviderKernel {
  readonly provider: NativeAgentProviderId;
  readonly executablePath: string;
  readonly home: string;
  readonly run: (
    operation: NativeAgentProviderOperation,
    args: readonly string[],
    stdin?: string,
  ) => Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure>;
  readonly runCodexAppServer: (
    operation: NativeAgentProviderOperation,
    requests: readonly CodexAppServerRequest[],
  ) => Effect.Effect<readonly NativeProviderJsonValue[], NativeAgentProviderFailure>;
  readonly readPackage: (
    input: NativeProviderPackageReadInput,
  ) => Effect.Effect<NativeProviderPackageObservation, NativeAgentProviderFailure>;
  readonly readHomeJsonFile: (
    relativePath: string,
    maxBytes: number,
  ) => Effect.Effect<NativeProviderJsonValue | null, NativeAgentProviderFailure>;
  readonly requireCanonicalDirectory: (
    operation: NativeAgentProviderOperation,
    candidate: string,
  ) => Effect.Effect<string, NativeAgentProviderFailure>;
}

export interface CodexAppServerRequest {
  readonly method: string;
  readonly params: NativeProviderJsonValue;
}

export function acquireEffectPlatformNodeProvider(
  provider: NativeAgentProviderId,
  input: NativeProviderSessionInput,
): Effect.Effect<
  EffectPlatformNodeProviderKernel,
  NativeAgentProviderFailure,
  EffectPlatformNodeRequirements
> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const executor = yield* CommandExecutor.CommandExecutor;
    const executablePath = yield* requireCanonicalExecutable(fs, paths, provider, input.executablePath);
    const home = yield* requireCanonicalDirectory(fs, paths, provider, "acquire", input.home, false);
    const commandMutex = yield* Effect.makeSemaphore(1);

    const run: EffectPlatformNodeProviderKernel["run"] = (operation, args, stdin = "") =>
      commandMutex.withPermits(1)(runCommand({
        provider,
        operation,
        executablePath,
        home,
        args,
        stdin,
        executor,
      }));

    const runCodexAppServer: EffectPlatformNodeProviderKernel["runCodexAppServer"] = (operation, requests) =>
      commandMutex.withPermits(1)(runCodexAppServerProcess({
        provider,
        operation,
        executablePath,
        home,
        requests,
        executor,
      }));

    const readPackage: EffectPlatformNodeProviderKernel["readPackage"] = (packageInput) =>
      readProviderPackage(fs, paths, provider, home, packageInput);

    const readHomeJsonFile: EffectPlatformNodeProviderKernel["readHomeJsonFile"] = (relativePath, maxBytes) =>
      readOptionalHomeJsonFile(fs, paths, provider, home, relativePath, maxBytes);

    const requireDirectory: EffectPlatformNodeProviderKernel["requireCanonicalDirectory"] = (operation, candidate) =>
      requireCanonicalDirectory(fs, paths, provider, operation, candidate, false);

    return Object.freeze({
      provider,
      executablePath,
      home,
      run,
      runCodexAppServer,
      readPackage,
      readHomeJsonFile,
      requireCanonicalDirectory: requireDirectory,
    });
  });
}

export function parseJsonObservation(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  result: NativeProviderCommandResult,
): Effect.Effect<NativeProviderJsonObservation, NativeAgentProviderFailure> {
  return decodeJson(provider, operation, result.stdout).pipe(
    Effect.map((json) => Object.freeze({ ...result, json })),
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

export function requireMarketplaceIdentity(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  identity: string,
): Effect.Effect<string, NativeAgentProviderFailure> {
  return /^[a-z0-9][a-z0-9_-]*$/u.test(identity)
    ? Effect.succeed(identity)
    : fail(provider, operation, "InvalidInput", undefined, "Marketplace identity is not canonical");
}

export function requirePluginSelector(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  selector: string,
): Effect.Effect<string, NativeAgentProviderFailure> {
  return /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9_-]*$/u.test(selector)
    ? Effect.succeed(selector)
    : fail(provider, operation, "InvalidInput", undefined, "Plugin selector is not canonical");
}

export function runCodexAppServerRequests(
  kernel: EffectPlatformNodeProviderKernel,
  operation: NativeAgentProviderOperation,
  requests: readonly Readonly<{ method: string; params: NativeProviderJsonValue }>[],
): Effect.Effect<readonly NativeProviderJsonValue[], NativeAgentProviderFailure> {
  return kernel.runCodexAppServer(operation, requests);
}

interface CommandRunInput {
  readonly provider: NativeAgentProviderId;
  readonly operation: NativeAgentProviderOperation;
  readonly executablePath: string;
  readonly home: string;
  readonly args: readonly string[];
  readonly stdin: string;
  readonly executor: CommandExecutor.CommandExecutor;
}

interface CodexAppServerRunInput {
  readonly provider: NativeAgentProviderId;
  readonly operation: NativeAgentProviderOperation;
  readonly executablePath: string;
  readonly home: string;
  readonly requests: readonly CodexAppServerRequest[];
  readonly executor: CommandExecutor.CommandExecutor;
}

function runCommand(input: CommandRunInput): Effect.Effect<NativeProviderCommandResult, NativeAgentProviderFailure> {
  const command = Command.make(input.executablePath, ...input.args).pipe(
    Command.workingDirectory(input.home),
    Command.env(providerEnvironment(input.provider, input.home)),
    Command.feed(input.stdin),
  );
  const operation = Effect.scoped(Effect.gen(function* () {
    const process = yield* input.executor.start(command).pipe(
      Effect.mapError((cause) => platformFailure(input.provider, input.operation, input.executablePath, cause, "CommandFailed")),
    );
    const [stdout, stderr, exitCode] = yield* Effect.all([
      collectBoundedOutput(process.stdout, input.provider, input.operation),
      collectBoundedOutput(process.stderr, input.provider, input.operation),
      process.exitCode.pipe(
        Effect.mapError((cause) => platformFailure(input.provider, input.operation, input.executablePath, cause, "CommandFailed")),
      ),
    ], { concurrency: "unbounded" });
    if (Number(exitCode) !== 0) {
      return yield* fail(
        input.provider,
        input.operation,
        "CommandFailed",
        input.executablePath,
        `Provider command exited ${Number(exitCode)}: ${stderr.trim() || stdout.trim()}`,
      );
    }
    return Object.freeze({ stdout, stderr });
  }));
  return operation.pipe(
    Effect.timeoutFail({
      duration: PROCESS_TIMEOUT,
      onTimeout: () => failure(
        input.provider,
        input.operation,
        "CommandTimedOut",
        input.executablePath,
        "Provider command exceeded its bounded execution timeout",
      ),
    }),
  );
}

function runCodexAppServerProcess(
  input: CodexAppServerRunInput,
): Effect.Effect<readonly NativeProviderJsonValue[], NativeAgentProviderFailure> {
  const operation = Effect.scoped(Effect.gen(function* () {
    const inputLines = yield* Queue.unbounded<Uint8Array>();
    const outputLines = yield* Queue.bounded<string>(1024);
    const command = Command.make(input.executablePath, "app-server", "--listen", "stdio://").pipe(
      Command.workingDirectory(input.home),
      Command.env(providerEnvironment(input.provider, input.home)),
      Command.stdin(Stream.fromQueue(inputLines)),
    );
    const process = yield* input.executor.start(command).pipe(
      Effect.mapError((cause) => platformFailure(input.provider, input.operation, input.executablePath, cause, "CommandFailed")),
    );
    yield* process.stdout.pipe(
      Stream.decodeText(),
      Stream.splitLines,
      Stream.runForEach((line) => Queue.offer(outputLines, line)),
      Effect.mapError((cause) => platformFailure(input.provider, input.operation, input.executablePath, cause, "ProtocolFailed")),
      Effect.forkScoped,
    );
    yield* process.stderr.pipe(
      Stream.runDrain,
      Effect.mapError((cause) => platformFailure(input.provider, input.operation, input.executablePath, cause, "ProtocolFailed")),
      Effect.forkScoped,
    );

    const request = Effect.fn("nativeAgentProvider.codexAppServerRequest")(function* (
      id: number,
      method: string,
      params: NativeProviderJsonValue,
    ) {
      yield* offerAppServerLine(inputLines, Object.freeze({ id, method, params }));
      while (true) {
        const line = yield* Queue.take(outputLines);
        const decoded = yield* decodeJson(input.provider, input.operation, line);
        if (!isJsonRecord(decoded) || decoded.id !== id) continue;
        if ("error" in decoded) {
          return yield* fail(
            input.provider,
            input.operation,
            "ProtocolFailed",
            undefined,
            `Codex app server rejected request ${id}: ${JSON.stringify(decoded.error)}`,
          );
        }
        if (!("result" in decoded)) {
          return yield* fail(
            input.provider,
            input.operation,
            "ProtocolFailed",
            undefined,
            `Codex app server response ${id} has no result`,
          );
        }
        return decoded.result;
      }
    });

    yield* request(1, "initialize", Object.freeze({
      clientInfo: Object.freeze({ name: "rawr-native-agent-provider-resource", version: "1.0.0" }),
      capabilities: Object.freeze({ experimentalApi: true }),
    }));
    yield* offerAppServerLine(inputLines, Object.freeze({ method: "initialized", params: Object.freeze({}) }));
    const results: NativeProviderJsonValue[] = [];
    for (let index = 0; index < input.requests.length; index += 1) {
      const current = input.requests[index];
      if (current === undefined) {
        return yield* fail(input.provider, input.operation, "ProtocolFailed", undefined, "Codex app server request set changed");
      }
      results.push(yield* request(index + 2, current.method, current.params));
    }
    yield* Queue.shutdown(inputLines);
    const exitCode = yield* process.exitCode.pipe(
      Effect.mapError((cause) => platformFailure(input.provider, input.operation, input.executablePath, cause, "CommandFailed")),
    );
    if (Number(exitCode) !== 0) {
      return yield* fail(
        input.provider,
        input.operation,
        "CommandFailed",
        input.executablePath,
        `Codex app server exited ${Number(exitCode)}`,
      );
    }
    return Object.freeze(results);
  }));
  return operation.pipe(
    Effect.timeoutFail({
      duration: APP_SERVER_TIMEOUT,
      onTimeout: () => failure(
        input.provider,
        input.operation,
        "CommandTimedOut",
        input.executablePath,
        "Codex app server operation exceeded its bounded timeout",
      ),
    }),
  );
}

function offerAppServerLine(
  queue: Queue.Queue<Uint8Array>,
  message: NativeProviderJsonValue,
): Effect.Effect<void> {
  return Queue.offer(queue, new TextEncoder().encode(`${JSON.stringify(message)}\n`)).pipe(Effect.asVoid);
}

function collectBoundedOutput(
  stream: Stream.Stream<Uint8Array, PlatformError>,
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
): Effect.Effect<string, NativeAgentProviderFailure> {
  interface OutputState {
    readonly chunks: readonly Uint8Array[];
    readonly bytes: number;
  }
  const initial: OutputState = Object.freeze({ chunks: Object.freeze([]), bytes: 0 });
  const mapped = stream.pipe(
    Stream.mapError((cause) => platformFailure(provider, operation, undefined, cause)),
  );
  return Stream.runFoldEffect(
    mapped,
    initial,
    (state, chunk): Effect.Effect<OutputState, NativeAgentProviderFailure> => {
      const bytes = state.bytes + chunk.byteLength;
      if (bytes > MAX_PROCESS_OUTPUT_BYTES) {
        return fail(provider, operation, "LimitExceeded", undefined, "Provider command exceeded its bounded output limit");
      }
      return Effect.succeed(Object.freeze({ chunks: Object.freeze([...state.chunks, chunk]), bytes }));
    },
  ).pipe(
    Effect.flatMap((state) => decodeText(provider, operation, concatenate(state.chunks))),
  );
}

function readProviderPackage(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  provider: NativeAgentProviderId,
  home: string,
  input: NativeProviderPackageReadInput,
): Effect.Effect<NativeProviderPackageObservation, NativeAgentProviderFailure> {
  return Effect.gen(function* () {
    if (!Number.isSafeInteger(input.maxEntries) || input.maxEntries <= 0) {
      return yield* fail(provider, "package-read", "InvalidInput", input.root, "maxEntries must be a positive safe integer");
    }
    if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes <= 0) {
      return yield* fail(provider, "package-read", "InvalidInput", input.root, "maxBytes must be a positive safe integer");
    }
    const root = yield* requireCanonicalDirectory(fs, paths, provider, "package-read", input.root, false);
    if (!isContained(paths, home, root)) {
      return yield* fail(provider, "package-read", "Aliased", root, "Package root escaped the explicit provider home");
    }
    const budget = { entries: 0, bytes: 0 };
    const entries = yield* walkPackage(fs, paths, provider, root, "", input, budget);
    entries.sort((left, right) => compareText(left.path, right.path));
    return Object.freeze({ root, entries: Object.freeze(entries) });
  });
}

function walkPackage(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  provider: NativeAgentProviderId,
  root: string,
  relativeRoot: string,
  limits: NativeProviderPackageReadInput,
  budget: { entries: number; bytes: number },
): Effect.Effect<NativeProviderPackageObservation["entries"][number][], NativeAgentProviderFailure> {
  const directory = relativeRoot === "" ? root : paths.join(root, relativeRoot);
  return fs.readDirectory(directory).pipe(
    mapPlatform(provider, "package-read", directory),
    Effect.flatMap((names) => Effect.forEach([...names].sort(compareText), (name) => Effect.gen(function* () {
      const relativePath = relativeRoot === "" ? name : paths.join(relativeRoot, name);
      const candidate = paths.join(root, relativePath);
      const resolved = yield* fs.realPath(candidate).pipe(mapPlatform(provider, "package-read", candidate));
      if (resolved !== candidate) {
        return yield* fail(provider, "package-read", "UnsupportedEntry", candidate, "Package cannot contain aliases or symlinks");
      }
      const status = yield* fs.stat(candidate).pipe(mapPlatform(provider, "package-read", candidate));
      if (status.type === "Directory") {
        return yield* walkPackage(fs, paths, provider, root, relativePath, limits, budget);
      }
      if (status.type !== "File") {
        return yield* fail(provider, "package-read", "UnsupportedEntry", candidate, "Package contains an unsupported entry");
      }
      budget.entries += 1;
      if (budget.entries > limits.maxEntries) {
        return yield* fail(provider, "package-read", "LimitExceeded", candidate, "Package exceeds maxEntries");
      }
      const bytes = yield* fs.readFile(candidate).pipe(mapPlatform(provider, "package-read", candidate));
      budget.bytes += bytes.byteLength;
      if (budget.bytes > limits.maxBytes) {
        return yield* fail(provider, "package-read", "LimitExceeded", candidate, "Package exceeds maxBytes");
      }
      return [Object.freeze({
        path: relativePath.split(paths.sep).join("/"),
        mode: status.mode & 0o777,
        bytes,
      })];
    }), { concurrency: 1 })),
    Effect.map((groups) => groups.flat()),
  );
}

function readOptionalHomeJsonFile(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  provider: NativeAgentProviderId,
  home: string,
  relativePath: string,
  maxBytes: number,
): Effect.Effect<NativeProviderJsonValue | null, NativeAgentProviderFailure> {
  return Effect.gen(function* () {
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || relativePath === "" || paths.isAbsolute(relativePath)) {
      return yield* fail(provider, "config-read", "InvalidInput", relativePath, "Configuration read input is invalid");
    }
    const candidate = paths.join(home, relativePath);
    if (!isContained(paths, home, candidate)) {
      return yield* fail(provider, "config-read", "Aliased", candidate, "Configuration path escaped the explicit provider home");
    }
    const present = yield* fs.exists(candidate).pipe(mapPlatform(provider, "config-read", candidate));
    if (!present) return null;
    const resolved = yield* fs.realPath(candidate).pipe(mapPlatform(provider, "config-read", candidate));
    if (resolved !== candidate) {
      return yield* fail(provider, "config-read", "Aliased", candidate, "Configuration path is not canonical");
    }
    const status = yield* fs.stat(candidate).pipe(mapPlatform(provider, "config-read", candidate));
    if (status.type !== "File" || Number(status.size) > maxBytes) {
      return yield* fail(provider, "config-read", status.type === "File" ? "LimitExceeded" : "UnsupportedEntry", candidate, "Configuration file shape is invalid");
    }
    const bytes = yield* fs.readFile(candidate).pipe(mapPlatform(provider, "config-read", candidate));
    if (bytes.byteLength > maxBytes) {
      return yield* fail(provider, "config-read", "LimitExceeded", candidate, "Configuration file exceeds maxBytes");
    }
    const text = yield* decodeText(provider, "config-read", bytes);
    return yield* decodeJson(provider, "config-read", text);
  });
}

function requireCanonicalExecutable(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  provider: NativeAgentProviderId,
  candidate: string,
): Effect.Effect<string, NativeAgentProviderFailure> {
  return Effect.gen(function* () {
    if (!isCanonicalAbsolutePath(paths, candidate, false)) {
      return yield* fail(provider, "acquire", "InvalidInput", candidate, "Provider executable must be an explicit canonical absolute path");
    }
    const resolved = yield* fs.realPath(candidate).pipe(mapPlatform(provider, "acquire", candidate));
    if (resolved !== candidate) {
      return yield* fail(provider, "acquire", "Aliased", candidate, "Provider executable path is aliased");
    }
    const status = yield* fs.stat(candidate).pipe(mapPlatform(provider, "acquire", candidate));
    if (status.type !== "File" || (status.mode & 0o111) === 0) {
      return yield* fail(provider, "acquire", "UnsupportedEntry", candidate, "Provider executable must be one executable regular file");
    }
    return candidate;
  });
}

function requireCanonicalDirectory(
  fs: FileSystem.FileSystem,
  paths: Path.Path,
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  candidate: string,
  allowRoot: boolean,
): Effect.Effect<string, NativeAgentProviderFailure> {
  return Effect.gen(function* () {
    if (!isCanonicalAbsolutePath(paths, candidate, allowRoot)) {
      return yield* fail(provider, operation, "InvalidInput", candidate, "Directory must be an explicit canonical absolute path");
    }
    const resolved = yield* fs.realPath(candidate).pipe(mapPlatform(provider, operation, candidate));
    if (resolved !== candidate) {
      return yield* fail(provider, operation, "Aliased", candidate, "Directory path is aliased");
    }
    const status = yield* fs.stat(candidate).pipe(mapPlatform(provider, operation, candidate));
    if (status.type !== "Directory") {
      return yield* fail(provider, operation, "UnsupportedEntry", candidate, "Path must be one existing directory");
    }
    return candidate;
  });
}

function isCanonicalAbsolutePath(paths: Path.Path, candidate: string, allowRoot: boolean): boolean {
  return paths.isAbsolute(candidate)
    && paths.normalize(candidate) === candidate
    && (allowRoot || candidate !== paths.parse(candidate).root);
}

function isContained(paths: Path.Path, root: string, candidate: string): boolean {
  const relative = paths.relative(root, candidate);
  return relative !== ""
    && relative !== ".."
    && !relative.startsWith(`..${paths.sep}`)
    && !paths.isAbsolute(relative);
}

function providerEnvironment(provider: NativeAgentProviderId, home: string): Record<string, string | undefined> {
  return {
    HOME: home,
    CODEX_HOME: provider === "codex" ? home : undefined,
    CLAUDE_CONFIG_DIR: provider === "claude" ? home : undefined,
    CODEX_FORK_HOME: undefined,
    CODEX_SWITCHBOARD_HOME: undefined,
    CODEX_SWITCHBOARD_TARGET: undefined,
  };
}

function decodeJson(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  text: string,
): Effect.Effect<NativeProviderJsonValue, NativeAgentProviderFailure> {
  return Effect.try({
    try: () => JSON.parse(text),
    catch: (cause) => failure(provider, operation, "InvalidJson", undefined, errorMessage(cause)),
  }).pipe(
    Effect.flatMap((value: unknown) => isJsonValue(value)
      ? Effect.succeed(value)
      : fail(provider, operation, "InvalidJson", undefined, "Provider returned a non-JSON value")),
  );
}

function decodeText(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  bytes: Uint8Array,
): Effect.Effect<string, NativeAgentProviderFailure> {
  return Effect.try({
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    catch: (cause) => failure(provider, operation, "ProtocolFailed", undefined, errorMessage(cause)),
  });
}

function isJsonValue(value: unknown): value is NativeProviderJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return typeof value === "object" && Object.values(value).every(isJsonValue);
}

function isJsonRecord(value: NativeProviderJsonValue): value is Readonly<Record<string, NativeProviderJsonValue>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
) {
  return <A, R>(effect: Effect.Effect<A, PlatformError, R>) => effect.pipe(
    Effect.mapError((cause) => platformFailure(provider, operation, candidate, cause)),
  );
}

function platformFailure(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  candidate: string | undefined,
  cause: PlatformError,
  fallback: NativeAgentProviderFailure["reason"] = "FilesystemFailed",
): NativeAgentProviderFailure {
  const missing = cause._tag === "SystemError" && cause.reason === "NotFound";
  return failure(provider, operation, missing ? "Missing" : fallback, candidate, cause.message);
}

function fail(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  reason: NativeAgentProviderFailure["reason"],
  candidate: string | undefined,
  detail: string,
) {
  return Effect.fail(failure(provider, operation, reason, candidate, detail));
}

function failure(
  provider: NativeAgentProviderId,
  operation: NativeAgentProviderOperation,
  reason: NativeAgentProviderFailure["reason"],
  candidate: string | undefined,
  detail: string,
): NativeAgentProviderFailure {
  return Object.freeze({
    _tag: "NativeAgentProviderFailure",
    provider,
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
