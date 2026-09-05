import { closeSync, existsSync, fstatSync, openSync, unlinkSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type as schemaType } from "@orpc/contract";
import type { WithEffectContext } from "@orpc/experimental-effect";
import "@orpc/experimental-effect/extensions/effect";
import { createRouterClient, implement } from "@orpc/server";
import { Cause, Effect, type Exit } from "effect";
import { Type } from "typebox";
import { expect, test } from "vitest";

import { orderBootgraph } from "../../runtime/bootgraph/src/index";
import { type CompiledSurfacePlan, compileRuntimePlan } from "../../runtime/compiler/src/index";
import {
  type AppRole,
  defineApp,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineService,
  providerFx,
  providerSelection,
  type RuntimeResourceMap,
  readExecutionProjection,
  requireResource,
  resourceDep,
  sealService,
} from "../../runtime/definition/src/index";
import { deriveRuntimeArtifacts } from "../../runtime/derivation/src/index";
import {
  createAgentToolsAdapter,
  createDesktopBackgroundAdapter,
  createProcessRuntime,
  type SurfaceAdapter,
} from "../../runtime/process-runtime/src/index";
import { provisionProcess } from "../../runtime/substrate/effect/src/index";
import { defineTool, type ToolExecutionContext } from "../src/plugins/agent/effect/index";
import { defineAgentToolPlugin, useService } from "../src/plugins/agent/index";
import { toolSchema } from "../src/plugins/agent/schema/index";
import {
  type DesktopBackgroundExecutionContext,
  defineDesktopBackground,
} from "../src/plugins/desktop/effect/index";
import { defineDesktopBackgroundPlugin } from "../src/plugins/desktop/index";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function start(roles: readonly AppRole[] = ["agent", "desktop"]) {
  const appRoot = await mkdtemp(join(tmpdir(), "habitat-adapters-"));
  const leasePath = join(appRoot, "adapters.lease");
  const calls = { build: 0, acquire: 0, release: 0, construct: 0, service: 0, body: 0, decode: 0 };
  const events: string[] = [];
  const captured: RuntimeResourceMap[] = [];
  const entered = deferred();
  const finalizing = deferred();
  const finish = deferred();
  const streamCleanup = deferred();
  const finishStream = deferred();
  let cancelExit: Exit.Exit<never, never> | undefined;
  const failure = Object.freeze({ _tag: "AdapterFailure", id: "exact-native-error" });
  const defect = new Error("exact-native-adapter-defect");
  const lease = defineRuntimeResource<"adapters.lease", { readonly fd: number }>({
    id: "adapters.lease",
    title: "Adapter lease",
    purpose: "Actual tool and background process lifetime",
  });
  const optionalResource = defineRuntimeResource<"adapters.optional", string>({
    id: "adapters.optional",
    title: "Optional adapter value",
    purpose: "Declared absence proof",
  });
  const required = requireResource({ resource: lease, reason: "Selected plugin file lease" });
  const optional = requireResource({
    resource: optionalResource,
    reason: "No selected provider is required",
    optional: true,
  });
  const foreign = requireResource({ resource: lease, reason: "Not declared", optional: true });
  const provider = defineRuntimeProvider({
    id: "adapters.provider",
    title: "Adapter lease provider",
    provides: lease,
    requires: [],
    build() {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          const fd = openSync(leasePath, "wx");
          calls.acquire++;
          events.push("acquired");
          return { fd };
        }),
        release: ({ fd }) =>
          Effect.sync(() => {
            closeSync(fd);
            unlinkSync(leasePath);
            calls.release++;
            events.push("released");
          }),
      });
    },
  });
  const definition = defineService({ id: "adapters.reader", deps: { lease: resourceDep(lease) } });
  const contract = definition.oc.router({
    read: definition.oc.input(schemaType<string>()).output(schemaType<string>()),
  });
  const reader = sealService(definition, {
    contract,
    construct({ clients, deps }) {
      calls.construct++;
      const native = implement(contract).$context<WithEffectContext<never>>();
      const router = native.router({
        read: native.read.effect(function* ({ input }) {
          calls.service++;
          yield* Effect.sync(() => fstatSync(deps.lease.fd));
          return `native:${input}`;
        }),
      });
      return {
        kind: "service.client.construction-bound",
        serviceId: definition.id,
        withInvocation: () =>
          clients.bind({
            context: () => ({}),
            createNativeClient: (options) => createRouterClient(router, options),
          }),
      };
    },
  });
  const services = { reader: useService(reader) };
  const input = toolSchema.object({ value: toolSchema.string() });
  const read = defineTool({
    id: "read",
    description: "Read through the selected native service",
    input,
    effect: function* (context: ToolExecutionContext<{ value: string }, typeof services>) {
      calls.body++;
      captured.push(context.resources);
      expect(context.resources.has(required)).toBe(true);
      expect(fstatSync(context.resources.get(required).fd).isFile()).toBe(true);
      expect(context.resources.has(optional)).toBe(false);
      expect(context.resources.get(optional)).toBeUndefined();
      expect(() => context.resources.has(foreign)).toThrow("outside this selected plugin");
      expect(() => context.resources.get(foreign)).toThrow("outside this selected plugin");
      expect(() => context.resources.get({ ...required })).toThrow("outside this selected plugin");
      const result = yield* context.clients.reader
        .withInvocation({ invocation: undefined })
        .read(context.input.value);
      return { result, execution: context.execution };
    },
  });
  const failed = defineTool({
    id: "failure",
    description: "Native typed failure",
    input,
    effect: () => {
      calls.body++;
      return Effect.fail(failure);
    },
  });
  const died = defineTool({
    id: "defect",
    description: "Native defect",
    input,
    effect: () => {
      calls.body++;
      return Effect.die(defect);
    },
  });
  let attempts = 0;
  const retry = defineTool({
    id: "retry",
    description: "Invocation-local decode and native retry",
    input: Type.Refine(input, () => {
      calls.decode++;
      return true;
    }),
    policy: { retry: { times: 1 } },
    effect: (context) => {
      calls.body++;
      return ++attempts === 1 ? Effect.fail(failure) : Effect.succeed(context.input.value);
    },
  });
  const cancel = defineTool({
    id: "cancel",
    description: "Native cancellation and finalization",
    input,
    effect: () => {
      calls.body++;
      return Effect.onExit(
        Effect.ensuring(
          Effect.gen(function* () {
            entered.resolve();
            return yield* Effect.never;
          }),
          Effect.promise(async () => {
            events.push("finalizing");
            finalizing.resolve();
            await finish.promise;
            events.push("finalized");
          })
        ),
        (exit) =>
          Effect.sync(() => {
            cancelExit = exit;
          })
      );
    },
  });
  const stream = defineTool({
    id: "stream",
    description: "Captured ready values remain available through stream cleanup",
    input,
    effect: (context) => {
      calls.body++;
      captured.push(context.resources);
      return Effect.succeed(
        (async function* () {
          try {
            const value = context.resources.get(required);
            yield fstatSync(value.fd).isFile();
          } finally {
            streamCleanup.resolve();
            await finishStream.promise;
            expect(fstatSync(context.resources.get(required).fd).isFile()).toBe(true);
            events.push("stream-finalized");
          }
        })()
      );
    },
  });
  const background = defineDesktopBackground({
    id: "refresh",
    cadence: "30 seconds",
    effect: (context: DesktopBackgroundExecutionContext<typeof services>) =>
      Effect.gen(function* () {
        calls.body++;
        expect(fstatSync(context.resources.get(required).fd).isFile()).toBe(true);
        return yield* context.clients.reader
          .withInvocation({ invocation: undefined })
          .read("background");
      }),
  });
  const agent = defineAgentToolPlugin.factory()({
    capability: "lease-tools",
    services,
    resourceRequirements: [required, optional],
    tools: [read, failed, died, retry, cancel, stream],
  })();
  const desktop = defineDesktopBackgroundPlugin.factory()({
    capability: "lease-background",
    services,
    resourceRequirements: [required, optional],
    backgrounds: [background],
  })();
  const app = defineApp({ id: "adapters.app", plugins: [agent, desktop] });
  const profile = defineRuntimeProfile({
    id: "adapters.profile",
    providers: [providerSelection({ resource: lease, provider })],
  });
  function derive(selectedRoles: readonly AppRole[]) {
    const process = defineProcessCatalog({
      main: { id: "adapters.process", roles: selectedRoles },
    }).main;
    const entrypoint = defineEntrypoint({
      id: "adapters.entrypoint",
      app,
      profile,
      process,
      identity: {
        app: app.id,
        process: process.id,
        entrypoint: "adapters.entrypoint",
        deployment: "test",
        source: "sdk-adapter-proof",
      },
    });
    return deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  }
  const derivation = derive(roles);
  const compilation = compileRuntimePlan({ derivation });
  const bootgraph = orderBootgraph(compilation.plan.bootgraphInput);
  expect(calls).toEqual({
    build: 0,
    acquire: 0,
    release: 0,
    construct: 0,
    service: 0,
    body: 0,
    decode: 0,
  });
  const provisioned = await provisionProcess({ compilation, bootgraph, sources: { appRoot } });
  try {
    const runtime = await createProcessRuntime({
      compilation,
      provisioned,
      descriptorTable: derivation.executionDescriptorTable,
    });
    return {
      runtime,
      compilation,
      derivation,
      derive,
      calls,
      events,
      captured,
      required,
      leasePath,
      read,
      background,
      failure,
      defect,
      entered,
      finalizing,
      finish,
      streamCleanup,
      finishStream,
      cancelExit: () => cancelExit,
      async cleanup() {
        finish.resolve();
        finishStream.resolve();
        await runtime.stop();
        await rm(appRoot, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await provisioned.managedRuntime.dispose();
    await rm(appRoot, { recursive: true, force: true });
    throw error;
  }
}

function surface(fixture: Awaited<ReturnType<typeof start>>, role: AppRole) {
  const result = fixture.compilation.plan.surfaces.find((candidate) => candidate.role === role);
  if (result === undefined) throw new Error(`No selected ${role} surface in this fixture.`);
  return result;
}

function lowerTools(fixture: Awaited<ReturnType<typeof start>>) {
  return fixture.runtime.lower(
    surface(fixture, "agent"),
    createAgentToolsAdapter({ harness: "test-agent" })
  );
}

test("lowers exact cold occurrences and invokes real native service clients with bounded ready resources", async () => {
  const fixture = await start();
  try {
    const tools = lowerTools(fixture);
    const desktop = fixture.runtime.lower(
      surface(fixture, "desktop"),
      createDesktopBackgroundAdapter({ harness: "test-desktop" })
    );
    expect(fixture.calls).toMatchObject({ build: 1, acquire: 1, service: 0, body: 0, decode: 0 });
    expect(fixture.calls.construct).toBe(fixture.compilation.plan.serviceBindings.length);
    expect(Object.isFrozen(tools.payload)).toBe(true);
    const read = tools.payload.find((tool) => tool.id === "read")!;
    expect(read.inputSchema).toBe(fixture.read.inputSchema);
    expect(read.description).toBe(fixture.read.description);
    expect(tools.payloadSchemas).toContain(fixture.read.inputSchema);
    expect(tools.findings).toEqual([]);
    expect(desktop.payloadSchemas).toEqual([]);
    expect(desktop.payload[0]?.cadence).toBe(fixture.background.cadence);
    const plan = surface(fixture, "agent");
    expect(tools.observations).toEqual([
      {
        kind: "surface.lowered",
        surfacePlanId: plan.surfacePlanId,
        executionIds: plan.executionDescriptorRefs.map((ref) => ref.executionId),
      },
    ]);
    for (const ref of plan.executionDescriptorRefs) {
      const descriptor = fixture.derivation.executionDescriptorTable.get(ref);
      expect(fixture.runtime.registry.get(ref).descriptor).toBe(descriptor);
      if (ref.boundary === "plugin.agent-tool" && ref.toolId === "read") {
        expect(readExecutionProjection(descriptor)).toMatchObject({ input: read.inputSchema });
      }
    }
    await expect(
      read.invoke({ value: "tool" }, { requestId: "tool-request" })
    ).resolves.toMatchObject({
      result: "native:tool",
      execution: { role: "agent", surface: "agent/tools", requestId: "tool-request" },
    });
    await expect(desktop.payload[0]!.run()).resolves.toBe("native:background");
    expect(fixture.calls).toMatchObject({ service: 2, body: 2, acquire: 1, release: 0 });
    expect(() => fixture.captured[0]!.get(fixture.required)).toThrow("continuation is expired");
  } finally {
    await fixture.cleanup();
  }
});

test("refuses wrong, copied and unselected surfaces before calling the adapter", async () => {
  const fixture = await start(["desktop"]);
  let lowerCalls = 0;
  const adapter: SurfaceAdapter<CompiledSurfacePlan, null> = {
    role: "desktop",
    surface: "desktop/background",
    harness: "test-desktop",
    lower() {
      lowerCalls++;
      return { payload: null, payloadSchemas: [], findings: [], observations: [] };
    },
  };
  try {
    const selected = surface(fixture, "desktop");
    const sibling = compileRuntimePlan({ derivation: fixture.derive(["agent"]) }).plan.surfaces[0]!;
    expect(() => fixture.runtime.lower({ ...selected }, adapter)).toThrow(TypeError);
    expect(() => fixture.runtime.lower(selected, { ...adapter, role: "agent" })).toThrow(TypeError);
    expect(() => fixture.runtime.lower(selected, { ...adapter, surface: "agent/tools" })).toThrow(
      TypeError
    );
    expect(() =>
      fixture.runtime.lower(sibling, { ...adapter, role: "agent", surface: "agent/tools" })
    ).toThrow(TypeError);
    expect(lowerCalls).toBe(0);
    expect(fixture.calls).toMatchObject({ acquire: 1, body: 0, service: 0 });
    expect(fixture.runtime.lower(selected, adapter).payload).toBeNull();
    expect(lowerCalls).toBe(1);
  } finally {
    await fixture.cleanup();
  }
});

test("validates raw input once per invocation across managed retries and preserves native failures", async () => {
  const fixture = await start(["agent"]);
  try {
    const tools = lowerTools(fixture);
    const tool = (id: string) => tools.payload.find((candidate) => candidate.id === id)!;
    await expect(tool("read").invoke({ value: 42 })).rejects.toThrow(TypeError);
    expect(fixture.calls).toMatchObject({ body: 0, service: 0, decode: 0 });
    await expect(tool("retry").invoke({ value: "retried" })).resolves.toBe("retried");
    expect(fixture.calls).toMatchObject({ body: 2, decode: 1 });
    await expect(tool("retry").invoke({ value: "fresh" })).resolves.toBe("fresh");
    expect(fixture.calls).toMatchObject({ body: 3, decode: 2 });
    await expect(tool("failure").invoke({ value: "fail" })).rejects.toBe(fixture.failure);
    await expect(tool("defect").invoke({ value: "die" })).rejects.toBe(fixture.defect);
  } finally {
    await fixture.cleanup();
  }
});

test("AbortSignal interrupts a native tool while stop drains its real finalizer before releasing", async () => {
  const fixture = await start(["agent"]);
  const abort = new AbortController();
  try {
    const tools = lowerTools(fixture);
    const tool = tools.payload.find((candidate) => candidate.id === "cancel")!;
    const pending = tool.invoke({ value: "cancel" }, { signal: abort.signal });
    const rejected = expect(pending).rejects.toThrow("interrupted");
    await fixture.entered.promise;
    abort.abort();
    await fixture.finalizing.promise;
    let stopped = false;
    const stopping = fixture.runtime.stop().then(() => {
      stopped = true;
    });
    await expect(tool.invoke({ value: "new-root" })).rejects.toThrow("admission is closed");
    expect(() => lowerTools(fixture)).toThrow("admission is closed");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stopped).toBe(false);
    expect(existsSync(fixture.leasePath)).toBe(true);
    expect(fixture.calls.release).toBe(0);
    fixture.finish.resolve();
    await rejected;
    await stopping;
    const exit = fixture.cancelExit();
    expect(exit?._tag === "Failure" && Cause.hasInterruptsOnly(exit.cause)).toBe(true);
    expect(fixture.events).toEqual(["acquired", "finalizing", "finalized", "released"]);
    expect(fixture.calls).toMatchObject({ acquire: 1, release: 1, body: 1 });
    expect(existsSync(fixture.leasePath)).toBe(false);
  } finally {
    abort.abort();
    await fixture.cleanup();
  }
});

test("a returned native iterator retains its captured resource view through stop and cleanup", async () => {
  const fixture = await start(["agent"]);
  let iterator: AsyncGenerator<unknown, unknown> | undefined;
  try {
    const tool = lowerTools(fixture).payload.find((candidate) => candidate.id === "stream")!;
    // The host payload deliberately erases output types; this fixture authors an async generator.
    iterator = (await tool.invoke({ value: "stream" })) as AsyncGenerator<unknown, unknown>;
    const map = fixture.captured[0]!;
    let stopped = false;
    const stopping = fixture.runtime.stop().then(() => {
      stopped = true;
    });
    expect(await iterator.next()).toEqual({ done: false, value: true });
    await expect(tool.invoke({ value: "unrelated-root" })).rejects.toThrow("admission is closed");
    const returning = iterator.return(undefined);
    await fixture.streamCleanup.promise;
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stopped).toBe(false);
    expect(existsSync(fixture.leasePath)).toBe(true);
    expect(fixture.calls.release).toBe(0);
    fixture.finishStream.resolve();
    await returning;
    await stopping;
    expect(fixture.events).toEqual(["acquired", "stream-finalized", "released"]);
    expect(fixture.calls).toMatchObject({ acquire: 1, release: 1, body: 1 });
    expect(() => map.get(fixture.required)).toThrow("continuation is expired");
    expect(existsSync(fixture.leasePath)).toBe(false);
  } finally {
    fixture.finishStream.resolve();
    await iterator?.return(undefined);
    await fixture.cleanup();
  }
});
