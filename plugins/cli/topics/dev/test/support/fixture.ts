import { readOclifCommandSource } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Parser } from "@oclif/core";
import { Context, Effect } from "effect";
import { syncUpstreamCommand } from "../../src/commands/repo-sync-upstream.js";
import { doctorCommand } from "../../src/commands/stack-doctor.js";
import { drainCommand } from "../../src/commands/stack-drain.js";
import { cleanupCommand } from "../../src/commands/worktree-cleanup.js";

export const commands = [syncUpstreamCommand, doctorCommand, drainCommand, cleanupCommand] as const;
export type Command = (typeof commands)[number];
type Boundary = Parameters<typeof doctorCommand.effect>[0];

export function recordingBoundary(failure?: Error) {
  const calls: { operation: string; input: unknown }[] = [];
  const invocations: unknown[] = [];
  const result = Object.freeze({ serviceResult: "opaque exact return value" });
  const procedure = (operation: string) => (input: unknown) =>
    Effect.suspend(() => {
      calls.push({ operation, input });
      // An opaque result proves that command execution leaves domain classification untouched.
      return failure === undefined ? Effect.succeed(result as never) : Effect.fail(failure);
    });
  const client = {
    repo: { syncUpstream: procedure("repo.syncUpstream") },
    stack: { doctor: procedure("stack.doctor"), drain: procedure("stack.drain") },
    worktree: { cleanup: procedure("worktree.cleanup") },
  };
  const clients = {
    dev: {
      kind: "service.client.construction-bound",
      serviceId: "habitat.dev",
      withInvocation(input) {
        invocations.push(input);
        return client;
      },
    },
  } satisfies Boundary["clients"];
  const boundary = {
    clients,
    resources: {
      has: () => false,
      get: () => {
        throw new Error("Dev commands own no direct resources");
      },
    },
    telemetry: {
      span: <A, E, R>(_name: string, effect: Effect.Effect<A, E, R>) => effect,
      event: () => Effect.void,
    },
    execution: {
      appId: "test",
      processId: "test",
      entrypointId: "test",
      profileId: "test",
      role: "cli",
      ownerId: "test",
      executionId: "test",
      traceId: "test",
    },
  } satisfies Omit<Boundary, "input">;
  return { boundary, calls, invocations, result };
}

export async function parse(command: Command, argv: string[]) {
  const source = readOclifCommandSource(command.source);
  return Parser.parse(argv, { args: source.args, flags: source.flags, strict: true });
}

export function program(
  command: Command,
  input: { args: object; flags: object },
  recording: ReturnType<typeof recordingBoundary>
) {
  // The heterogeneous test table erases the input that the exact native source just parsed.
  const effect = command.effect({ ...recording.boundary, input } as never);
  // Recording clients have no ambient requirements; the managed client type hides its environment.
  const context = Context.empty() as Context.Context<unknown>;
  return Effect.provideContext(
    Effect.gen(function* () {
      return yield* effect;
    }),
    context
  );
}
