import { realpathSync } from "node:fs";
import { isAbsolute, normalize } from "node:path";
import { Cause, Context, Effect, Exit, Layer } from "effect";
import {
  type CommandExecutionConfig,
  CommandExecutionConfigSchema,
  type DigestIdentity,
  decodeStructural,
  MaximumTimerDelayMs,
  type ProcessTerminationUnconfirmed,
} from "../contracts/index.js";

export interface CommandRequest extends CommandExecutionConfig {
  readonly stdin?: Uint8Array;
}

export interface CommandResult {
  readonly kind: "Exited";
  readonly exitCode: number;
  readonly signalCode: string | null;
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
}

export interface InvalidCommandRequest {
  readonly kind: "InvalidCommandRequest";
  readonly field:
    | "arguments"
    | "cwd"
    | "environment"
    | "executable"
    | "stdin"
    | "terminationGraceMs"
    | "timeoutMs";
  readonly message: string;
}

export interface CommandSpawnFailed {
  readonly kind: "CommandSpawnFailed";
  readonly message: string;
}

export interface CommandIoFailed {
  readonly kind: "CommandIoFailed";
  readonly message: string;
}

export interface CommandTimedOut {
  readonly kind: "CommandTimedOut";
  readonly timeoutMs: number;
  readonly result: CommandResult | null;
}

export type CommandError =
  | InvalidCommandRequest
  | CommandSpawnFailed
  | CommandIoFailed
  | CommandTimedOut
  | ProcessTerminationUnconfirmed;

export interface CommandProcessShape {
  readonly run: (request: CommandRequest) => Effect.Effect<CommandResult, CommandError>;
}

export interface CommandTerminationTarget {
  readonly pid: number;
  readonly exited: Promise<number>;
  readonly exitCode: number | null;
  readonly signalCode: string | null;
  readonly kill: (signal: "SIGKILL" | "SIGTERM") => void;
}

export type CommandTerminationConfirmation =
  | { readonly kind: "Confirmed"; readonly exitCode: number }
  | {
      readonly kind: "Unconfirmed";
      readonly outcome: ProcessTerminationUnconfirmed;
    };

export type CommandTerminator = (
  target: CommandTerminationTarget,
  graceMs: number
) => Promise<CommandTerminationConfirmation>;

export interface BunCommandProcessOptions {
  readonly terminateAndConfirm?: CommandTerminator;
}

export class CommandProcess extends Context.Service<CommandProcess, CommandProcessShape>()(
  "@rawr/research-sdk/runtime/CommandProcess"
) {}

export function makeBunCommandProcess(options: BunCommandProcessOptions = {}): CommandProcessShape {
  const terminator = options.terminateAndConfirm ?? defaultCommandTerminator;

  return {
    run(request) {
      const invalid = validateCommandRequest(request);
      return invalid === undefined ? runBunCommand(request, terminator) : Effect.fail(invalid);
    },
  };
}

export const BunCommandProcessLayer = Layer.succeed(CommandProcess, makeBunCommandProcess());

interface OwnedCommand {
  readonly completion: Promise<CommandResult>;
  readonly terminate: () => Promise<CommandTerminationConfirmation>;
}

function runBunCommand(
  request: CommandRequest,
  terminator: CommandTerminator
): Effect.Effect<CommandResult, CommandError> {
  return Effect.uninterruptibleMask((restore) =>
    Effect.gen(function* () {
      const owned = yield* Effect.try({
        try: () => spawnOwnedCommand(request, terminator),
        catch: (error): CommandSpawnFailed => ({
          kind: "CommandSpawnFailed",
          message: describeUnknown(error),
        }),
      });

      const primary = yield* Effect.exit(restore(useOwnedCommand(owned, request)));
      const secondary = yield* Effect.exit(
        Exit.isFailure(primary) ? confirmTermination(owned) : Effect.void
      );

      if (Exit.isFailure(primary)) {
        return yield* Effect.failCause(
          Exit.isFailure(secondary) && !containsTerminationUnconfirmed(primary.cause)
            ? Cause.combine(primary.cause, secondary.cause)
            : primary.cause
        );
      }
      if (Exit.isFailure(secondary)) {
        return yield* Effect.failCause(secondary.cause);
      }
      return primary.value;
    })
  );
}

function spawnOwnedCommand(request: CommandRequest, terminator: CommandTerminator): OwnedCommand {
  const subprocess = Bun.spawn({
    cmd: [request.executable, ...request.arguments],
    cwd: request.cwd,
    env: { ...request.environment },
    stdin: request.stdin === undefined ? "ignore" : new Uint8Array(request.stdin),
    stdout: "pipe",
    stderr: "pipe",
  });
  const completion = Promise.all([
    subprocess.exited,
    Bun.readableStreamToBytes(subprocess.stdout),
    Bun.readableStreamToBytes(subprocess.stderr),
  ]).then(([exitCode, stdout, stderr]) => ({
    kind: "Exited" as const,
    exitCode,
    signalCode: subprocess.signalCode,
    stdout,
    stderr,
  }));

  let terminalization: Promise<CommandTerminationConfirmation> | undefined;
  const terminate = () => {
    terminalization ??= Promise.resolve()
      .then(() => terminator(subprocess, request.terminationGraceMs))
      .catch((error) => ({
        kind: "Unconfirmed" as const,
        outcome: makeTerminationUnconfirmed(
          subprocess,
          request.terminationGraceMs,
          describeUnknown(error)
        ),
      }));
    return terminalization;
  };

  return {
    completion,
    terminate,
  };
}

function containsTerminationUnconfirmed(cause: Cause.Cause<CommandError>): boolean {
  return cause.reasons.some(
    (reason) => Cause.isFailReason(reason) && reason.error.kind === "ProcessTerminationUnconfirmed"
  );
}

function useOwnedCommand(
  owned: OwnedCommand,
  request: CommandRequest
): Effect.Effect<CommandResult, CommandError> {
  return awaitCompletion(owned).pipe(
    Effect.timeout(request.timeoutMs),
    Effect.catchTag("TimeoutError", () => failAfterTimeout(owned, request))
  );
}

function failAfterTimeout(
  owned: OwnedCommand,
  request: CommandRequest
): Effect.Effect<never, CommandTimedOut | CommandIoFailed | ProcessTerminationUnconfirmed> {
  return Effect.gen(function* () {
    const termination = yield* Effect.exit(confirmTermination(owned));
    if (Exit.isFailure(termination)) {
      return yield* Effect.failCause(
        Cause.combine(Cause.fail(commandTimedOut(request.timeoutMs, null)), termination.cause)
      );
    }

    const completion = yield* Effect.exit(awaitCompletion(owned));
    if (Exit.isFailure(completion)) {
      return yield* Effect.failCause(
        Cause.combine(Cause.fail(commandTimedOut(request.timeoutMs, null)), completion.cause)
      );
    }

    return yield* Effect.fail(commandTimedOut(request.timeoutMs, completion.value));
  });
}

function commandTimedOut(timeoutMs: number, result: CommandResult | null): CommandTimedOut {
  return { kind: "CommandTimedOut", timeoutMs, result };
}

function awaitCompletion(owned: OwnedCommand): Effect.Effect<CommandResult, CommandIoFailed> {
  return Effect.tryPromise({
    try: () => owned.completion,
    catch: (error) => ({
      kind: "CommandIoFailed",
      message: describeUnknown(error),
    }),
  });
}

function confirmTermination(
  owned: OwnedCommand
): Effect.Effect<void, ProcessTerminationUnconfirmed> {
  return Effect.promise(() => owned.terminate()).pipe(
    Effect.flatMap((confirmation) =>
      confirmation.kind === "Confirmed" ? Effect.void : Effect.fail(confirmation.outcome)
    )
  );
}

async function defaultCommandTerminator(
  target: CommandTerminationTarget,
  graceMs: number
): Promise<CommandTerminationConfirmation> {
  target.kill("SIGTERM");
  const gracefulExit = await waitForExit(target, graceMs);
  if (gracefulExit !== undefined) {
    return { kind: "Confirmed", exitCode: gracefulExit };
  }

  target.kill("SIGKILL");
  const forcedExit = await waitForExit(target, graceMs);
  return forcedExit === undefined
    ? {
        kind: "Unconfirmed",
        outcome: makeTerminationUnconfirmed(target, graceMs, "exit not observed"),
      }
    : { kind: "Confirmed", exitCode: forcedExit };
}

async function waitForExit(
  target: CommandTerminationTarget,
  graceMs: number
): Promise<number | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      target.exited,
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), graceMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function validateCommandRequest(request: CommandRequest): InvalidCommandRequest | undefined {
  const structural = decodeStructural(CommandExecutionConfigSchema, {
    executable: request.executable,
    arguments: request.arguments,
    cwd: request.cwd,
    environment: request.environment,
    timeoutMs: request.timeoutMs,
    terminationGraceMs: request.terminationGraceMs,
  });
  if (structural.kind === "Invalid") {
    const firstPath = structural.issues[0]?.instancePath.split("/")[1];
    return {
      kind: "InvalidCommandRequest",
      field: commandField(firstPath),
      message: structural.issues[0]?.message ?? "Command request is malformed.",
    };
  }
  if (request.stdin !== undefined && !(request.stdin instanceof Uint8Array)) {
    return {
      kind: "InvalidCommandRequest",
      field: "stdin",
      message: "Command stdin must be a Uint8Array.",
    };
  }
  if (request.timeoutMs + request.terminationGraceMs > MaximumTimerDelayMs) {
    return {
      kind: "InvalidCommandRequest",
      field: "timeoutMs",
      message: "Command timeout and termination grace exceed the bounded timer range.",
    };
  }

  return (
    validateResolvedPath("executable", request.executable) ??
    validateResolvedPath("cwd", request.cwd)
  );
}

function validateResolvedPath(
  field: "cwd" | "executable",
  value: string
): InvalidCommandRequest | undefined {
  if (!isAbsolute(value) || normalize(value) !== value) {
    return {
      kind: "InvalidCommandRequest",
      field,
      message: "Command paths must be absolute and normalized.",
    };
  }

  try {
    if (realpathSync(value) !== value) {
      return {
        kind: "InvalidCommandRequest",
        field,
        message: "Command paths must already be symlink-resolved.",
      };
    }
  } catch (error) {
    return {
      kind: "InvalidCommandRequest",
      field,
      message: `Command path cannot be resolved: ${describeUnknown(error)}`,
    };
  }

  return undefined;
}

function commandField(value: string | undefined): InvalidCommandRequest["field"] {
  switch (value) {
    case "arguments":
    case "cwd":
    case "environment":
    case "executable":
    case "terminationGraceMs":
    case "timeoutMs":
      return value;
    default:
      return "executable";
  }
}

function makeTerminationUnconfirmed(
  target: CommandTerminationTarget,
  graceMs: number,
  detail: string
): ProcessTerminationUnconfirmed {
  return {
    kind: "ProcessTerminationUnconfirmed",
    processLocator: `pid:${target.pid}`,
    requestedSignal: "SIGKILL",
    detailDigest: digestIdentity(
      "research-sdk.command-termination-detail.v1",
      `${target.pid}:SIGTERM:SIGKILL:${graceMs}:${detail}`
    ),
  };
}

function digestIdentity(preimageKind: string, value: string): DigestIdentity {
  return {
    algorithm: "sha256",
    preimageKind,
    value: new Bun.CryptoHasher("sha256").update(value).digest("hex"),
  };
}

function describeUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
