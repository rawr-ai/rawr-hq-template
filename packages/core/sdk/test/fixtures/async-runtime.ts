/// <reference types="bun-types" />
import assert from "node:assert/strict";
import { closeSync, fstatSync, openSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { Inngest, Middleware } from "inngest";
import { Type } from "typebox";
import { decodeOpenTelemetryNodeConfig } from "../../../../../resources/telemetry/providers/opentelemetry-node/index";
import { defineOpenTelemetryNodeRuntimeProvider } from "../../../../../resources/telemetry/providers/opentelemetry-node/runtime";
import { TelemetryRuntimeResource } from "../../../../../resources/telemetry/runtime";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "../../src/app/index";
import { defineAsyncStepEffect, stepEffect } from "../../src/plugins/async/effect/index";
import {
  defineAsyncConsumerPlugin,
  defineAsyncSchedulePlugin,
  defineAsyncWorkflowPlugin,
  defineConsumer,
  defineSchedule,
  defineWorkflow,
  useService,
} from "../../src/plugins/async/index";
import { createInngestHarness } from "../../src/runtime/harnesses/inngest";
import { defineRuntimeProfile, providerSelection } from "../../src/runtime/profiles/index";
import { providerFx } from "../../src/runtime/providers/effect/index";
import { defineRuntimeProvider, type RuntimeResourceMap } from "../../src/runtime/providers/index";
import { defineRuntimeResource, requireResource } from "../../src/runtime/resources/index";
import { RuntimeSchema } from "../../src/runtime/schema";
import { freePort, startDevServer, until } from "./async-native/dev-server";
import { createFileService } from "./server/service/impl";

const root = await mkdtemp(join(tmpdir(), "habitat-async-runtime-"));
const received: { path: string; body: string }[] = [];
const collector = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    received.push({ path: new URL(request.url).pathname, body: await request.text() });
    return Response.json({});
  },
});
const endpoint = `http://127.0.0.1:${collector.port}`;
const dev = await startDevServer().catch(async (error) => {
  await collector.stop(false);
  await rm(root, { recursive: true, force: true });
  throw error;
});
const observedTraceIds = new Set<string>();

function telemetryConfiguration(enabled: boolean) {
  const processIdentity = {
    serviceName: "async-native-proof",
    processRole: "async",
    processInstanceId: `native-${process.pid}`,
  };
  const exporter = (signal: string) => ({
    url: `${endpoint}/v1/${signal}`,
    headers: {},
    timeoutMilliseconds: 1000,
  });
  return decodeOpenTelemetryNodeConfig(
    enabled
      ? {
          enabled,
          processIdentity,
          defaultAttributes: {},
          exportedAttributePaths: [],
          traces: exporter("traces"),
          metrics: exporter("metrics"),
          logs: exporter("logs"),
          metricExportIntervalMilliseconds: 1000,
          constructionCleanupTimeoutMilliseconds: 1000,
        }
      : { enabled, processIdentity }
  );
}

async function run(mode: "serve" | "connect", enabled: boolean) {
  const appId = `habitat-${mode}-${enabled}`;
  const events: string[] = [];
  const held = Promise.withResolvers<void>();
  const entered = Promise.withResolvers<void>();
  let released = 0;
  let fd = -1;
  let middlewareEntries = 0;
  let middlewareExits = 0;
  class ProductMiddleware extends Middleware.BaseMiddleware {
    readonly id = "native-proof-product";
    async wrapRequest({ next }: Middleware.WrapRequestArgs) {
      middlewareEntries++;
      try {
        return await next();
      } finally {
        middlewareExits++;
      }
    }
  }
  const nativeClient = new Inngest({
    id: appId,
    isDev: true,
    baseUrl: dev.base,
    middleware: [ProductMiddleware],
  });
  const nativeMiddleware = [...nativeClient.middleware];
  const file = defineRuntimeResource<"server.file", number>({
    id: "server.file",
    title: "File",
    purpose: "Async callback lifetime",
  });
  const client = defineRuntimeResource<"async.client", Inngest>({
    id: "async.client",
    title: "Inngest",
    purpose: "Exact native registration client",
  });
  const telemetry = requireResource({
    resource: TelemetryRuntimeResource,
    reason: "One process telemetry lease",
  });
  const fileRequirement = requireResource({ resource: file, reason: "Bounded step resource" });
  const clientRequirement = requireResource({ resource: client, reason: "Native async host" });
  const clientProvider = defineRuntimeProvider({
    id: "async.client-provider",
    title: "Inngest",
    provides: client,
    requires: [telemetry],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.succeed(nativeClient),
        release: () => Effect.void,
      }),
  });
  const fileProvider = defineRuntimeProvider({
    id: "async.file-provider",
    title: "File",
    provides: file,
    requires: [telemetry],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => (fd = openSync(join(root, appId), "wx"))),
        release: (value) =>
          Effect.sync(() => {
            assert.equal(value, fd);
            closeSync(value);
            released++;
            events.push("release");
          }),
      }),
  });
  const service = createFileService(file);
  const services = { file: useService(service) };
  type Context = {
    event: { value: string };
    clients: { file: ReturnType<typeof service.construct> };
    resources: RuntimeResourceMap;
    telemetry: unknown;
    execution: { traceId?: string };
  };
  const counts = new Map<
    string,
    { outer: number; first: number; retry: number; last: number; decoded: number; copied: number }
  >();
  const baseSchema = RuntimeSchema.fromTypeBox(Type.Object({ value: Type.String() }));
  const workflows = [false, true].map((checkpointing) => {
    const id = checkpointing ? "checkpoint" : "reentry";
    const count = { outer: 0, first: 0, retry: 0, last: 0, decoded: 0, copied: 0 };
    counts.set(id, count);
    const copiedContext = Symbol("native-proof-context-copy");
    class FunctionMiddleware extends Middleware.BaseMiddleware {
      readonly id = "native-proof-function";
      transformFunctionInput(args: Middleware.TransformFunctionInputArgs) {
        count.copied++;
        return { ...args, ctx: { ...args.ctx, [copiedContext]: true } };
      }
    }
    const first = defineAsyncStepEffect({
      id: `${id}-first`,
      policy: {},
      effect: (context: Context) =>
        Effect.gen(function* () {
          count.first++;
          assert.equal(context.resources.get(fileRequirement), fd);
          assert.equal(context.resources.get(clientRequirement), nativeClient);
          assert(!("signal" in context));
          if (enabled) {
            assert.match(context.execution.traceId!, /^[0-9a-f]{32}$/);
            observedTraceIds.add(context.execution.traceId!);
          }
          const value = yield* context.clients.file
            .withInvocation({ invocation: undefined })
            .read()
            .pipe(Effect.withSpan("async.authored.child"));
          assert.equal(value, "file-live");
          return { date: new Date("2026-01-02T00:00:00Z"), value: context.event.value };
        }),
    });
    const retry = defineAsyncStepEffect({
      id: `${id}-retry`,
      policy: {},
      effect: () =>
        Effect.suspend(() => {
          count.retry++;
          return count.retry === 1
            ? Effect.fail(new Error("deliberate-native-retry"))
            : Effect.succeed("retried");
        }),
    });
    const last = defineAsyncStepEffect({
      id: `${id}-last`,
      policy: {},
      effect: () =>
        Effect.sync(() => {
          count.last++;
        }),
    });
    return defineWorkflow({
      id,
      eventName: `${appId}/${id}`,
      inputSchema: {
        ...baseSchema,
        decode(input) {
          count.decoded++;
          return baseSchema.decode(input);
        },
      },
      steps: [first, retry, last],
      options: {
        retries: 2,
        middleware: [FunctionMiddleware],
        ...(checkpointing ? {} : { checkpointing: false }),
      },
      async run(context) {
        count.outer++;
        assert.equal(Reflect.get(context, copiedContext), true);
        assert(!("clients" in context));
        assert(!("resources" in context));
        assert(!("execution" in context));
        const firstResult = await stepEffect(context).run(first);
        assert.equal(firstResult.date, "2026-01-02T00:00:00.000Z");
        assert.equal(await stepEffect(context).run(retry), "retried");
        assert.equal(await stepEffect(context).run(last), null);
        return firstResult;
      },
    });
  });
  const hold = defineAsyncStepEffect({
    id: "held-step",
    policy: {},
    effect: (context: Context) =>
      Effect.gen(function* () {
        events.push("held-entered");
        entered.resolve();
        yield* Effect.promise(() => held.promise);
        assert(fstatSync(fd).isFile());
        assert.equal(
          yield* context.clients.file.withInvocation({ invocation: undefined }).read(),
          "file-live"
        );
        events.push("held-finished");
        return "held";
      }),
  });
  const following = defineAsyncStepEffect({
    id: "following-step",
    policy: {},
    effect: () =>
      Effect.sync(() => {
        assert(fstatSync(fd).isFile());
        events.push("following-finished");
        return "following";
      }),
  });
  const heldWorkflow = defineWorkflow({
    id: "held",
    eventName: `${appId}/held`,
    inputSchema: baseSchema,
    steps: [hold, following],
    options: { retries: 0 },
    async run(context) {
      await stepEffect(context).run(hold);
      return stepEffect(context).run(following);
    },
  });
  let invalidOuterCalls = 0;
  const invalidWorkflow = defineWorkflow({
    id: "invalid",
    eventName: `${appId}/invalid`,
    inputSchema: baseSchema,
    steps: [],
    options: {
      retries: 0,
      async onFailure(context) {
        assert.equal(context.event.name, "inngest/function.failed");
        assert.equal(context.event.data.event.data?.value, 1);
        events.push("failure-entered");
        await held.promise;
        assert(fstatSync(fd).isFile());
        events.push("failure-finished");
      },
    },
    run() {
      invalidOuterCalls++;
      return "must-not-run";
    },
  });
  const canceledStep = defineAsyncStepEffect({
    id: "canceled-step",
    policy: {},
    effect: () =>
      Effect.gen(function* () {
        events.push("canceled-entered");
        yield* Effect.promise(() => held.promise);
        assert(fstatSync(fd).isFile());
        events.push("canceled-finished");
        return "finished-after-cancellation";
      }),
  });
  const canceledWorkflow = defineWorkflow({
    id: "canceled",
    eventName: `${appId}/canceled`,
    inputSchema: baseSchema,
    steps: [canceledStep],
    options: { retries: 0, checkpointing: false },
    run: (context) => stepEffect(context).run(canceledStep),
  });
  let consumerCalls = 0;
  const consumer = defineConsumer({
    id: "consumer",
    eventName: `${appId}/consumer`,
    eventSchema: baseSchema,
    steps: [],
    run(context) {
      assert.equal(context.event.data.value, "consumer");
      consumerCalls++;
      return "consumer";
    },
  });
  const schedule = defineSchedule({
    id: "schedule",
    cron: "0 0 1 1 *",
    steps: [],
    run: () => "schedule",
  });
  const requirements = [fileRequirement, clientRequirement];
  const app = defineApp({
    id: appId,
    plugins: [
      defineAsyncWorkflowPlugin.factory()({
        capability: "proof",
        services,
        resourceRequirements: requirements,
        workflows: [...workflows, heldWorkflow, invalidWorkflow, canceledWorkflow],
      })(),
      defineAsyncConsumerPlugin.factory()({
        capability: "proof",
        services,
        resourceRequirements: requirements,
        consumers: [consumer],
      })(),
      defineAsyncSchedulePlugin.factory()({
        capability: "proof",
        services,
        resourceRequirements: requirements,
        schedules: [schedule],
      })(),
    ],
  });
  const profile = defineRuntimeProfile({
    id: "local",
    configSources: [{ kind: "test" }],
    harnesses: ["inngest"],
    providers: [
      providerSelection({ resource: client, provider: clientProvider }),
      providerSelection({ resource: file, provider: fileProvider }),
      providerSelection({
        resource: TelemetryRuntimeResource,
        provider: defineOpenTelemetryNodeRuntimeProvider({
          releaseDeadline: () => ({ deadlineMonotonicMilliseconds: performance.now() + 2000 }),
        }),
        config: { kind: "runtime.config", key: "telemetry" },
      }),
    ],
  });
  const selected = defineProcessCatalog({ main: { id: "main", roles: ["async"] } }).main;
  const entrypoint = defineEntrypoint({
    id: "async",
    app,
    profile,
    process: selected,
    identity: {
      app: app.id,
      process: selected.id,
      entrypoint: "async",
      deployment: "test",
      source: "native-async-fixture",
    },
  });
  const port = await freePort();
  const descriptor = createInngestHarness(
    mode === "serve"
      ? { id: "inngest", client, mode, hostname: "127.0.0.1", port, path: "/api/inngest" }
      : { id: "inngest", client, mode, options: { isolateExecution: true, instanceId: appId } }
  );
  let mounts = 0;
  const harness = {
    ...descriptor,
    async mount(input: Parameters<typeof descriptor.mount>[0]) {
      mounts++;
      const native = await descriptor.mount(input);
      return {
        ...native,
        async stop() {
          await native.stop();
          assert(fstatSync(fd).isFile());
          events.push("native-stopped");
        },
      };
    },
  };
  const signalCounts = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")];
  const runtime = await startApp(entrypoint, {
    sources: { appRoot: root, test: { telemetry: telemetryConfiguration(enabled) } },
    integrations: [
      { surface: "async/workflow", harness },
      { surface: "async/consumer", harness },
      { surface: "async/schedule", harness },
    ],
    finalization: { policy: "waitForNativeStop", deadlineMs: 20 },
  });
  try {
    assert.equal(mounts, 1);
    assert.deepEqual(
      [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")],
      signalCounts
    );
    if (mode === "serve") {
      const sync = await fetch(`http://127.0.0.1:${port}/api/inngest`, { method: "PUT" });
      assert(sync.ok, await sync.text());
    }
    await until(
      "exact native function registration",
      () => dev.query<{ functions: { slug: string }[] }>("{functions{slug}}"),
      (data) =>
        ["checkpoint", "reentry", "held", "consumer", "schedule"].every((id) =>
          data.functions.some((fn) => fn.slug === `${appId}-${id}`)
        )
    );
    for (const checkpointing of [false, true]) {
      const id = checkpointing ? "checkpoint" : "reentry";
      const sent = await nativeClient.send({ name: `${appId}/${id}`, data: { value: id } });
      const completed = await dev.completed(sent.ids[0]!);
      const count = counts.get(id)!;
      assert.deepEqual(
        { first: count.first, retry: count.retry, last: count.last },
        { first: 1, retry: 2, last: 1 }
      );
      assert(count.outer > 1);
      assert.equal(count.decoded, count.outer);
      assert(count.copied >= count.outer);
      assert.deepEqual(await dev.output(completed, checkpointing), {
        date: "2026-01-02T00:00:00.000Z",
        value: id,
      });
      assert(
        completed.history.some((entry) => entry.type === "StepErrored" && entry.attempt === 0)
      );
      assert(
        completed.history.some(
          (entry) =>
            entry.type === "StepCompleted" &&
            entry.stepName === `${id}-retry` &&
            entry.attempt === 1
        )
      );
    }
    const consumed = await nativeClient.send({
      name: `${appId}/consumer`,
      data: { value: "consumer" },
    });
    await dev.completed(consumed.ids[0]!);
    assert.equal(consumerCalls, 1);
    await nativeClient.send({ name: `${appId}/invalid`, data: { value: 1 } });
    await until("native failure handler", () => events.includes("failure-entered"), Boolean);
    assert.equal(invalidOuterCalls, 0);
    const canceled = await nativeClient.send({
      name: `${appId}/canceled`,
      data: { value: "canceled" },
    });
    await until("canceled step entry", () => events.includes("canceled-entered"), Boolean);
    const cancelRun = await until(
      "cancellable native run",
      () => dev.eventRun(canceled.ids[0]!),
      (value) => value?.status === "RUNNING"
    );
    assert(cancelRun);
    const cancellation = await fetch(`${dev.base}/v1/runs/${cancelRun.id}`, { method: "DELETE" });
    assert(cancellation.ok);
    await until(
      "native run cancellation",
      () => dev.eventRun(canceled.ids[0]!),
      (value) => value?.status === "CANCELLED"
    );
    assert(!events.includes("canceled-finished"));
    await nativeClient.send({ name: `${appId}/held`, data: { value: "held" } });
    await until("held native step", () => events.includes("held-entered"), Boolean);
    const stop = runtime.stop();
    assert.equal(runtime.stop(), stop);
    let stopped = false;
    void stop.then(() => {
      stopped = true;
    });
    await until(
      "observable drain deadline",
      () => runtime.finalization(),
      (value) => value.state === "draining" && value.deadlineExceeded
    );
    assert.equal(stopped, false);
    assert.equal(released, 0);
    if (mode === "serve") {
      const refusal = await fetch(`http://127.0.0.1:${port}/api/inngest`, {
        headers: { Connection: "close" },
      }).then(
        (response) => response.status,
        () => "transport-closed"
      );
      assert([503, "transport-closed"].includes(refusal));
    }
    held.resolve();
    await stop;
    assert.equal(released, 1);
    for (const event of [
      "held-finished",
      "following-finished",
      "native-stopped",
      "failure-entered",
      "failure-finished",
      "canceled-finished",
      "release",
    ]) {
      assert(events.includes(event), `Missing lifecycle event: ${event}`);
    }
    assert(events.indexOf("held-finished") < events.indexOf("release"));
    assert(events.indexOf("following-finished") < events.indexOf("release"));
    assert(events.indexOf("native-stopped") < events.indexOf("release"));
    assert(events.indexOf("failure-finished") > events.indexOf("failure-entered"));
    assert(events.indexOf("failure-finished") < events.indexOf("release"));
    assert(events.indexOf("canceled-finished") < events.indexOf("release"));
    assert.equal((await dev.eventRun(canceled.ids[0]!))?.status, "CANCELLED");
    assert.equal(middlewareEntries, middlewareExits);
    assert.deepEqual(nativeClient.middleware, nativeMiddleware);
    assert.deepEqual(
      [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")],
      signalCounts
    );
    console.log(
      JSON.stringify({
        proof: "native-async-host",
        mode,
        enabled,
        counts: Object.fromEntries(counts),
        middlewareEntries,
        events,
      })
    );
  } finally {
    held.resolve();
    await runtime.stop();
  }
}

try {
  await run("serve", true);
  await run("connect", true);
  type Span = {
    name: string;
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    scope: string;
  };
  const spans: Span[] = [];
  for (const record of received.filter((record) => record.path === "/v1/traces")) {
    const body = JSON.parse(record.body) as {
      resourceSpans: { scopeSpans: { scope: { name: string }; spans: Omit<Span, "scope">[] }[] }[];
    };
    for (const resource of body.resourceSpans)
      for (const scope of resource.scopeSpans)
        for (const span of scope.spans) spans.push({ ...span, scope: scope.scope.name });
  }
  const native = spans.filter((span) => span.name === "inngest.execution");
  assert(native.length > 0, "Actual native Inngest engine spans must reach OTLP");
  const byId = new Map(spans.map((span) => [span.spanId, span]));
  for (const child of spans.filter((span) => span.name === "async.authored.child")) {
    let ancestor = child.parentSpanId ? byId.get(child.parentSpanId) : undefined;
    let ownsNativeParent = false;
    while (ancestor) {
      assert.equal(ancestor.traceId, child.traceId);
      ownsNativeParent ||= ancestor.name === "inngest.execution";
      ancestor = ancestor.parentSpanId ? byId.get(ancestor.parentSpanId) : undefined;
    }
    assert(
      ownsNativeParent,
      "Managed async Effect spans must descend from actual native execution"
    );
  }
  assert(spans.some((span) => span.name === "async.authored.child"));
  for (const id of observedTraceIds) assert(spans.some((span) => span.traceId === id));
  const before = received.length;
  await run("serve", false);
  await run("connect", false);
  assert.equal(received.length, before);
  console.log(
    JSON.stringify({
      proof: "native-async",
      sdk: "4.18.0",
      devServer: "1.44.0",
      bun: Bun.version,
      otlpRequests: received.length,
      nativeSpans: native.length,
    })
  );
} finally {
  await dev.stop();
  await collector.stop(false);
  await rm(root, { recursive: true, force: true });
}
