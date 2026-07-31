import { NodeServices } from "@effect/platform-node";
import type {
  ObserveSourceInventoryInput,
  SourceInventoryFailure,
  SourceInventoryResource,
  SourceInventoryResult,
} from "@habitat/resource-source-inventory";
import {
  MAX_SOURCE_INVENTORY_FAILURE_DETAIL,
  MAX_SOURCE_INVENTORY_ROOT_LENGTH,
  ObserveSourceInventoryInputSchema,
  SourceInventoryPathSchema,
  SourceInventoryResultSchema,
} from "@habitat/resource-source-inventory";
import { Effect, type PlatformError, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { ReadonlyObject, type Static, Type } from "typebox";
import { Validator } from "typebox/schema";

const decoder = new TextDecoder("utf-8", { fatal: true });
const GIT_INVENTORY_ARGUMENTS: readonly string[] = Object.freeze([
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "--stage",
  "--abbrev=1",
  "-t",
  "-z",
]);
const PROCESS_FORCE_KILL_AFTER = "5 seconds";
const STDERR_LIMIT = 64 * 1_024;
const STDOUT_LIMIT = 64 * 1_024 * 1_024;
const TRACKED_RECORD_PATTERN =
  /^[HSMRCK] (?<mode>100644|100755|120000|160000) [0-9a-f]{1,64} [0-3]\t(?<path>.+)$/su;

type ProviderRequirements = ChildProcessSpawner.ChildProcessSpawner;

interface GitInventoryCommandResult {
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
  readonly exitCode: number;
}

type ParsedSourceRecord =
  | Readonly<{
      source: "tracked";
      path: string;
      trackedNonFile: boolean;
    }>
  | Readonly<{
      source: "untracked";
      path: string;
    }>;

const observeInputValidator = new Validator({}, ObserveSourceInventoryInputSchema);
const sourcePathValidator = new Validator({}, SourceInventoryPathSchema);
const sourceInventoryResultValidator = new Validator({}, SourceInventoryResultSchema);

/** Structural schema for local-Git source-inventory provider construction. */
export const GitSourceInventoryProviderOptionsSchema = ReadonlyObject(
  Type.Object({
    gitExecutable: Type.Optional(
      Type.String({
        minLength: 1,
        maxLength: MAX_SOURCE_INVENTORY_ROOT_LENGTH,
        pattern: "^[^\\u0000]+$",
        description: "Focused-test override for the ordinary Git executable",
      })
    ),
  }),
  { additionalProperties: false }
);

const providerOptionsValidator = new Validator({}, GitSourceInventoryProviderOptionsSchema);

/**
 * Provider options reserved for focused tests. Production resolution uses the
 * operator's ordinary `git` command and inherited process configuration.
 */
export type GitSourceInventoryProviderOptions = Static<
  typeof GitSourceInventoryProviderOptionsSchema
>;

/** Creates a local-Git source inventory over Effect child-process services. */
export function makeGitSourceInventoryResource(
  options: GitSourceInventoryProviderOptions = {}
): SourceInventoryResource<ProviderRequirements> {
  const observe = Effect.fn("sourceInventory.git.observe")(function* (
    input: ObserveSourceInventoryInput
  ) {
    if (!providerOptionsValidator.Check(options)) {
      return yield* fail(
        "InvalidInput",
        undefined,
        "Source-inventory provider options do not match their structural contract"
      );
    }
    if (!observeInputValidator.Check(input)) {
      return yield* fail(
        "InvalidInput",
        undefined,
        "Source-inventory input does not match the bounded resource contract"
      );
    }

    const gitExecutable = options.gitExecutable ?? "git";
    const command = yield* runGitInventory(gitExecutable, input.root);
    if (command.exitCode !== 0) {
      return yield* fail(
        "CommandFailed",
        input.root,
        gitFailureDetail(command.exitCode, command.stderr)
      );
    }
    return yield* parseGitInventory(command.stdout, input.root, input.maxEntries);
  });

  return Object.freeze({ observe });
}

/** Creates a ready Node realization of the local-Git source inventory provider. */
export function makeNodeGitSourceInventoryResource(
  options: GitSourceInventoryProviderOptions = {}
): SourceInventoryResource<never> {
  const resource = makeGitSourceInventoryResource(options);
  return Object.freeze({
    observe: (input: ObserveSourceInventoryInput) =>
      resource.observe(input).pipe(Effect.provide(NodeServices.layer)),
  });
}

function runGitInventory(
  executable: string,
  root: string
): Effect.Effect<GitInventoryCommandResult, SourceInventoryFailure, ProviderRequirements> {
  const command = ChildProcess.make(executable, GIT_INVENTORY_ARGUMENTS, {
    cwd: root,
    extendEnv: true,
    stdin: "ignore",
    forceKillAfter: PROCESS_FORCE_KILL_AFTER,
  });
  return Effect.scoped(
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const process = yield* spawner.spawn(command).pipe(mapPlatform(root, "SetupFailed"));
      const [stdout, stderr, exitCode] = yield* Effect.all(
        [
          collectBoundedOutput(process.stdout, STDOUT_LIMIT, "stdout", root),
          collectBoundedOutput(process.stderr, STDERR_LIMIT, "stderr", root),
          process.exitCode.pipe(mapPlatform(root, "CommandFailed")),
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
  output: "stdout" | "stderr",
  root: string
): Effect.Effect<Uint8Array, SourceInventoryFailure> {
  type OutputState = Readonly<{
    chunks: readonly Uint8Array[];
    bytes: number;
  }>;
  const initial: OutputState = Object.freeze({
    chunks: Object.freeze([]),
    bytes: 0,
  });
  return Stream.runFoldEffect(
    stream.pipe(Stream.mapError((cause) => platformFailure(root, cause, "CommandFailed"))),
    () => initial,
    (state, chunk): Effect.Effect<OutputState, SourceInventoryFailure> => {
      const bytes = state.bytes + chunk.byteLength;
      if (bytes > maxBytes) {
        return fail(
          output === "stdout" ? "LimitExceeded" : "CommandFailed",
          root,
          `Git ${output} exceeds the ${maxBytes}-byte source-inventory bound`
        );
      }
      return Effect.succeed(
        Object.freeze({
          chunks: Object.freeze([...state.chunks, chunk]),
          bytes,
        })
      );
    }
  ).pipe(Effect.map((state) => concatenate(state.chunks, state.bytes)));
}

function parseGitInventory(
  bytes: Uint8Array,
  root: string,
  maxEntries: number
): Effect.Effect<SourceInventoryResult, SourceInventoryFailure> {
  return decodeGitOutput(bytes, root).pipe(
    Effect.flatMap((text) => {
      if (text.length === 0) {
        return checkedResult(
          Object.freeze({ paths: Object.freeze([]), trackedNonFilePaths: Object.freeze([]) }),
          root
        );
      }
      if (!text.endsWith("\0")) {
        return fail("InvalidOutput", root, "Git inventory output has a truncated NUL record");
      }

      const facts = new Map<string, ParsedSourceRecord>();
      for (const rawRecord of text.slice(0, -1).split("\0")) {
        if (rawRecord.length === 0) {
          return fail("InvalidOutput", root, "Git inventory output contains an empty NUL record");
        }
        const record = parseGitRecord(rawRecord);
        if (record === undefined) {
          return fail(
            "InvalidOutput",
            root,
            "Git ls-files emitted a malformed source-inventory record"
          );
        }
        if (!sourcePathValidator.Check(record.path)) {
          return fail(
            "InvalidOutput",
            root,
            "Git ls-files emitted an unsafe or non-canonical relative path"
          );
        }

        const existing = facts.get(record.path);
        if (existing !== undefined) {
          if (existing.source !== record.source) {
            return fail(
              "InvalidOutput",
              root,
              "Git ls-files reported one path as both tracked and untracked"
            );
          }
          if (existing.source === "tracked" && record.source === "tracked") {
            facts.set(
              record.path,
              Object.freeze({
                source: "tracked",
                path: record.path,
                trackedNonFile: existing.trackedNonFile || record.trackedNonFile,
              })
            );
          }
          continue;
        }

        facts.set(record.path, record);
        if (facts.size > maxEntries) {
          return fail(
            "LimitExceeded",
            root,
            `Git-visible source inventory exceeds maxEntries ${maxEntries}`
          );
        }
      }

      const paths = Array.from(facts.keys()).sort(compareText);
      const trackedNonFilePaths = Array.from(facts.values())
        .flatMap((record) =>
          record.source === "tracked" && record.trackedNonFile ? [record.path] : []
        )
        .sort(compareText);
      return checkedResult(
        Object.freeze({
          paths: Object.freeze(paths),
          trackedNonFilePaths: Object.freeze(trackedNonFilePaths),
        }),
        root
      );
    })
  );
}

function parseGitRecord(record: string): ParsedSourceRecord | undefined {
  if (record.startsWith("? ")) {
    const path = normalizeUntrackedPath(record.slice(2));
    return Object.freeze({ source: "untracked", path });
  }
  const match = TRACKED_RECORD_PATTERN.exec(record);
  const mode = match?.groups?.mode;
  const path = match?.groups?.path;
  if (mode === undefined || path === undefined) return undefined;
  return Object.freeze({
    source: "tracked",
    path,
    trackedNonFile: mode === "120000" || mode === "160000",
  });
}

function normalizeUntrackedPath(path: string): string {
  return path.endsWith("/") && !path.endsWith("//") ? path.slice(0, -1) : path;
}

function checkedResult(
  result: SourceInventoryResult,
  root: string
): Effect.Effect<SourceInventoryResult, SourceInventoryFailure> {
  return sourceInventoryResultValidator.Check(result)
    ? Effect.succeed(result)
    : fail(
        "InvalidOutput",
        root,
        "Git inventory could not be normalized to the source-inventory contract"
      );
}

function decodeGitOutput(
  bytes: Uint8Array,
  root: string
): Effect.Effect<string, SourceInventoryFailure> {
  return Effect.try({
    try: () => decoder.decode(bytes),
    catch: () => failure("InvalidOutput", root, "Git returned non-UTF-8 source-inventory output"),
  });
}

function gitFailureDetail(exitCode: number, stderr: Uint8Array): string {
  let detail: string;
  try {
    detail = decoder.decode(stderr).trim();
  } catch {
    detail = "non-UTF-8 stderr";
  }
  return detail.length === 0
    ? `Git ls-files exited ${exitCode}`
    : `Git ls-files exited ${exitCode}: ${detail}`;
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

function mapPlatform(root: string, reason: "SetupFailed" | "CommandFailed") {
  return <A, R>(effect: Effect.Effect<A, PlatformError.PlatformError, R>) =>
    effect.pipe(Effect.mapError((cause) => platformFailure(root, cause, reason)));
}

function platformFailure(
  root: string,
  cause: PlatformError.PlatformError,
  reason: "SetupFailed" | "CommandFailed"
): SourceInventoryFailure {
  return failure(reason, root, cause.message);
}

function fail(
  reason: SourceInventoryFailure["reason"],
  root: string | undefined,
  detail: string
): Effect.Effect<never, SourceInventoryFailure> {
  return Effect.fail(failure(reason, root, detail));
}

function failure(
  reason: SourceInventoryFailure["reason"],
  root: string | undefined,
  detail: string
): SourceInventoryFailure {
  const normalized = detail.trim() || "Source-inventory observation failed";
  const boundedDetail =
    normalized.length <= MAX_SOURCE_INVENTORY_FAILURE_DETAIL
      ? normalized
      : `${normalized.slice(0, MAX_SOURCE_INVENTORY_FAILURE_DETAIL - 3)}...`;
  return Object.freeze({
    _tag: "SourceInventoryFailure",
    reason,
    ...(root === undefined || root.length === 0 ? {} : { path: root }),
    detail: boundedDetail,
  });
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
