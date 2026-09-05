import { expect, test } from "bun:test";
import { Cause, Exit, Effect as NativeEffect } from "effect";
import { Type } from "typebox";

import {
  type AppRole,
  defineAgentToolPlugin,
  defineApp,
  defineDesktopBackground,
  defineDesktopBackgroundPlugin,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineTool,
  type PluginDefinition,
  type ProcedureExecutionContext,
  readExecutionProjection,
  type ToolExecutionContext,
} from "../../definition/src/index";
import { executionDescriptorId } from "../src/identity-policy";
import { deriveRuntimeArtifacts, type ExecutionDescriptorRef } from "../src/index";

function derive(
  plugins: readonly PluginDefinition[],
  roles: readonly AppRole[] = ["agent", "desktop"]
) {
  const app = defineApp({ id: "local-effects", plugins });
  const profile = defineRuntimeProfile({ id: "local-effects", providers: [] });
  const process = defineProcessCatalog({ selected: { id: "selected", roles } }).selected;
  const entrypoint = defineEntrypoint({
    id: "local-effects",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "local-effects",
      deployment: "test",
      source: "local-effects",
    },
  });
  return deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
}

function invocation(
  ref: ExecutionDescriptorRef,
  input: unknown,
  context: object = {}
): ProcedureExecutionContext<unknown, unknown> {
  return {
    input,
    context,
    telemetry: {
      span: <A, E, R>(_name: string, effect: NativeEffect.Effect<A, E, R>) => effect,
      event: () => NativeEffect.void,
    },
    execution: {
      appId: "local-effects",
      processId: "selected",
      entrypointId: "local-effects",
      profileId: "local-effects",
      role: ref.boundary === "plugin.agent-tool" ? "agent" : "desktop",
      ownerId: ref.ownerId,
      executionId: ref.executionId,
      traceId: "native-test-trace",
    },
  };
}

// These authored fixtures have no Effect requirements; the heterogeneous table erases that fact.
function execute<A, E>(effect: NativeEffect.Effect<A, E, unknown>) {
  return NativeEffect.runPromiseExit(effect as NativeEffect.Effect<A, E>);
}

test("derives cold tool/background occurrences with exact private projection references", () => {
  let bodies = 0;
  const tool = defineTool({
    id: "read",
    description: "metadata-only-tool-description",
    input: Type.Object({ value: Type.String() }),
    policy: { retry: { times: 1 } },
    effect: () => {
      bodies++;
      return NativeEffect.succeed("tool");
    },
  });
  const background = defineDesktopBackground({
    id: "refresh",
    cadence: "60 seconds",
    effect: function* () {
      bodies++;
      return yield* NativeEffect.succeed("background");
    },
  });
  const tools = (instance: string) =>
    defineAgentToolPlugin.factory()({
      capability: "read",
      instance,
      services: {},
      tools: [tool],
    })();
  const desktop = defineDesktopBackgroundPlugin.factory()({
    capability: "refresh",
    services: {},
    backgrounds: [background],
  })();
  const result = derive([tools("first"), tools("second"), desktop]);
  const entries = result.executionDescriptorTable.entries();
  expect(entries).toHaveLength(3);
  expect(bodies).toBe(0);
  expect(result.executionDescriptorTable.entries()).toBe(entries);
  expect(Object.isFrozen(entries)).toBe(true);
  const toolEntries = entries.filter(([ref]) => ref.boundary === "plugin.agent-tool");
  expect(toolEntries).toHaveLength(2);
  expect(toolEntries[0]![0].ownerId).not.toBe(toolEntries[1]![0].ownerId);
  expect(toolEntries[0]![1]).not.toBe(toolEntries[1]![1]);
  for (const [ref, descriptor] of entries) {
    expect(Object.isFrozen(descriptor)).toBe(true);
    expect(result.executionDescriptorTable.get({ ...ref })).toBe(descriptor);
    expect(Object.keys(descriptor)).toEqual(["kind", "executionId", "boundary", "policy", "run"]);
    const projection = readExecutionProjection(descriptor);
    expect(Object.isFrozen(projection)).toBe(true);
    if (ref.boundary === "plugin.agent-tool") {
      expect(ref.executionId).toBe(
        executionDescriptorId({ boundary: ref.boundary, ownerId: ref.ownerId, toolId: tool.id })
      );
      if (projection?.kind !== "agent.tool") throw new Error("Missing tool projection.");
      expect(projection.input).toBe(tool.inputSchema);
      expect(projection.description).toBe(tool.description);
      expect(descriptor.policy).toBe(tool.policy);
    } else {
      expect(ref.boundary).toBe("plugin.desktop-background");
      expect(projection).toEqual({ kind: "desktop.background", cadence: background.cadence });
      expect(descriptor.policy).toBe(background.policy);
    }
    descriptor.run(invocation(ref, { value: "cold" }));
  }
  expect(bodies).toBe(0);
  expect(Object.keys(result)).toHaveLength(6);
  expect(result.cliCommandSources).toEqual([]);
  expect(JSON.stringify(result.portableArtifact)).not.toContain(tool.description);
  expect(JSON.stringify(result.graph)).not.toContain("inputSchema");
});

test("decodes tool input once lazily across native retries and replaces reserved context fields", async () => {
  let checks = 0;
  let calls = 0;
  const contexts: ToolExecutionContext<{ value: string }, {}>[] = [];
  const failure = Object.freeze({ _tag: "TryAgain" });
  const tool = defineTool({
    id: "retry",
    description: "retry proof",
    input: Type.Refine(Type.Object({ value: Type.String() }), () => {
      checks++;
      return true;
    }),
    effect: (context: ToolExecutionContext<{ value: string }, {}>) => {
      calls++;
      contexts.push(context);
      return calls === 1 ? NativeEffect.fail(failure) : NativeEffect.succeed(context.input.value);
    },
  });
  const result = derive(
    [defineAgentToolPlugin.factory()({ capability: "retry", services: {}, tools: [tool] })()],
    ["agent"]
  );
  const [ref, descriptor] = result.executionDescriptorTable.entries()[0]!;
  const input = Object.freeze({ value: "accepted" });
  const clients = Object.freeze({});
  const resources = Object.freeze({
    has: () => false,
    get: () => {
      throw new TypeError("No resources are declared in this fixture.");
    },
  });
  const request = invocation(ref, input, {
    input: { value: "spoofed" },
    clients,
    resources,
    telemetry: { spoofed: true },
    execution: { traceId: "spoofed" },
  });
  const program = descriptor.run(request);
  expect(checks).toBe(0);
  expect(calls).toBe(0);
  const exit = await execute(NativeEffect.retry(program, { times: 1 }));
  expect(exit).toEqual(Exit.succeed("accepted"));
  expect(checks).toBe(1);
  expect(calls).toBe(2);
  for (const context of contexts) {
    expect(context.input).toBe(input);
    expect(context.clients).toBe(clients);
    expect(context.resources).toBe(resources);
    expect(context.telemetry).toBe(request.telemetry);
    expect(context.execution).toBe(request.execution);
  }
  expect(await execute(descriptor.run(request))).toEqual(Exit.succeed("accepted"));
  expect(checks).toBe(2);
});

test("caches a rejected tool decode without invoking the body or inventing a typed domain error", async () => {
  let checks = 0;
  let calls = 0;
  const tool = defineTool({
    id: "invalid",
    description: "invalid input proof",
    input: Type.Refine(Type.Object({ value: Type.String() }), () => {
      checks++;
      return false;
    }),
    effect: () => {
      calls++;
      return NativeEffect.void;
    },
  });
  const result = derive(
    [defineAgentToolPlugin.factory()({ capability: "invalid", services: {}, tools: [tool] })()],
    ["agent"]
  );
  const [ref, descriptor] = result.executionDescriptorTable.entries()[0]!;
  const program = descriptor.run(invocation(ref, { value: "invalid" }));
  expect(checks).toBe(0);
  const first = await execute(program);
  expect(Exit.isFailure(first) && Cause.hasDies(first.cause)).toBe(true);
  expect(Exit.isFailure(first) && Cause.pretty(first.cause)).toContain("Executable input failed");
  const afterFirst = checks;
  expect(afterFirst).toBeGreaterThan(0);
  const second = await execute(program);
  expect(Exit.isFailure(second) && Cause.hasDies(second.cause)).toBe(true);
  expect(checks).toBe(afterFirst);
  expect(calls).toBe(0);
});

test("selected roles bound executable membership and duplicate local identities refuse cold", async () => {
  let calls = 0;
  const tool = defineTool({
    id: "shared",
    description: "selected tool",
    input: Type.String(),
    effect: () => {
      calls++;
      return NativeEffect.succeed("tool");
    },
  });
  const background = defineDesktopBackground({
    id: "shared",
    cadence: 1000,
    effect: function* () {
      calls++;
      return yield* NativeEffect.succeed("background");
    },
  });
  const agent = defineAgentToolPlugin.factory()({
    capability: "shared",
    services: {},
    tools: [tool],
  })();
  const desktop = defineDesktopBackgroundPlugin.factory()({
    capability: "shared",
    services: {},
    backgrounds: [background],
  })();
  const selected = derive([agent, desktop], ["desktop"]);
  const entries = selected.executionDescriptorTable.entries();
  expect(entries).toHaveLength(1);
  const [ref, descriptor] = entries[0]!;
  expect(ref.boundary).toBe("plugin.desktop-background");
  expect(calls).toBe(0);
  expect(await execute(descriptor.run(invocation(ref, undefined)))).toEqual(
    Exit.succeed("background")
  );
  expect(calls).toBe(1);
  expect(() =>
    derive(
      [
        defineAgentToolPlugin.factory()({
          capability: "duplicate",
          services: {},
          tools: [tool, tool],
        })(),
      ],
      ["agent"]
    )
  ).toThrow(TypeError);
  expect(() =>
    derive(
      [
        defineDesktopBackgroundPlugin.factory()({
          capability: "duplicate",
          services: {},
          backgrounds: [background, background],
        })(),
      ],
      ["desktop"]
    )
  ).toThrow(TypeError);
  const unadmitted = definePlugin({
    id: "unadmitted",
    role: "server",
    surface: "server/api",
    capability: "unadmitted",
    services: {},
    resourceRequirements: [],
    project: () => ({
      kind: "plugin.projection",
      facts: { tools: [tool], backgrounds: [background] },
    }),
  });
  expect(derive([unadmitted], ["server"]).executionDescriptorTable.entries()).toEqual([]);
  expect(calls).toBe(1);
});
