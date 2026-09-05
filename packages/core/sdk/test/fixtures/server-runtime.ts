/// <reference types="bun-types" />
import assert from "node:assert/strict";
import { closeSync, fstatSync, openSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { openapi } from "@orpc/openapi";
import { os, type RouterClient } from "@orpc/server";
import { getOpenTelemetryConfig } from "@orpc/shared";
import { Effect } from "effect";
import { Type } from "typebox";
import { decodeOpenTelemetryNodeConfig } from "../../../../../resources/telemetry/providers/opentelemetry-node/index";
import { defineOpenTelemetryNodeRuntimeProvider } from "../../../../../resources/telemetry/providers/opentelemetry-node/runtime";
import { TelemetryRuntimeResource } from "../../../../../resources/telemetry/runtime";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "../../src/app/index";
import {
  defineServerApiPlugin,
  defineServerInternalPlugin,
  type ServerPluginContext,
  useService,
} from "../../src/plugins/server/index";
import { createElysiaHarness } from "../../src/runtime/harnesses/elysia";
import { defineRuntimeProfile, providerSelection } from "../../src/runtime/profiles/index";
import { providerFx } from "../../src/runtime/providers/effect/index";
import { defineRuntimeProvider } from "../../src/runtime/providers/index";
import { defineRuntimeResource, requireResource } from "../../src/runtime/resources/index";
import { standard } from "../../src/service/schema";
import { createFileService } from "./server/service/impl";

const root = await mkdtemp(join(tmpdir(), "habitat-server-runtime-"));
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
const secret = "server-fixture-input-secret";
const observedTraceIds = new Set<string>();

async function freePort() {
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = server.port!;
  await server.stop(true);
  return port;
}

function telemetryConfiguration(enabled: boolean) {
  const processIdentity = {
    serviceName: "server-native-proof",
    processRole: "server",
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

async function run(enabled: boolean) {
  const events: string[] = [];
  const entered = Promise.withResolvers<void>();
  const gate = Promise.withResolvers<void>();
  const abortEntered = Promise.withResolvers<void>();
  const abortFinalized = Promise.withResolvers<void>();
  let fd = -1;
  let releases = 0;
  let abortFinalizers = 0;
  const file = defineRuntimeResource<"server.file", number>({
    id: "server.file",
    title: "File",
    purpose: "Native request lifetime",
  });
  const telemetry = requireResource({
    resource: TelemetryRuntimeResource,
    reason: "One process instrumentation lease",
  });
  const fileProvider = defineRuntimeProvider({
    id: "server.file-provider",
    title: "File",
    provides: file,
    requires: [telemetry],
    build({ resources }) {
      assert.equal(resources.get(telemetry).availability, enabled ? "available" : "disabled");
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          events.push("acquire");
          fd = openSync(join(root, `lease-${enabled}`), "wx");
          return fd;
        }),
        release: (value) =>
          Effect.sync(() => {
            assert.equal(value, fd);
            closeSync(value);
            events.push("release");
            releases++;
          }),
      });
    },
  });
  const service = createFileService(file);
  const services = { file: useService(service) };
  const base = os.$context<ServerPluginContext<typeof services>>();
  const echoSchema = standard(Type.Object({ value: Type.String() }));
  const router = {
    echo: base
      .meta(openapi({ method: "POST", path: "/echo" }))
      .input(echoSchema)
      .output(echoSchema)
      .handler(({ input }) => input),
    promise: base
      .meta(openapi({ method: "GET", path: "/promise" }))
      .output(standard(Type.String()))
      .handler(async () => "promise"),
    effect: base
      .meta(openapi({ method: "GET", path: "/effect" }))
      .output(standard(Type.String()))
      .effect(function* ({ context, signal }) {
        assert.equal(signal, context.request.signal);
        const client = context.clients.file.withInvocation({ invocation: undefined });
        return yield* client.read().pipe(Effect.withSpan("authored.child"));
      }),
    failure: base
      .meta(openapi({ method: "GET", path: "/failure" }))
      .errors({ FORBIDDEN: { data: standard(Type.Object({ reason: Type.String() })) } })
      .effect(function* ({ errors }) {
        return yield* Effect.fail(errors.FORBIDDEN({ data: { reason: "safe" } }));
      }),
    auth: base.meta(openapi({ method: "GET", path: "/auth" })).handler(({ context }) => {
      if (context.request.headers.get("authorization") !== "Bearer accepted")
        throw new ORPCError("UNAUTHORIZED");
      return "authorized";
    }),
    defect: base.meta(openapi({ method: "GET", path: "/defect" })).effect(function* () {
      return yield* Effect.die(new Error("safe-defect"));
    }),
    hold: base.meta(openapi({ method: "GET", path: "/hold" })).effect(function* ({ context }) {
      entered.resolve();
      return yield* Effect.promise(() => gate.promise).pipe(
        Effect.flatMap(() => context.clients.file.withInvocation({ invocation: undefined }).read()),
        Effect.onExit(() =>
          Effect.sync(() => {
            assert(fstatSync(fd).isFile());
            events.push("held-finalizer");
          })
        )
      );
    }),
    abort: base.meta(openapi({ method: "GET", path: "/abort" })).effect(function* ({
      context,
      signal,
    }) {
      assert.equal(signal, context.request.signal);
      abortEntered.resolve();
      return yield* Effect.never.pipe(
        Effect.onExit(() =>
          Effect.sync(() => {
            abortFinalizers++;
            abortFinalized.resolve();
          })
        )
      );
    }),
    nested: { default: base.output(standard(Type.String())).handler(() => "default") },
    lazy: base.lazy(async () => ({
      default: { nested: base.output(standard(Type.String())).handler(() => "lazy") },
    })),
  };
  const internal = { read: base.handler(() => "internal") };
  const publicPlugin = defineServerApiPlugin.factory()({
    capability: "native",
    services,
    resourceRequirements: [telemetry],
    routeBase: "/api",
    api: () => router,
  })();
  const internalPlugin = defineServerInternalPlugin.factory()({
    capability: "native",
    services,
    resourceRequirements: [telemetry],
    routeBase: "/rpc",
    internal: () => internal,
  })();
  const app = defineApp({ id: "native-server-proof", plugins: [publicPlugin, internalPlugin] });
  const profile = defineRuntimeProfile({
    id: "local",
    configSources: [{ kind: "test" }],
    harnesses: ["elysia", "second"],
    providers: [
      providerSelection({
        resource: TelemetryRuntimeResource,
        provider: defineOpenTelemetryNodeRuntimeProvider({
          releaseDeadline: () => ({ deadlineMonotonicMilliseconds: performance.now() + 2000 }),
        }),
        config: { kind: "runtime.config", key: "telemetry" },
      }),
      providerSelection({ resource: file, provider: fileProvider }),
    ],
  });
  const selected = defineProcessCatalog({ main: { id: "main", roles: ["server"] } }).main;
  const entrypoint = defineEntrypoint({
    id: "server",
    app,
    profile,
    process: selected,
    identity: {
      app: app.id,
      process: selected.id,
      entrypoint: "server",
      deployment: "test",
      source: "native-server-fixture",
    },
  });
  const port = await freePort();
  const secondPort = await freePort();
  const firstNative = createElysiaHarness({
    id: "elysia",
    hostname: "127.0.0.1",
    port,
    publicDocument: { path: "/openapi.json", info: { title: "Native proof", version: "1" } },
  });
  const secondNative = createElysiaHarness({
    id: "second",
    hostname: "127.0.0.1",
    port: secondPort,
    publicDocument: { path: "/openapi.json", info: { title: "No public selection", version: "1" } },
  });
  let instrumentation: ReturnType<typeof getOpenTelemetryConfig>;
  let nativeMounts = 0;
  function observeNative(descriptor: typeof firstNative) {
    return {
      ...descriptor,
      async mount(input: Parameters<typeof descriptor.mount>[0]) {
        if (nativeMounts++ === 0) instrumentation = getOpenTelemetryConfig();
        else assert.equal(getOpenTelemetryConfig(), instrumentation);
        const native = await descriptor.mount(input);
        let stopping: Promise<void> | undefined;
        return {
          ...native,
          stop: () =>
            (stopping ??= (async () => {
              await native.stop();
              assert(fstatSync(fd).isFile());
              events.push(`native-ended:${descriptor.id}`);
            })()),
        };
      },
    };
  }
  const host = observeNative(firstNative);
  const second = observeNative(secondNative);
  const process = await startApp(entrypoint, {
    sources: { appRoot: root, test: { telemetry: telemetryConfiguration(enabled) } },
    integrations: [
      { surface: "server/api", harness: host },
      { surface: "server/internal", harness: host },
      { surface: "server/api", harness: second },
    ],
    finalization: { policy: "waitForNativeStop", deadlineMs: 20 },
  });
  const url = `http://127.0.0.1:${port}`;
  try {
    assert.equal(Boolean(instrumentation), enabled);
    assert.equal(nativeMounts, 2);
    assert.equal(getOpenTelemetryConfig(), instrumentation);
    assert.equal((await fetch(`http://127.0.0.1:${secondPort}/missing`)).status, 404);
    assert.equal(
      await fetch(`http://127.0.0.1:${secondPort}/api/effect`).then((r) => r.json()),
      "file-live"
    );
    const document = (await fetch(`${url}/openapi.json`).then((r) => r.json())) as {
      paths: Record<
        string,
        {
          post?: { requestBody?: unknown; responses: Record<string, unknown> };
          get?: { responses: Record<string, unknown> };
        }
      >;
    };
    assert(document.paths["/api/echo"]?.post?.requestBody);
    assert(document.paths["/api/echo"]?.post?.responses["200"]);
    assert(document.paths["/api/failure"]?.get?.responses["403"]);
    assert(document.paths["/api/nested/default"]);
    assert(document.paths["/api/lazy/nested"]);
    assert(!Object.keys(document.paths).some((path) => path.startsWith("/rpc")));
    const echo = await fetch(`${url}/api/echo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: secret }),
    }).then((r) => r.json());
    assert.deepEqual(echo, { value: secret });
    assert.equal(await fetch(`${url}/api/promise`).then((r) => r.json()), "promise");
    assert.equal(await fetch(`${url}/api/effect`).then((r) => r.json()), "file-live");
    assert.equal(
      await fetch(`${url}/api/lazy/nested`, { method: "POST" }).then((r) => r.json()),
      "lazy"
    );
    const client = createORPCClient<RouterClient<typeof internal>>(
      new RPCLink({ origin: url, url: "/rpc" })
    );
    assert.equal(await client.read(), "internal");
    const failure = await fetch(`${url}/api/failure`);
    assert.equal(failure.status, 403);
    const failureBody = (await failure.json()) as { code: string; data: unknown };
    assert.equal(failureBody.code, "FORBIDDEN");
    assert.deepEqual(failureBody.data, { reason: "safe" });
    assert.equal((await fetch(`${url}/api/auth`)).status, 401);
    assert.equal(
      (await fetch(`${url}/api/auth`, { headers: { authorization: "Bearer accepted" } })).status,
      200
    );
    const defect = await fetch(`${url}/api/defect`);
    assert.equal(defect.status, 500);
    const defectBody = await defect.text();
    assert(!defectBody.includes("safe-defect"));
    assert(!defectBody.includes('"stack"'));
    assert(!defectBody.includes('"cause"'));
    const controller = new AbortController();
    const canceled = fetch(`${url}/api/abort`, { signal: controller.signal }).catch(
      (error) => error
    );
    await abortEntered.promise;
    controller.abort();
    assert.equal(((await canceled) as { name: string }).name, "AbortError");
    await Promise.race([
      abortFinalized.promise,
      Bun.sleep(2000).then(() => {
        throw Error("Native Effect abort did not finalize");
      }),
    ]);
    assert.equal(abortFinalizers, 1);
    const held = fetch(`${url}/api/hold`, { headers: { Connection: "close" } }).then((r) =>
      r.json()
    );
    await entered.promise;
    const stop = process.stop();
    assert.equal(process.stop(), stop);
    let settled = false;
    void stop.then(() => {
      settled = true;
    });
    await Bun.sleep(50);
    assert.equal(settled, false);
    assert.equal(releases, 0);
    assert(fstatSync(fd).isFile());
    const draining = process.finalization();
    assert.equal(draining.state, "draining");
    assert(draining.state === "draining");
    assert.equal(draining.deadlineExceeded, true);
    assert(draining.pendingNativeStop.includes("elysia"));
    await assert.rejects(fetch(`${url}/api/promise`, { headers: { Connection: "close" } }));
    gate.resolve();
    assert.equal(await held, "file-live");
    await stop;
    assert.equal(releases, 1);
    assert(events.indexOf("held-finalizer") < events.indexOf("release"));
    assert(events.indexOf("native-ended:elysia") < events.indexOf("release"));
    assert(events.indexOf("native-ended:second") < events.indexOf("release"));
    assert.equal(getOpenTelemetryConfig(), undefined);
    const catalog = process.catalog();
    const procedures = catalog.diagnostics.filter(
      (record) => record.code === "server.procedure.settled"
    );
    assert(procedures.length >= 10);
    assert(!catalog.diagnostics.some((record) => record.code === "observation.unsupported"));
    assert(!JSON.stringify(catalog).includes(secret));
    assert.deepEqual(catalog.executionRecords, []);
    for (const procedure of procedures) {
      const payload = procedure.payload as { path: string[]; traceId?: string };
      if (enabled) {
        assert.match(payload.traceId!, /^[0-9a-f]{32}$/);
        observedTraceIds.add(payload.traceId!);
      } else assert.equal(payload.traceId, undefined);
    }
  } finally {
    gate.resolve();
    await process.stop();
  }
  return { enabled, releases, abortFinalizers, nativeHandles: 2 };
}

try {
  const enabled = await run(true);
  const traces = received
    .filter((item) => item.path === "/v1/traces")
    .map((item) => item.body)
    .join("\n");
  assert(traces.includes("@orpc/opentelemetry"));
  assert(traces.includes("authored.child"));
  assert(traces.includes("server-native-proof"));
  assert(!traces.includes(secret));
  type Span = {
    name: string;
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    scope: string;
  };
  const spans: Span[] = [];
  for (const record of received.filter((item) => item.path === "/v1/traces")) {
    const batch = JSON.parse(record.body) as {
      resourceSpans: {
        resource: { attributes: { key: string; value: { stringValue?: string } }[] };
        scopeSpans: { scope: { name: string }; spans: Omit<Span, "scope">[] }[];
      }[];
    };
    for (const resource of batch.resourceSpans) {
      assert(
        resource.resource.attributes.some(
          (attribute) =>
            attribute.key === "service.name" &&
            attribute.value.stringValue === "server-native-proof"
        )
      );
      for (const scope of resource.scopeSpans)
        for (const span of scope.spans) spans.push({ ...span, scope: scope.scope.name });
    }
  }
  const child = spans.find((span) => span.name === "authored.child");
  assert(child);
  const byId = new Map(spans.map((span) => [span.spanId, span]));
  let ancestor = child.parentSpanId ? byId.get(child.parentSpanId) : undefined;
  let nativeAncestor = false;
  while (ancestor) {
    assert.equal(ancestor.traceId, child.traceId);
    nativeAncestor ||= ancestor.scope === "@orpc/opentelemetry";
    ancestor = ancestor.parentSpanId ? byId.get(ancestor.parentSpanId) : undefined;
  }
  assert(nativeAncestor, "Authored Effect span must descend from the real native oRPC span");
  const exportedTraceIds = new Set(spans.map((span) => span.traceId));
  for (const id of observedTraceIds)
    assert(
      exportedTraceIds.has(id),
      "Every native procedure observation correlates to actual OTLP receipt"
    );
  const before = received.length;
  const disabled = await run(false);
  assert.equal(received.length, before);
  console.log(
    JSON.stringify({ proof: "native-server", enabled, disabled, otlpRequests: received.length })
  );
} finally {
  await collector.stop(false);
  await rm(root, { recursive: true, force: true });
}
