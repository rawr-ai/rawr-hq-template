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
  readonly capture: CommandOutputCapture;
}

export interface CommandOutputCapture {
  readonly stdout: Uint8Array;
  readonly stderr: Uint8Array;
  readonly stdoutComplete: boolean;
  readonly stderrComplete: boolean;
}

export interface CommandTimedOut {
  readonly kind: "CommandTimedOut";
  readonly timeoutMs: number;
  readonly result: CommandResult | null;
  readonly capture: CommandOutputCapture;
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
  readonly capture: () => CommandOutputCapture;
  readonly completion: Promise<CommandResult>;
  readonly settleAfterFailure: () => Promise<CommandFailureSettlement>;
}

interface CommandProcessTerminal {
  readonly exitCode: number;
  readonly signalCode: string | null;
}

interface CommandFailureSettlement {
  readonly capture: CommandOutputCapture;
  readonly drainFailure: CommandIoFailed | undefined;
  readonly result: CommandResult | null;
  readonly termination: CommandTerminationConfirmation;
}

interface CapturedStream {
  readonly cancel: () => void;
  readonly drained: Promise<void>;
  readonly snapshot: () => { readonly bytes: Uint8Array; readonly complete: boolean };
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

      if (Exit.isFailure(primary)) {
        const settlement = yield* Effect.promise(() => owned.settleAfterFailure());
        let combined = primary.cause;
        for (const secondary of settlementFailures(settlement)) {
          if (!containsFailureKind(primary.cause, secondary.kind)) {
            combined = Cause.combine(combined, Cause.fail(secondary));
          }
        }
        return yield* Effect.failCause(combined);
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
  const stdout = captureStream(subprocess.stdout);
  const stderr = captureStream(subprocess.stderr);
  let processTerminal: CommandProcessTerminal | undefined;
  const processExited = subprocess.exited.then((exitCode) => {
    processTerminal = {
      exitCode,
      signalCode: subprocess.signalCode,
    };
    return processTerminal;
  });
  const currentProcessTerminal = (): CommandProcessTerminal | undefined => {
    if (processTerminal === undefined && subprocess.exitCode !== null) {
      processTerminal = {
        exitCode: subprocess.exitCode,
        signalCode: subprocess.signalCode,
      };
    }
    return processTerminal;
  };
  const outputDrained = Promise.all([stdout.drained, stderr.drained]).then(() => undefined);
  const completion = Promise.all([processExited, outputDrained]).then(([terminal]) =>
    commandResult(terminal, captureOutput(stdout, stderr))
  );

  let terminalization: Promise<CommandTerminationConfirmation> | undefined;
  const terminate = () => {
    terminalization ??= Promise.resolve()
      .then(() => {
        const observedTerminal = currentProcessTerminal();
        return observedTerminal === undefined
          ? terminator(subprocess, request.terminationGraceMs)
          : ({ kind: "Confirmed", exitCode: observedTerminal.exitCode } as const);
      })
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
  let failureSettlement: Promise<CommandFailureSettlement> | undefined;
  const settleAfterFailure = () => {
    failureSettlement ??= (async () => {
      const termination = await terminate();
      const drainFailure = await settleOutputDrain(
        stdout,
        stderr,
        outputDrained,
        request.terminationGraceMs
      );
      const capture = captureOutput(stdout, stderr);
      const observedTerminal = currentProcessTerminal();
      return {
        capture,
        drainFailure,
        result: observedTerminal === undefined ? null : commandResult(observedTerminal, capture),
        termination,
      };
    })();
    return failureSettlement;
  };

  return {
    capture: () => captureOutput(stdout, stderr),
    completion,
    settleAfterFailure,
  };
}

function containsFailureKind(
  cause: Cause.Cause<CommandError>,
  kind: CommandError["kind"]
): boolean {
  return cause.reasons.some((reason) => Cause.isFailReason(reason) && reason.error.kind === kind);
}

function settlementFailures(settlement: CommandFailureSettlement): readonly CommandError[] {
  const failures: CommandError[] = [];
  if (settlement.termination.kind === "Unconfirmed") {
    failures.push(settlement.termination.outcome);
  }
  if (settlement.drainFailure !== undefined) {
    failures.push(settlement.drainFailure);
  }
  return failures;
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
    const settlement = yield* Effect.promise(() => owned.settleAfterFailure());
    return yield* Effect.fail(
      commandTimedOut(request.timeoutMs, settlement.result, settlement.capture)
    );
  });
}

function commandTimedOut(
  timeoutMs: number,
  result: CommandResult | null,
  capture: CommandOutputCapture
): CommandTimedOut {
  return { kind: "CommandTimedOut", timeoutMs, result, capture };
}

function awaitCompletion(owned: OwnedCommand): Effect.Effect<CommandResult, CommandIoFailed> {
  return Effect.tryPromise({
    try: () => owned.completion,
    catch: (error) => ({
      kind: "CommandIoFailed",
      message: describeUnknown(error),
      capture: owned.capture(),
    }),
  });
}

async function defaultCommandTerminator(
  target: CommandTerminationTarget,
  graceMs: number
): Promise<CommandTerminationConfirmation> {
  const alreadyExited = observedExitCode(target);
  if (alreadyExited !== undefined) {
    return { kind: "Confirmed", exitCode: alreadyExited };
  }

  target.kill("SIGTERM");
  const gracefulExit = await waitForExit(target, graceMs);
  if (gracefulExit !== undefined) {
    return { kind: "Confirmed", exitCode: gracefulExit };
  }

  const exitedBeforeEscalation = observedExitCode(target);
  if (exitedBeforeEscalation !== undefined) {
    return { kind: "Confirmed", exitCode: exitedBeforeEscalation };
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

function observedExitCode(target: CommandTerminationTarget): number | undefined {
  return target.exitCode === null ? undefined : target.exitCode;
}

function captureStream(stream: ReadableStream<Uint8Array>): CapturedStream {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  let cancelled = false;
  let complete = false;
  let settled = false;

  const drained = (async () => {
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) {
          complete = !cancelled;
          return;
        }
        const chunk = new Uint8Array(next.value);
        chunks.push(chunk);
        byteLength += chunk.byteLength;
      }
    } finally {
      settled = true;
      reader.releaseLock();
    }
  })();
  void drained.catch(() => undefined);

  return {
    cancel() {
      if (settled || cancelled) {
        return;
      }
      cancelled = true;
      void reader.cancel().catch(() => undefined);
    },
    drained,
    snapshot() {
      const bytes = new Uint8Array(byteLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return { bytes, complete };
    },
  };
}

async function settleOutputDrain(
  stdout: CapturedStream,
  stderr: CapturedStream,
  outputDrained: Promise<void>,
  graceMs: number
): Promise<CommandIoFailed | undefined> {
  const drain = await raceWithDeadline(outputDrained, graceMs);
  if (drain.kind === "Completed") {
    return undefined;
  }

  stdout.cancel();
  stderr.cancel();
  const capture = captureOutput(stdout, stderr);
  return {
    kind: "CommandIoFailed",
    message:
      drain.kind === "Failed"
        ? `Command output drain failed: ${describeUnknown(drain.error)}`
        : `Command output did not drain within ${graceMs}ms after termination.`,
    capture,
  };
}

type DeadlineOutcome =
  | { readonly kind: "Completed" }
  | { readonly kind: "Failed"; readonly error: unknown }
  | { readonly kind: "TimedOut" };

async function raceWithDeadline(
  operation: Promise<void>,
  timeoutMs: number
): Promise<DeadlineOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation.then(
        () => ({ kind: "Completed" as const }),
        (error) => ({ kind: "Failed" as const, error })
      ),
      new Promise<{ readonly kind: "TimedOut" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "TimedOut" }), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

function captureOutput(stdout: CapturedStream, stderr: CapturedStream): CommandOutputCapture {
  const capturedStdout = stdout.snapshot();
  const capturedStderr = stderr.snapshot();
  return {
    stdout: capturedStdout.bytes,
    stderr: capturedStderr.bytes,
    stdoutComplete: capturedStdout.complete,
    stderrComplete: capturedStderr.complete,
  };
}

function commandResult(
  terminal: CommandProcessTerminal,
  capture: CommandOutputCapture
): CommandResult {
  return {
    kind: "Exited",
    exitCode: terminal.exitCode,
    signalCode: terminal.signalCode,
    stdout: capture.stdout,
    stderr: capture.stderr,
  };
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
