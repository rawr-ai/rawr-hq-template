import { expect, test } from "bun:test";
import { Cause, Effect, Exit } from "effect";
import { createCommandCreateCommand } from "../src/commands/command-create.js";
import { createExtensionCreateCommand } from "../src/commands/extension-create.js";
import { type AuthoringReceipt, createPlugin } from "../src/index.js";

const boundary = {
  clients: {},
  resources: {
    has: () => false,
    get: () => {
      throw new Error("No resource declared");
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
    role: "cli" as const,
    ownerId: "test",
    executionId: "test",
    traceId: "test",
  },
};

test("plugin construction is cold and selects exactly the two authoring commands", () => {
  let calls = 0;
  const run = (): AuthoringReceipt => {
    calls++;
    return { status: "created", paths: [] };
  };
  const plugin = createPlugin({ runCliCommandGenerator: run, runCliExtensionGenerator: run });
  expect(calls).toBe(0);
  expect(plugin.commands.map((command) => command.id)).toEqual([
    "cli:command:create",
    "cli:extension:create",
  ]);
  expect(plugin.services).toEqual({});
  expect(plugin.resourceRequirements).toEqual([]);
});

test("official command body forwards its distinct request and complete receipt", async () => {
  const calls: unknown[] = [];
  const receipt = { status: "dry-run", paths: ["src/commands/echo.ts"] } as const;
  const command = createCommandCreateCommand((request, options) => {
    calls.push({ request, options });
    return receipt;
  });
  const program = command.effect({
    ...boundary,
    input: { args: { topic: "foundation", name: "echo" }, flags: { "dry-run": true, json: false } },
  });
  expect(calls).toEqual([]);
  if (!Effect.isEffect(program)) throw new Error("Expected native Effect");
  expect(await Effect.runPromise(program)).toBe(receipt);
  expect(calls).toEqual([
    { request: { topic: "foundation", name: "echo" }, options: { dryRun: true } },
  ]);
});

test("extension body awaits its own runner and retains rejection identity", async () => {
  const failure = new Error("refused before writing");
  const calls: unknown[] = [];
  const command = createExtensionCreateCommand(async (request, options) => {
    calls.push({ request, options });
    throw failure;
  });
  const program = command.effect({
    ...boundary,
    input: {
      args: { id: "example" },
      flags: { destination: "extensions/example", "dry-run": false, json: false },
    },
  });
  expect(calls).toEqual([]);
  if (!Effect.isEffect(program)) throw new Error("Expected native Effect");
  expect(await Effect.runPromise(Effect.flip(program))).toBe(failure);
  expect(calls).toEqual([
    { request: { id: "example", destination: "extensions/example" }, options: { dryRun: false } },
  ]);
});

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

const invocationCases = [
  {
    name: "official command",
    program(run: () => Promise<AuthoringReceipt>) {
      return createCommandCreateCommand(run).effect({
        ...boundary,
        input: {
          args: { topic: "foundation", name: "echo" },
          flags: { "dry-run": false, json: false },
        },
      });
    },
  },
  {
    name: "extension",
    program(run: () => Promise<AuthoringReceipt>) {
      return createExtensionCreateCommand(run).effect({
        ...boundary,
        input: {
          args: { id: "example" },
          flags: { destination: "extensions/example", "dry-run": false, json: false },
        },
      });
    },
  },
];

for (const invocation of invocationCases) {
  test(`${invocation.name} interruption waits for the started runner to settle publication`, async () => {
    const entered = gate();
    const publication = gate();
    const events: string[] = [];
    const program = invocation.program(async () => {
      events.push("runner entered");
      entered.release();
      await publication.promise;
      events.push("publication settled");
      return { status: "created", paths: ["source.ts"] };
    });
    if (!Effect.isEffect(program)) throw new Error("Expected native Effect");
    const controller = new AbortController();
    const completion = Effect.runPromiseExit(program, { signal: controller.signal }).then(
      (exit) => {
        events.push("invocation settled");
        return exit;
      }
    );
    await entered.promise;
    controller.abort();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(["runner entered"]);
    publication.release();
    const exit = await completion;
    expect(events).toEqual(["runner entered", "publication settled", "invocation settled"]);
    expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
  });

  test(`${invocation.name} does not enter a runner when interrupted before its boundary`, async () => {
    const before = gate();
    const entered = gate();
    let calls = 0;
    const program = invocation.program(async () => {
      calls++;
      return { status: "created", paths: ["source.ts"] };
    });
    if (!Effect.isEffect(program)) throw new Error("Expected native Effect");
    const pending = Effect.andThen(
      Effect.promise(() => {
        entered.release();
        return before.promise;
      }),
      program
    );
    const controller = new AbortController();
    const completion = Effect.runPromiseExit(pending, { signal: controller.signal });
    await entered.promise;
    controller.abort();
    const exit = await completion;
    expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
    before.release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toBe(0);
  });

  test(`${invocation.name} retains the exact original asynchronous runner rejection`, async () => {
    const failure = new Error("native publication failed");
    const program = invocation.program(async () => {
      throw failure;
    });
    if (!Effect.isEffect(program)) throw new Error("Expected native Effect");
    expect(await Effect.runPromise(Effect.flip(program))).toBe(failure);
  });
}
