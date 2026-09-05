import { closeSync, fstatSync, openSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { expect, test } from "vitest";

import { orderBootgraph } from "../../runtime/bootgraph/src/index";
import { compileRuntimePlan } from "../../runtime/compiler/src/index";
import { deriveRuntimeArtifacts } from "../../runtime/derivation/src/index";
import {
  assertRequiredResourcesReady,
  createOwnerStop,
} from "../../runtime/harnesses/src/native-contract";
import {
  createAgentToolsAdapter,
  createProcessRuntime,
  type LoweredAgentTool,
  type MountReadySurfaceRuntimeRecord,
  readMountReadyProcessHandoff,
  readMountReadySurfaceRuntimeRecord,
} from "../../runtime/process-runtime/src/index";
import { provisionProcess } from "../../runtime/substrate/effect/src/index";
import { defineApp, defineEntrypoint, defineProcessCatalog } from "../src/app/index";
import { defineTool } from "../src/plugins/agent/effect/index";
import { defineAgentToolPlugin } from "../src/plugins/agent/index";
import { toolSchema } from "../src/plugins/agent/schema/index";
import type { HarnessDescriptor, NativeHarnessHandle } from "../src/runtime/harnesses/index";
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

test("a real loopback test host consumes the handoff and cleans up before provider release", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-handoff-"));
  const events: string[] = [];
  const entered = deferred();
  const finishInvocation = deferred();
  const nativeCleanup = deferred();
  const finishNative = deferred();
  let stopProcess: (() => Promise<void>) | undefined;
  let handle: NativeHarnessHandle | undefined;
  let url = "";
  let bodies = 0;
  const file = defineRuntimeResource<"handoff.file", number>({
    id: "handoff.file",
    title: "Handoff file",
    purpose: "Verify actual resource lifetime",
  });
  const required = requireResource({ resource: file, reason: "Read from the selected lease" });
  const provider = defineRuntimeProvider({
    id: "handoff.provider",
    title: "Handoff provider",
    provides: file,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          events.push("acquire");
          return openSync(join(root, "lease"), "w+");
        }),
        release: (fd) =>
          Effect.sync(() => {
            closeSync(fd);
            events.push("release");
          }),
      }),
  });
  const tool = defineTool({
    id: "read",
    description: "Exercise a real mounted payload",
    input: toolSchema.object({ value: toolSchema.string() }),
    effect: function* (context) {
      bodies++;
      if (context.input.value === "hold") {
        entered.resolve();
        yield* Effect.promise(() => finishInvocation.promise);
      }
      expect(fstatSync(context.resources.get(required)).isFile()).toBe(true);
      return context.input.value;
    },
  });
  const plugin = defineAgentToolPlugin.factory()({
    capability: "handoff",
    services: {},
    resourceRequirements: [required],
    tools: [tool],
  })();
  const app = defineApp({ id: "handoff.app", plugins: [plugin] });
  const profile = defineRuntimeProfile({
    id: "test",
    providers: [providerSelection({ resource: file, provider })],
    harnesses: ["test.http"],
  });
  const process = defineProcessCatalog({ main: { id: "main", roles: ["agent"] } }).main;
  const entrypoint = defineEntrypoint({
    id: "test",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "test",
      deployment: "local",
      source: "sdk-test",
    },
  });
  // This is a test-owned real HTTP host, not qualification of a production agent/Elysia harness.
  const descriptor: HarnessDescriptor<MountReadySurfaceRuntimeRecord<readonly LoweredAgentTool[]>> =
    {
      id: "test.http",
      roles: ["agent"],
      surfaces: ["agent/tools"],
      async mount(input) {
        assertRequiredResourcesReady(input.requiredResources);
        expect(input.launchIdentity).toBe(entrypoint.identity);
        expect(bodies).toBe(0);
        const selected = input.mountReadyPayloads[0].payload[0];
        const server = createServer((request, response) => {
          const value = new URL(request.url ?? "/", "http://localhost").searchParams.get("value");
          selected.invoke({ value }).then(
            (result) => {
              response.end(String(result));
            },
            () => {
              response.statusCode = 500;
              response.end("failed");
            }
          );
        });
        try {
          await new Promise<void>((resolve, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolve);
          });
          const address = server.address();
          if (address === null || typeof address === "string")
            throw new TypeError("Missing loopback address");
          url = `http://127.0.0.1:${address.port}`;
          events.push("mount");
          return {
            readiness: async () => ({
              launchIdentity: input.launchIdentity,
              harnessId: "test.http",
              kind: "readiness",
              status: "passing",
              findings: [],
            }),
            stop: createOwnerStop(async () => {
              events.push("native.stop");
              await new Promise<void>((resolve, reject) =>
                server.close((error) => (error === undefined ? resolve() : reject(error)))
              );
              expect(fstatSync(input.processAccess.resource(file)).isFile()).toBe(true);
              nativeCleanup.resolve();
              await finishNative.promise;
              events.push("native.stopped");
            }),
          };
        } catch (error) {
          if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
          throw error;
        }
      },
    };
  try {
    // Producer-local compilation/provisioning values are not returned to the native consumer.
    const ready = await (async () => {
      const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
      const compilation = compileRuntimePlan({ derivation });
      const provisioned = await provisionProcess({
        compilation,
        bootgraph: orderBootgraph(compilation.plan.bootgraphInput),
        sources: { appRoot: root },
      });
      const runtime = await createProcessRuntime({
        compilation,
        provisioned,
        descriptorTable: derivation.executionDescriptorTable,
      });
      stopProcess = runtime.stop;
      return runtime.prepareMounts({
        launchIdentity: entrypoint.identity,
        assignments: [
          {
            surface: compilation.plan.surfaces[0],
            adapter: createAgentToolsAdapter({ harness: descriptor.id }),
          },
        ],
      });
    })();
    expect(events).toEqual(["acquire"]);
    expect(ready.identity).toBe(entrypoint.identity);
    expect(ready.requiredResources.ready).toBe(true);
    expect(ready.records).toHaveLength(1);
    expect(ready).not.toHaveProperty("compilation");
    expect(ready.records[0]).not.toHaveProperty("plan");
    readMountReadySurfaceRuntimeRecord(ready, ready.records[0]);
    expect(() => readMountReadySurfaceRuntimeRecord(ready, { ...ready.records[0] })).toThrow(
      TypeError
    );
    const ownership = readMountReadyProcessHandoff(ready);
    ownership.claim();
    expect(() => ownership.claim()).toThrow(TypeError);
    handle = await descriptor.mount({
      launchIdentity: ready.identity,
      roles: ready.roles,
      mountReadyPayloads: ready.records,
      processAccess: ready.processAccess,
      requiredResources: ready.requiredResources,
      reports: { report() {} },
    });
    expect((await handle.readiness?.())?.launchIdentity).toBe(entrypoint.identity);
    expect(await (await fetch(`${url}/?value=ready`)).text()).toBe("ready");
    const pending = fetch(`${url}/?value=hold`).then((response) => response.text());
    await entered.promise;
    expect(ready.closeAdmission()).toBeUndefined();
    const stopped = handle.stop();
    expect(handle.stop()).toBe(stopped);
    await expect(ready.records[0].payload[0].invoke({ value: "new-root" })).rejects.toThrow();
    expect(events).not.toContain("release");
    finishInvocation.resolve();
    expect(await pending).toBe("hold");
    await nativeCleanup.promise;
    expect(events).not.toContain("native.stopped");
    expect(events).not.toContain("release");
    finishNative.resolve();
    await stopped;
    await ready.stop();
    expect(events).toEqual(["acquire", "mount", "native.stop", "native.stopped", "release"]);
    expect(() => ready.processAccess.resource(file)).toThrow(TypeError);
    await ready.stop();
    expect(events.filter((event) => event === "release")).toHaveLength(1);
  } finally {
    finishInvocation.resolve();
    finishNative.resolve();
    try {
      await handle?.stop();
    } finally {
      try {
        await stopProcess?.();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  }
}, 15_000);
