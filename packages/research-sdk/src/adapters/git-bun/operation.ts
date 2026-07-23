import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { Effect } from "effect";
import { MaximumTimerDelayMs } from "../../contracts/index.js";
import { type GitBunError, invalidInput, isGitBunError, operationFailed } from "./internal.js";

export function validateCommandDeadline<
  Config extends {
    readonly command: {
      readonly timeoutMs: number;
      readonly terminationGraceMs: number;
    };
  },
>(config: Config): Effect.Effect<Config, GitBunError> {
  return config.command.timeoutMs + config.command.terminationGraceMs <= MaximumTimerDelayMs
    ? Effect.succeed(config)
    : Effect.fail(invalidInput("configure", "Git/Bun command deadlines exceed the timer range."));
}

export function canonicalDirectory(
  path: string,
  operation: string
): Effect.Effect<string, GitBunError> {
  return Effect.tryPromise({
    try: async () => {
      const canonical = await realpath(path);
      if (!isAbsolute(path) || canonical !== path || !(await lstat(canonical)).isDirectory()) {
        throw invalidInput(operation, "The configured directory is not a canonical realpath.");
      }
      return canonical;
    },
    catch: (error) => normalizeFsError(operation, error),
  });
}

export function canonicalBinary(
  path: string,
  operation: string
): Effect.Effect<string, GitBunError> {
  return Effect.tryPromise({
    try: async () => {
      const canonical = await realpath(path);
      if (!isAbsolute(path) || canonical !== path || !(await lstat(canonical)).isFile()) {
        throw invalidInput(operation, "The configured tool is not a canonical file realpath.");
      }
      return canonical;
    },
    catch: (error) => normalizeFsError(operation, error),
  });
}

export function withControlRoot<Output>(
  scratchRoot: string,
  prefix: string,
  use: (controlRoot: string) => Effect.Effect<Output, GitBunError>
): Effect.Effect<Output, GitBunError> {
  return Effect.acquireUseRelease(
    Effect.uninterruptible(
      Effect.tryPromise({
        try: () => mkdtemp(join(scratchRoot, `git-bun-${prefix}-`)),
        catch: (error) => operationFailed("acquire-operation", error),
      })
    ),
    use,
    (controlRoot) =>
      Effect.uninterruptible(
        Effect.tryPromise({
          try: () => rm(controlRoot, { recursive: true, force: true }),
          catch: (error) => operationFailed("release-operation", error),
        })
      )
  );
}

function normalizeFsError(operation: string, error: unknown): GitBunError {
  return isGitBunError(error) ? error : operationFailed(operation, error);
}
