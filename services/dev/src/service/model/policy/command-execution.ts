import type { ChildProcessResource } from "@habitat-ai/resource-child-process";
import { Effect, Stream } from "effect";
import { ChildProcess } from "effect/unstable/process";
import type { CommandStep } from "../dto";

const STDOUT_LIMIT = 4 * 1024 * 1024;
const STDERR_LIMIT = 256 * 1024;

// Git's `rev-parse --local-env-vars` names must not redirect the explicit repository.
// Undefined overrides remove inherited entries in the native Node spawner.
const REPOSITORY_ENVIRONMENT = {
  GIT_ALTERNATE_OBJECT_DIRECTORIES: undefined,
  GIT_CONFIG: undefined,
  GIT_CONFIG_PARAMETERS: undefined,
  GIT_CONFIG_COUNT: undefined,
  GIT_OBJECT_DIRECTORY: undefined,
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
  GIT_IMPLICIT_WORK_TREE: undefined,
  GIT_GRAFT_FILE: undefined,
  GIT_INDEX_FILE: undefined,
  GIT_NO_REPLACE_OBJECTS: undefined,
  GIT_REPLACE_REF_BASE: undefined,
  GIT_PREFIX: undefined,
  GIT_SHALLOW_FILE: undefined,
  GIT_COMMON_DIR: undefined,
  GIT_TERMINAL_PROMPT: "0",
  GIT_OPTIONAL_LOCKS: "0",
};

/** Describes an unattempted native action without starting a child. */
export function plannedStep(command: string, args: readonly string[]): CommandStep {
  return {
    command,
    args: [...args],
    status: "planned",
    exitCode: null,
    stdout: "",
    stderr: "",
    failure: null,
  };
}

/** Runs one scoped native command; interruption and bounds join native child settlement. */
export function runCommand(
  spawner: ChildProcessResource,
  command: string,
  args: readonly string[],
  cwd: string,
  timeoutMs = 60_000
): Effect.Effect<CommandStep> {
  return Effect.gen(function* () {
    const stdout: Uint8Array[] = [];
    const stderr: Uint8Array[] = [];
    let exitCode: number | null = null;
    const attempt = yield* Effect.result(
      Effect.scoped(
        Effect.gen(function* () {
          const child = yield* spawner.spawn(
            ChildProcess.make(command, args, {
              cwd,
              extendEnv: true,
              env: REPOSITORY_ENVIRONMENT,
              stdin: Stream.empty,
              forceKillAfter: "5 seconds",
            })
          );
          yield* Effect.all(
            [
              collect(child.stdout, stdout, STDOUT_LIMIT, "stdout"),
              collect(child.stderr, stderr, STDERR_LIMIT, "stderr"),
              child.exitCode.pipe(
                Effect.tap((code) =>
                  Effect.sync(() => {
                    exitCode = Number(code);
                  })
                )
              ),
            ],
            { concurrency: "unbounded" }
          );
        })
      ).pipe(Effect.timeout(timeoutMs))
    );
    return {
      command,
      args: [...args],
      status: attempt._tag === "Success" && exitCode === 0 ? "succeeded" : "failed",
      exitCode,
      stdout: decode(stdout),
      stderr: decode(stderr),
      failure: attempt._tag === "Failure" ? failureMessage(attempt.failure) : null,
    };
  });
}

function collect<E>(
  stream: Stream.Stream<Uint8Array, E>,
  chunks: Uint8Array[],
  limit: number,
  name: string
) {
  let length = 0;
  return Stream.runForEach(stream, (chunk) => {
    const remaining = limit - length;
    if (chunk.byteLength > remaining) {
      if (remaining > 0) chunks.push(chunk.slice(0, remaining));
      return Effect.fail(new Error(`Native command ${name} exceeds ${limit} bytes.`));
    }
    chunks.push(chunk);
    length += chunk.byteLength;
    return Effect.void;
  });
}

function decode(chunks: readonly Uint8Array[]): string {
  const bytes = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Preserves a native failure description without changing either command stream. */
export function failureMessage(error: unknown): string {
  return error instanceof Error && typeof error.message === "string" && error.message.length > 0
    ? error.message
    : String(error);
}
