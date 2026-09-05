import assert from "node:assert/strict";
import { closeSync, fstatSync, openSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openapi } from "@orpc/openapi";
import { os } from "@orpc/server";
import { Effect } from "effect";
import { Inngest, Middleware } from "inngest";
import { serve } from "inngest/bun";
import { ReadonlyObject, Type } from "typebox";
import { Check } from "typebox/value";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "../../src/app/index";
import { defineAsyncStepEffect } from "../../src/plugins/async/effect/index";
import { defineAsyncWorkflowPlugin, defineWorkflow } from "../../src/plugins/async/index";
import {
  defineServerApiPlugin,
  type ServerPluginContext,
  useWorkflowDispatcher,
  type WorkflowDispatchResult,
} from "../../src/plugins/server/index";
import "../../src/plugins/server/effect/index";
import { createElysiaHarness } from "../../src/runtime/harnesses/elysia";
import { defineRuntimeProfile, providerSelection } from "../../src/runtime/profiles/index";
import { providerFx } from "../../src/runtime/providers/effect/index";
import { defineRuntimeProvider } from "../../src/runtime/providers/index";
import { defineRuntimeResource, requireResource } from "../../src/runtime/resources/index";
import { RuntimeSchema } from "../../src/runtime/schema";
import { standard } from "../../src/service/schema";
import { freePort, type NativeRun, startDevServer, until } from "./async-native/dev-server";

const root = await mkdtemp(join(tmpdir(), "habitat-workflow-admission-"));
const gates = new Map<string, ReturnType<typeof Promise.withResolvers<void>>>([
  ["cancel", Promise.withResolvers<void>()],
  ["unawaited", Promise.withResolvers<void>()],
]);
let stopDev: (() => Promise<void>) | undefined;
let stopReceiver: (() => Promise<void>) | undefined;
let runtime: Awaited<ReturnType<typeof startApp>> | undefined;
let failure: unknown;
let receipt: unknown;
try {
  const dev = await startDevServer();
  stopDev = dev.stop;
  const eventName = "workflow-admission/requested";
  const nativeObserver = new Inngest({
    id: "admission-observer",
    isDev: true,
    baseUrl: dev.base,
    checkpointing: true,
  });
  // Independent native receivers prove event fan-out, not execution in the selected Habitat process.
  const functions = ["first", "second"].map((id) =>
    nativeObserver.createFunction(
      { id, triggers: [{ event: eventName }], retries: 0 },
      async ({ event }) => ({ receiver: id, data: event.data })
    )
  );
  const receiver = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: serve({ client: nativeObserver, functions }),
  });
  stopReceiver = () => receiver.stop(true);

  type Payload = { key: string; when: Date };
  const wireShape = Type.Object({ key: Type.String(), when: Type.String() });
  const wire = RuntimeSchema.fromTypeBox(wireShape);
  let validations = 0;
  let decodes = 0;
  const schema: RuntimeSchema<Payload> = {
    ...wire,
    validate(input) {
      validations++;
      if (
        typeof input !== "object" ||
        input === null ||
        !("key" in input) ||
        typeof input.key !== "string" ||
        !("when" in input) ||
        !(input.when instanceof Date) ||
        !Number.isFinite(input.when.getTime())
      )
        return { success: false, issues: [{ message: "Expected a key and actual Date." }] };
      // The producer must ignore a validation result's replacement value.
      return { success: true, value: { key: "must-not-be-sent", when: input.when } };
    },
    decode(input) {
      decodes++;
      const result = wire.validate(input);
      return result.success
        ? { success: true, value: { ...result.value, when: new Date(result.value.when) } }
        : result;
    },
  };
  let executionBodies = 0;
  const executionOnly = defineRuntimeResource<"admission.execution-only", never>({
    id: "admission.execution-only",
    title: "Unprovided",
    purpose: "Must not enter admission closure",
  });
  const step = defineAsyncStepEffect({
    id: "must-remain-cold",
    policy: {},
    effect: () =>
      Effect.sync(() => {
        executionBodies++;
      }),
  });
  const first = defineWorkflow({
    id: "first",
    eventName,
    inputSchema: schema,
    steps: [step],
    run() {
      executionBodies++;
    },
  });
  const second = defineWorkflow({
    id: "second",
    eventName,
    inputSchema: schema,
    steps: [step],
    run() {
      executionBodies++;
    },
  });
  const target = defineAsyncWorkflowPlugin.factory()({
    capability: "admission-target",
    services: {},
    workflows: [first, second],
    resourceRequirements: [
      requireResource({ resource: executionOnly, reason: "Actual workflow execution only" }),
    ],
  })();

  const file = defineRuntimeResource<"admission.file", number>({
    id: "admission.file",
    title: "File",
    purpose: "Native send lifetime",
  });
  const client = defineRuntimeResource<"admission.client", Inngest>({
    id: "admission.client",
    title: "Inngest",
    purpose: "Exact named native event sender",
  });
  const fileRequirement = requireResource({
    resource: file,
    reason: "Native send middleware owns a real descriptor",
  });
  const east = requireResource({
    resource: client,
    instance: "east",
    reason: "East event admission",
  });
  const west = requireResource({
    resource: client,
    instance: "west",
    reason: "West event admission",
  });
  const workflows = {
    east: useWorkflowDispatcher(target, { workflows: [first], client: east }),
    west: useWorkflowDispatcher(target, { workflows: [first], client: west }),
    secondary: useWorkflowDispatcher(target, { workflows: [second], client: east }),
  };
  const events: string[] = [];
  const payloads = new Map<string, Payload>();
  const nativeReceipts: {
    client: string;
    key: string;
    sourceId: string | undefined;
    eventIds: string[];
  }[] = [];
  const sendResults: Promise<WorkflowDispatchResult>[] = [];
  let fd = -1;
  let fileReleases = 0;
  let pendingSends = 0;
  let canceledFinalizers = 0;
  let nativeMounted = false;
  const fileProvider = defineRuntimeProvider({
    id: "admission.file-provider",
    title: "File",
    provides: file,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          fd = openSync(join(root, "lease"), "w+");
          return fd;
        }),
        release: (value) =>
          Effect.sync(() => {
            try {
              assert.equal(pendingSends, 0);
              if (nativeMounted) assert(events.includes("native-stopped"));
            } finally {
              closeSync(value);
              fileReleases++;
              events.push("file-released");
            }
          }),
      }),
  });
  const clientProvider = defineRuntimeProvider({
    id: "admission.client-provider",
    title: "Native client",
    provides: client,
    requires: [fileRequirement],
    configSchema: RuntimeSchema.fromTypeBox(Type.Object({ name: Type.String() })),
    build({ config, resources }) {
      const leased = resources.get(fileRequirement);
      class SendObserver extends Middleware.BaseMiddleware {
        readonly id = "admission-send-observer";
        async wrapSendEvent({ events: sent, next }: Middleware.WrapSendEventArgs) {
          assert.equal(leased, fd);
          assert(fstatSync(leased).isFile());
          const outgoing = sent[0];
          assert(outgoing?.data && typeof outgoing.data.key === "string");
          const key = outgoing.data.key;
          assert.equal(outgoing.name, eventName);
          assert.equal(outgoing.data, payloads.get(key));
          pendingSends++;
          try {
            const result = await next();
            nativeReceipts.push({
              client: config.name,
              key,
              sourceId: outgoing.id,
              eventIds: [...result.ids],
            });
            events.push(`ack:${key}`);
            const gate = gates.get(key);
            if (gate) await gate.promise;
            assert(fstatSync(leased).isFile());
            events.push(`send-settled:${key}`);
            return result;
          } finally {
            pendingSends--;
          }
        }
      }
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          events.push(`client-acquired:${config.name}`);
          return new Inngest({
            id: `admission-${config.name}`,
            isDev: true,
            baseUrl: dev.base,
            middleware: [SendObserver],
          });
        }),
        release: () =>
          Effect.sync(() => {
            assert.equal(pendingSends, 0);
            assert(fstatSync(leased).isFile());
            events.push(`client-released:${config.name}`);
          }),
      });
    },
  });

  const inputSchema = Type.Object({
    key: Type.String(),
    mode: Type.Union(
      (["east", "west", "secondary", "copy", "unlisted", "invalid"] as const).map((value) =>
        Type.Literal(value)
      )
    ),
  });
  const base = os.$context<ServerPluginContext<{}, typeof workflows>>();
  const resultSchema = standard(
    Type.Object({ eventIds: ReadonlyObject(Type.Array(Type.String())) })
  );
  function payload(key: string, invalid = false) {
    const value = { key, when: new Date(invalid ? "invalid" : "2026-09-05T12:00:00Z") };
    payloads.set(key, value);
    return value;
  }
  const router = {
    send: base
      .meta(openapi({ method: "POST", path: "/send" }))
      .input(standard(inputSchema))
      .output(resultSchema)
      .handler(({ context, input }) => {
        const value = payload(input.key, input.mode === "invalid");
        const options = { id: `source-${input.key}` };
        if (input.mode === "west") return context.workflows.west.send(first, value, options);
        if (input.mode === "secondary")
          return context.workflows.secondary.send(second, value, options);
        if (input.mode === "copy") return context.workflows.east.send({ ...first }, value, options);
        if (input.mode === "unlisted") {
          // @ts-expect-error A disjoint group's target is not in east's static allowlist either.
          return context.workflows.east.send(second, value, options);
        }
        return context.workflows.east.send(first, value, options);
      }),
    cancel: base
      .meta(openapi({ method: "POST", path: "/cancel" }))
      .output(resultSchema)
      .effect(function* ({ context }) {
        return yield* Effect.tryPromise({
          try: () => {
            const result = context.workflows.east.send(first, payload("cancel"), {
              id: "source-cancel",
            });
            sendResults.push(result);
            return result;
          },
          catch: (error) => error,
        }).pipe(
          Effect.onExit(() =>
            Effect.sync(() => {
              assert(fstatSync(fd).isFile());
              canceledFinalizers++;
            })
          )
        );
      }),
    unawaited: base.meta(openapi({ method: "POST", path: "/unawaited" })).handler(({ context }) => {
      const result = context.workflows.west.send(first, payload("unawaited"), {
        id: "source-unawaited",
      });
      sendResults.push(result);
      void result.catch(() => {});
      return { submitted: true };
    }),
  };
  const server = defineServerApiPlugin.factory()({
    capability: "admission",
    services: {},
    workflows,
    routeBase: "/api",
    api: () => router,
  })();
  const app = defineApp({ id: "workflow-admission", plugins: [server, target] });
  const selected = defineProcessCatalog({ server: { id: "server", roles: ["server"] } }).server;
  const profile = defineRuntimeProfile({
    id: "local",
    configSources: [{ kind: "test" }],
    harnesses: ["admission-server"],
    providers: [
      providerSelection({ resource: file, provider: fileProvider }),
      providerSelection({
        resource: client,
        instance: "east",
        provider: clientProvider,
        config: { kind: "runtime.config", key: "east" },
      }),
      providerSelection({
        resource: client,
        instance: "west",
        provider: clientProvider,
        config: { kind: "runtime.config", key: "west" },
      }),
    ],
  });
  const entrypoint = defineEntrypoint({
    id: "server",
    app,
    process: selected,
    profile,
    identity: {
      app: app.id,
      process: selected.id,
      entrypoint: "server",
      deployment: "native-admission",
      source: "qualified-source",
    },
  });
  const port = await freePort();
  const native = createElysiaHarness({
    id: "admission-server",
    hostname: "127.0.0.1",
    port,
    publicDocument: {
      path: "/openapi.json",
      info: { title: "Workflow admission", version: "1" },
    },
  });
  const registration = await fetch(`http://127.0.0.1:${receiver.port}/api/inngest`, {
    method: "PUT",
  });
  assert(registration.ok, await registration.text());
  await until(
    "two independent native receivers",
    () => dev.query<{ functions: { slug: string }[] }>("{functions{slug}}"),
    (value) => value.functions.length === 2
  );
  runtime = await startApp(entrypoint, {
    sources: { appRoot: root, test: { east: { name: "east" }, west: { name: "west" } } },
    integrations: [
      {
        surface: "server/api",
        harness: {
          ...native,
          async mount(input) {
            assert.equal(input.launchIdentity, entrypoint.identity);
            const mounted = await native.mount(input);
            nativeMounted = true;
            return {
              ...mounted,
              async stop() {
                await mounted.stop();
                events.push("native-stopped");
              },
            };
          },
        },
      },
    ],
    finalization: { policy: "waitForNativeStop", deadlineMs: 50 },
  });
  assert.deepEqual(runtime.catalog().roles, ["server"]);
  assert(runtime.catalog().surfaces.every((surface) => surface.role === "server"));
  assert.equal(runtime.catalog().workflowDispatchers.length, 2);
  assert(!runtime.catalog().resources.some((resource) => resource.resourceId === executionOnly.id));
  assert.equal(executionBodies, 0);
  async function post(path: string, body?: unknown, signal?: AbortSignal) {
    return fetch(`http://127.0.0.1:${port}/api/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: signal ?? AbortSignal.timeout(15_000),
    });
  }
  for (const mode of ["east", "west", "secondary"] as const) {
    const response = await post("send", { key: mode, mode });
    assert(response.ok, await response.clone().text());
    const result: unknown = await response.json();
    assert(Check(Type.Object({ eventIds: Type.Array(Type.String(), { minItems: 1 }) }), result));
    assert.deepEqual(Object.keys(result), ["eventIds"]);
    const sent = nativeReceipts.find((item) => item.key === mode);
    assert(sent);
    assert.equal(sent.client, mode === "west" ? "west" : "east");
    assert.equal(sent.sourceId, `source-${mode}`);
    assert.deepEqual(result.eventIds, sent.eventIds);
    const observed = await until(
      "native event fan-out",
      () =>
        dev.query<{ event: { functionRuns: NativeRun[] } | null }>(
          "query($id:ID!){event(query:{eventId:$id}){functionRuns{id status output history{attempt stepName type}}}}",
          { id: result.eventIds[0] }
        ),
      (value) =>
        value.event?.functionRuns.length === 2 &&
        value.event.functionRuns.every((run) => run.status === "COMPLETED")
    );
    assert(observed.event);
    const observedReceivers = new Set<string>();
    for (const run of observed.event.functionRuns) {
      assert(!result.eventIds.includes(run.id));
      const output = await dev.output(run, true);
      assert(Check(Type.Object({ receiver: Type.String(), data: wireShape }), output));
      observedReceivers.add(output.receiver);
      assert.deepEqual(output.data, { key: mode, when: "2026-09-05T12:00:00.000Z" });
    }
    assert.deepEqual([...observedReceivers].sort(), ["first", "second"]);
  }
  assert.equal(validations, 3);
  assert.equal(decodes, 0);
  const sentBeforeRefusals = nativeReceipts.length;
  for (const mode of ["copy", "unlisted", "invalid"]) {
    const response = await post("send", { key: mode, mode });
    assert(!response.ok, `${mode} must refuse`);
    await response.text();
  }
  assert.equal(nativeReceipts.length, sentBeforeRefusals);
  assert.equal(validations, 4);
  assert.equal(decodes, 0);

  const controller = new AbortController();
  const canceledRequest = post("cancel", undefined, controller.signal).then(
    () => false,
    () => true
  );
  const detachedRequest = await post("unawaited");
  assert(detachedRequest.ok);
  await detachedRequest.text();
  await until(
    "both real native acknowledgements before held middleware returns",
    () => events,
    (value) => value.includes("ack:cancel") && value.includes("ack:unawaited")
  );
  controller.abort();
  assert(await canceledRequest);
  await until(
    "caller Effect finalized independently",
    () => canceledFinalizers,
    (value) => value === 1
  );
  assert.equal(pendingSends, 2);
  const stopping = runtime.stop();
  assert.equal(runtime.stop(), stopping);
  let stopped = false;
  void stopping.then(() => {
    stopped = true;
  });
  await until(
    "native server stopped with sends still pending",
    () => events.includes("native-stopped"),
    Boolean
  );
  assert.equal(stopped, false);
  assert.equal(fileReleases, 0);
  assert(fstatSync(fd).isFile());
  gates.get("unawaited")!.resolve();
  await until(
    "one native send settled",
    () => pendingSends,
    (value) => value === 1
  );
  assert.equal(fileReleases, 0);
  gates.get("cancel")!.resolve();
  await stopping;
  const completedSends = await Promise.all(sendResults);
  assert(
    completedSends.every((result) => Object.isFrozen(result) && Object.isFrozen(result.eventIds))
  );
  assert.equal(fileReleases, 1);
  assert.equal(events.filter((event) => event.startsWith("client-released:")).length, 2);
  assert.equal(events.filter((event) => event === "native-stopped").length, 1);
  assert.equal(executionBodies, 0);
  assert.equal(decodes, 0);
  receipt = {
    proof: "native server-only workflow admission",
    result: "PASS",
    validations,
    nativeReceipts,
    events,
    asyncExecutionBodies: executionBodies,
    decodeCalls: decodes,
  };
} catch (error) {
  failure = error;
} finally {
  for (const gate of gates.values()) gate.resolve();
  const results = await Promise.allSettled([
    Promise.resolve().then(() => runtime?.stop()),
    Promise.resolve().then(() => stopReceiver?.()),
    Promise.resolve().then(() => stopDev?.()),
  ]);
  const cleanupErrors = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  );
  await rm(root, { recursive: true, force: true }).catch((error) => cleanupErrors.push(error));
  if (failure === undefined && cleanupErrors.length > 0)
    failure = new AggregateError(cleanupErrors, "Native admission fixture cleanup failed");
}
if (failure !== undefined) throw failure;
console.log(JSON.stringify(receipt));
