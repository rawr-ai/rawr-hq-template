import { closeSync, fstatSync, openSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { expect, test } from "vitest";
import {
  defineApp,
  defineEntrypoint,
  defineProcessCatalog,
  type NativeIntegration,
  type StartedProcess,
  startApp,
} from "../src/app/index";
import { defineTool } from "../src/plugins/agent/effect/index";
import { defineAgentToolPlugin } from "../src/plugins/agent/index";
import { toolSchema } from "../src/plugins/agent/schema/index";
import { defineDesktopBackground } from "../src/plugins/desktop/effect/index";
import { defineDesktopBackgroundPlugin } from "../src/plugins/desktop/index";
import type {
  AgentToolMountRecord,
  DesktopBackgroundMountRecord,
  LoweredAgentTool,
  NativeIntegrationHarness,
} from "../src/runtime/harnesses/index";
import { defineRuntimeProfile, providerSelection } from "../src/runtime/profiles/index";
import { providerFx } from "../src/runtime/providers/effect/index";
import { defineRuntimeProvider } from "../src/runtime/providers/index";
import { defineRuntimeResource, requireResource } from "../src/runtime/resources/index";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fixture(
  root: string,
  harnesses: readonly string[] = ["test.http"],
  healthRequired = false
) {
  const calls: string[] = [];
  const entered = deferred();
  const finishInvocation = deferred();
  let ordinal = 0;
  const file = defineRuntimeResource<"start.file", number>({
    id: "start.file",
    title: "Start file",
    purpose: "Verify selected lease lifetime",
  });
  const required = requireResource({ resource: file, reason: "Selected real file" });
  const provider = defineRuntimeProvider({
    id: "start.provider",
    title: "Start provider",
    provides: file,
    requires: [],
    ...(healthRequired ? { health: { kind: "provider.health" as const, required: true } } : {}),
    build() {
      calls.push("build");
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          calls.push("acquire");
          return openSync(join(root, `lease-${++ordinal}`), "wx");
        }),
        release: (fd) =>
          Effect.sync(() => {
            closeSync(fd);
            calls.push("release");
          }),
      });
    },
  });
  const plugin = defineAgentToolPlugin.factory()({
    capability: "start-tools",
    services: {},
    resourceRequirements: [required],
    tools: [
      defineTool({
        id: "read",
        description: "Read actual selected resource",
        input: toolSchema.object({ value: toolSchema.string() }),
        effect: function* (context) {
          calls.push("execute");
          if (context.input.value === "hold") {
            entered.resolve();
            yield* Effect.promise(() => finishInvocation.promise);
          }
          expect(fstatSync(context.resources.get(required)).isFile()).toBe(true);
          return context.input.value;
        },
      }),
    ],
  })();
  const app = defineApp({ id: "start.app", plugins: [plugin] });
  const profile = defineRuntimeProfile({
    id: "local",
    providers: [providerSelection({ resource: file, provider })],
    harnesses,
  });
  const process = defineProcessCatalog({ main: { id: "main", roles: ["agent"] } }).main;
  function entrypoint(id: string) {
    return defineEntrypoint({
      id,
      app,
      profile,
      process,
      identity: {
        app: app.id,
        process: process.id,
        entrypoint: id,
        deployment: "local",
        source: "sdk-start-test",
      },
    });
  }
  return { calls, entered, finishInvocation, file, entrypoint };
}

test("terminal startup drives real HTTP work, truthful draining, and release after native settlement", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-start-"));
  const f = fixture(root);
  const entrypoint = f.entrypoint("first");
  const nativeCleanup = deferred();
  const finishNative = deferred();
  let runtime: StartedProcess | undefined;
  let tool: LoweredAgentTool | undefined;
  let url = "";
  const harness: NativeIntegrationHarness<AgentToolMountRecord> = {
    id: "test.http",
    roles: ["agent"],
    surfaces: ["agent/tools"],
    async mount(input) {
      expect(input.launchIdentity).toBe(entrypoint.identity);
      expect(input).not.toHaveProperty("compilation");
      expect(input.mountReadyPayloads[0]).not.toHaveProperty("plan");
      expect(f.calls).toEqual(["build", "acquire"]);
      tool = input.mountReadyPayloads[0].payload[0];
      const selected = tool;
      const server = createServer((request, response) => {
        const value = new URL(request.url ?? "/", "http://localhost").searchParams.get("value");
        selected.invoke({ value }).then(
          (result) => response.end(String(result)),
          () => {
            response.statusCode = 503;
            response.end("closed");
          }
        );
      });
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
      });
      const address = server.address();
      if (address === null || typeof address === "string")
        throw new TypeError("Missing test listener");
      url = `http://127.0.0.1:${address.port}`;
      f.calls.push("mount");
      let stopping: Promise<void> | undefined;
      return {
        readiness: async () => ({
          launchIdentity: input.launchIdentity,
          harnessId: harness.id,
          kind: "readiness",
          status: "passing",
          findings: [],
        }),
        stop: () =>
          (stopping ??= (async () => {
            f.calls.push("native.stop");
            input.reports.report({
              launchIdentity: input.launchIdentity,
              harnessId: harness.id,
              kind: "readiness",
              status: "passing",
              findings: [],
            });
            await new Promise<void>((resolve, reject) =>
              server.close((error) => (error === undefined ? resolve() : reject(error)))
            );
            expect(fstatSync(input.processAccess.resource(f.file)).isFile()).toBe(true);
            nativeCleanup.resolve();
            await finishNative.promise;
            f.calls.push("native.stopped");
          })()),
      };
    },
  };
  try {
    runtime = await startApp(entrypoint, {
      sources: { appRoot: root },
      integrations: [{ surface: "agent/tools", harness }],
      finalization: { policy: "waitForNativeStop", deadlineMs: 0 },
      observation: {
        sink: {
          publish() {
            throw new Error("sink unavailable");
          },
        },
      },
    });
    expect(runtime.identity).toBe(entrypoint.identity);
    expect(Object.keys(runtime).sort()).toEqual([
      "catalog",
      "finalization",
      "health",
      "identity",
      "roles",
      "stop",
      "telemetry",
    ]);
    expect((await runtime.health("readiness")).status).toBe("passing");
    expect((await runtime.health("liveness")).status).toBe("unknown");
    const initial = runtime.catalog();
    expect(initial.lifecycleStatus).toMatchObject({
      provisioning: "ready",
      binding: "ready",
      adapters: "ready",
      mounting: "mounted",
      execution: "unobserved",
      finalization: "unobserved",
    });
    expect(initial.executionRegistry.status).toBe("ready");
    expect(initial.harnesses[0]).toMatchObject({
      mountStatus: "mounted",
      readiness: "passing",
      liveness: "unknown",
    });
    expect(initial.startupRecords.map((record) => record.kind)).toEqual([
      "provisioning.ready",
      "binding.ready",
      "adapters.ready",
      "harness.mounted",
      "process.started",
      "harness.health",
    ]);
    expect(
      initial.startupRecords.every(
        (record) => JSON.stringify(record.identity) === JSON.stringify(entrypoint.identity)
      )
    ).toBe(true);
    expect(await (await fetch(`${url}/?value=ready`)).text()).toBe("ready");
    const pending = fetch(`${url}/?value=hold`).then((response) => response.text());
    await f.entered.promise;
    const stopping = runtime.stop();
    expect(runtime.stop()).toBe(stopping);
    await expect(tool!.invoke({ value: "new-root" })).rejects.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(runtime.finalization()).toMatchObject({
      state: "draining",
      deadlineExceeded: true,
      pendingNativeStop: ["test.http"],
    });
    expect(f.calls).not.toContain("release");
    expect(runtime.catalog().lifecycleStatus.finalization).toBe("draining");
    expect(runtime.catalog().finalization.pendingNativeStop).toEqual(["test.http"]);
    expect(runtime.catalog().harnesses[0].readiness).toBe("failing");
    f.finishInvocation.resolve();
    expect(await pending).toBe("hold");
    await nativeCleanup.promise;
    expect(f.calls).not.toContain("release");
    finishNative.resolve();
    await stopping;
    expect(runtime.finalization()).toMatchObject({ state: "settled", deadlineExceeded: true });
    expect(f.calls.slice(-2)).toEqual(["native.stopped", "release"]);
    expect(runtime.stop()).toBe(stopping);
    expect(runtime.catalog().harnesses).toHaveLength(1);
    expect(runtime.catalog().harnesses[0]).toMatchObject({
      readiness: "failing",
      stopStatus: "resolved",
    });
    expect(runtime.catalog().lifecycleStatus.finalization).toBe("settled");
    expect(runtime.catalog().finalizationRecords.map((record) => record.kind)).toEqual([
      "process.finalization.started",
      "process.finalization.deadline",
      "harness.stop.settled",
      "process.finalization.settled",
    ]);
    expect(
      runtime
        .catalog()
        .diagnostics.filter((record) => record.recordKind === "finalization")
        .every((record) => record.phase === "observation")
    ).toBe(true);
  } finally {
    f.finishInvocation.resolve();
    finishNative.resolve();
    await runtime?.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("registration refusal precedes acquisition and does not change selection", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-start-admission-"));
  const f = fixture(root);
  const harness: NativeIntegrationHarness<AgentToolMountRecord> = {
    id: "test.http",
    roles: ["agent"],
    surfaces: ["agent/tools"],
    async mount() {
      f.calls.push("mount");
      return { stop: async () => {} };
    },
  };
  const valid: NativeIntegration = { surface: "agent/tools", harness };
  try {
    for (const integrations of [
      [],
      [valid, valid],
      [{ ...valid, harness: { ...harness, id: "foreign" } }],
      [{ surface: "none", harness: { ...harness, surfaces: [] } }],
    ] satisfies (readonly NativeIntegration[])[]) {
      await expect(
        startApp(f.entrypoint("admission"), {
          sources: { appRoot: root },
          integrations,
          finalization: { policy: "waitForNativeStop", deadlineMs: 100 },
        })
      ).rejects.toThrow(TypeError);
      expect(f.calls).toEqual([]);
    }
    await expect(
      startApp(f.entrypoint("policy"), {
        sources: { appRoot: root },
        integrations: [valid],
        finalization: { policy: "waitForNativeStop", deadlineMs: Infinity },
      })
    ).rejects.toThrow(TypeError);
    expect(f.calls).toEqual([]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a later native mount failure stops its prefix and preserves the original error", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-start-rollback-"));
  const f = fixture(root, ["first", "last"]);
  const failure = new Error("private mount failure");
  const first: NativeIntegrationHarness<AgentToolMountRecord> = {
    id: "first",
    roles: ["agent"],
    surfaces: ["agent/tools"],
    async mount() {
      f.calls.push("first.mount");
      return {
        async stop() {
          f.calls.push("first.stop");
        },
      };
    },
  };
  const last: NativeIntegrationHarness<AgentToolMountRecord> = {
    ...first,
    id: "last",
    async mount() {
      f.calls.push("last.mount");
      throw failure;
    },
  };
  try {
    await expect(
      startApp(f.entrypoint("rollback"), {
        sources: { appRoot: root },
        integrations: [
          { surface: "agent/tools", harness: first },
          { surface: "agent/tools", harness: last },
        ],
        finalization: { policy: "waitForNativeStop", deadlineMs: 100 },
      })
    ).rejects.toBe(failure);
    expect(f.calls).toEqual([
      "build",
      "acquire",
      "first.mount",
      "last.mount",
      "first.stop",
      "release",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("unknown required provider health refuses mounting and releases the acquired lease", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-start-readiness-"));
  const f = fixture(root, ["test.http"], true);
  try {
    await expect(
      startApp(f.entrypoint("health"), {
        sources: { appRoot: root },
        integrations: [
          {
            surface: "agent/tools",
            harness: {
              id: "test.http",
              roles: ["agent"],
              surfaces: ["agent/tools"],
              async mount() {
                f.calls.push("mount");
                return { stop: async () => {} };
              },
            },
          },
        ],
        finalization: { policy: "waitForNativeStop", deadlineMs: 100 },
      })
    ).rejects.toThrow(TypeError);
    expect(f.calls).toEqual(["build", "acquire", "release"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a throwing optional native getter cannot release beneath its successfully returned stop handle", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-start-custody-"));
  const f = fixture(root);
  const stopping = deferred();
  const finish = deferred();
  const error = new Error("private getter failure");
  const records: import("../src/runtime/observation/index").RuntimeTelemetryRecord[] = [];
  const pending = startApp(f.entrypoint("custody"), {
    sources: { appRoot: root },
    finalization: { policy: "waitForNativeStop", deadlineMs: 1000 },
    observation: {
      sink: {
        publish(record) {
          records.push(record);
        },
      },
    },
    integrations: [
      {
        surface: "agent/tools",
        harness: {
          id: "test.http",
          roles: ["agent"],
          surfaces: ["agent/tools"],
          async mount(input) {
            return {
              async stop() {
                stopping.resolve();
                await finish.promise;
                expect(fstatSync(input.processAccess.resource(f.file)).isFile()).toBe(true);
                f.calls.push("native.stopped");
              },
              get readiness(): () => Promise<
                import("../src/runtime/harnesses/index").HarnessHealthReport
              > {
                throw error;
              },
            };
          },
        },
      },
    ],
  }).then(
    () => undefined,
    (failure: unknown) => failure
  );
  try {
    await stopping.promise;
    expect(f.calls).not.toContain("release");
    finish.resolve();
    expect(await pending).toBe(error);
    expect(f.calls.slice(-2)).toEqual(["native.stopped", "release"]);
    expect(records.some((record) => record.name === "harness.stop.settled")).toBe(true);
    expect(records.some((record) => record.name === "harness.mounted")).toBe(false);
    expect(JSON.stringify(records)).not.toContain("private getter failure");
  } finally {
    finish.resolve();
    await pending;
    await rm(root, { recursive: true, force: true });
  }
});

test("identical selected process starts have independent leases, stops and observations", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-start-isolation-"));
  const f = fixture(root);
  const tools: LoweredAgentTool[] = [];
  const harness: NativeIntegrationHarness<AgentToolMountRecord> = {
    id: "test.http",
    roles: ["agent"],
    surfaces: ["agent/tools"],
    async mount(input) {
      tools.push(input.mountReadyPayloads[0].payload[0]);
      return { async stop() {} };
    },
  };
  const options = {
    sources: { appRoot: root },
    integrations: [{ surface: "agent/tools", harness }],
    finalization: { policy: "waitForNativeStop", deadlineMs: 100 },
  } satisfies Parameters<typeof startApp>[1];
  const started: StartedProcess[] = [];
  try {
    const entrypoint = f.entrypoint("same");
    started.push(await startApp(entrypoint, options));
    started.push(await startApp(entrypoint, options));
    await started[0].stop();
    await expect(tools[0].invoke({ value: "closed" })).rejects.toThrow();
    expect(await tools[1].invoke({ value: "sibling" })).toBe("sibling");
    expect(started[0].finalization()).toMatchObject({ state: "settled" });
    expect(started[1].finalization()).toMatchObject({ state: "running" });
    expect(f.calls.filter((value) => value === "release")).toHaveLength(1);
    await started[1].stop();
    started.push(await startApp(entrypoint, options));
    expect(await tools[2].invoke({ value: "restart" })).toBe("restart");
    expect(f.calls.filter((value) => value === "acquire")).toHaveLength(3);
  } finally {
    for (const runtime of started) await runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("an explicitly selected empty-payload host has neutral health, not fabricated passing evidence", async () => {
  const app = defineApp({ id: "empty.app", plugins: [] });
  const profile = defineRuntimeProfile({ id: "empty", providers: [], harnesses: ["empty"] });
  const process = defineProcessCatalog({ main: { id: "empty", roles: ["agent"] } }).main;
  const entrypoint = defineEntrypoint({
    id: "empty",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "empty",
      deployment: "test",
      source: "sdk",
    },
  });
  const runtime = await startApp(entrypoint, {
    sources: { appRoot: tmpdir() },
    integrations: [
      {
        surface: "none",
        harness: {
          id: "empty",
          roles: ["agent", "desktop"],
          surfaces: [],
          async mount(input) {
            expect(input.roles).toEqual(["agent"]);
            expect(input.mountReadyPayloads).toEqual([]);
            return {
              stop: async () => {},
              readiness: async () => ({
                launchIdentity: input.launchIdentity,
                harnessId: "empty",
                kind: "readiness",
                status: "not-applicable",
                findings: [],
              }),
            };
          },
        },
      },
    ],
    finalization: { policy: "waitForNativeStop", deadlineMs: 100 },
  });
  try {
    expect((await runtime.health("readiness")).status).toBe("not-applicable");
    expect(runtime.roles).toEqual(["agent"]);
  } finally {
    await runtime.stop();
  }
});

test("native registration rejects a payload consumer narrower than the selected operation contract", () => {
  if (false) {
    const narrow = {
      id: "narrow",
      roles: ["agent" as const],
      surfaces: ["agent/tools"],
      async mount(
        _input: import("../src/runtime/harnesses/index").HarnessMountInput<
          AgentToolMountRecord & { readonly privateExtra: true }
        >
      ) {
        return { stop: async () => {} };
      },
    };
    // @ts-expect-error Method bivariance cannot erase an incompatible native payload requirement.
    const bad: NativeIntegration = { surface: "agent/tools", harness: narrow };
    void bad;
  }
  expect(true).toBe(true);
});

test("one multi-surface descriptor mounts both admitted record families once", async () => {
  const agent = defineAgentToolPlugin.factory()({
    capability: "cohost",
    services: {},
    tools: [
      defineTool({
        id: "tool",
        description: "Cohosted",
        input: toolSchema.object({}),
        effect: function* () {
          return "tool";
        },
      }),
    ],
  })();
  const desktop = defineDesktopBackgroundPlugin.factory()({
    capability: "cohost",
    services: {},
    backgrounds: [
      defineDesktopBackground({
        id: "background",
        cadence: "1 seconds",
        effect: function* () {
          return "background";
        },
      }),
    ],
  })();
  const app = defineApp({ id: "cohost.app", plugins: [agent, desktop] });
  const profile = defineRuntimeProfile({ id: "cohost", providers: [], harnesses: ["cohost"] });
  const process = defineProcessCatalog({
    main: { id: "cohost", roles: ["agent", "desktop"] },
  }).main;
  const entrypoint = defineEntrypoint({
    id: "cohost",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "cohost",
      deployment: "test",
      source: "sdk",
    },
  });
  const results: unknown[] = [];
  const harness: NativeIntegrationHarness<AgentToolMountRecord | DesktopBackgroundMountRecord> & {
    mounts: number;
  } = {
    id: "cohost",
    roles: ["agent", "desktop"],
    surfaces: ["agent/tools", "desktop/background"],
    mounts: 0,
    async mount(input) {
      this.mounts++;
      expect(input.mountReadyPayloads.map((record) => record.surface).sort()).toEqual([
        "agent/tools",
        "desktop/background",
      ]);
      for (const record of input.mountReadyPayloads) {
        for (const operation of record.payload)
          results.push(await ("invoke" in operation ? operation.invoke({}) : operation.run()));
      }
      return { stop: async () => {} };
    },
  };
  const runtime = await startApp(entrypoint, {
    sources: { appRoot: tmpdir() },
    integrations: [
      { surface: "agent/tools", harness },
      { surface: "desktop/background", harness },
    ],
    finalization: { policy: "waitForNativeStop", deadlineMs: 100 },
  });
  try {
    expect(harness.mounts).toBe(1);
    expect(results.sort()).toEqual(["background", "tool"]);
  } finally {
    await runtime.stop();
  }
});
