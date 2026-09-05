import { expect, spyOn, test } from "bun:test";
import "@orpc/experimental-effect/extensions/effect";
import { context as otelContext, ROOT_CONTEXT, trace } from "@opentelemetry/api";
import { OpenAPIGenerator, openapi } from "@orpc/openapi";
import { createProcedureClient, createRouterClient, ORPCError, os } from "@orpc/server";
import { Effect } from "effect";

import { compileRuntimePlan } from "../../compiler/src/compile-runtime-plan";
import { readRuntimeCompilationServerSources } from "../../compiler/src/runtime-compilation-reference-table";
import {
  defineRuntimeProvider,
  defineRuntimeResource,
  defineServerApiPlugin,
  defineServerInternalPlugin,
  type PluginDefinition,
  type ProviderSelection,
  providerFx,
  providerSelection,
  type RuntimeObservationPort,
  type RuntimeObservationRecord,
  requireResource,
  type ServerPluginContext,
} from "../../definition/src/index";
import { deriveServerFixture } from "../../derivation/test/helpers/server-source-fixture";
import {
  createElysiaApiAdapter,
  createElysiaInternalAdapter,
  createExecutionRegistry,
  type ElysiaRoutePayload,
  type ProcessRuntimeAccess,
  type RoleRuntimeAccess,
} from "../src/index";
import { createInvocationTracker } from "../src/invocation-tracker";
import { createNativeServerRequestAssembly } from "../src/server-request";
import { createSurfaceCapabilities } from "../src/surface-capabilities";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Actual cold handoff and native request assembly; supplied ready values are test ports, not acquisition proof. */
function lowerFixture(
  plugins: readonly PluginDefinition[],
  options: {
    readonly observation?: RuntimeObservationPort;
    readonly providers?: readonly ProviderSelection[];
    readonly values?: ReadonlyMap<string, unknown>;
  } = {}
) {
  const derivation = deriveServerFixture(plugins, ["server"], options.providers);
  const compilation = compileRuntimePlan({ derivation });
  const admission = createInvocationTracker();
  const registry = createExecutionRegistry({
    processId: compilation.plan.identity.process,
    registryInput: compilation.plan.executionRegistryInput,
    executionPlans: compilation.plan.executionPlans,
    descriptorTable: derivation.executionDescriptorTable,
    assertOpen: admission.assertOpen,
  });
  const noResources = {
    resource(): never {
      throw new TypeError("No whole-process access in native request fixture.");
    },
    optionalResource: () => undefined,
  };
  const access: ProcessRuntimeAccess = {
    appId: compilation.plan.identity.app,
    processId: compilation.plan.identity.process,
    entrypointId: compilation.plan.identity.entrypoint,
    profileId: compilation.plan.profileId,
    roles: compilation.plan.roles,
    ...noResources,
  };
  const roleAccess: RoleRuntimeAccess = {
    role: "server",
    process: access,
    selectedSurfaces: compilation.plan.surfaces,
    forSurface(): never {
      throw new TypeError("No whole-process surface access in native fixture.");
    },
    ...noResources,
  };
  const sources = new Map(readRuntimeCompilationServerSources(compilation.references));
  const ready = new Map(
    compilation.plan.compiledResources.map(
      (resource) =>
        [resource.selectionId, options.values?.get(resource.resource.resourceId)] as const
    )
  );
  const lowered = compilation.plan.surfaces.map((surface) => {
    const capabilities = (
      continuation?: Parameters<typeof createSurfaceCapabilities>[0]["continuation"]
    ) =>
      createSurfaceCapabilities({
        compilation,
        surface,
        bindings: new Map(),
        values: { has: (id) => ready.has(id), get: (id) => ready.get(id) },
        admission,
        continuation,
      });
    const requests = createNativeServerRequestAssembly({
      identity: compilation.plan.identity,
      surface,
      admission,
      capabilities,
      observation: options.observation,
    });
    const source = sources.get(surface.surfacePlanId)!;
    const adapter =
      source.kind === "server/api"
        ? createElysiaApiAdapter({ harness: "native-test" })
        : createElysiaInternalAdapter({ harness: "native-test" });
    const result = adapter.lower({
      plan: surface,
      processAccess: access,
      roleAccess,
      serviceBindings: capabilities().clients,
      resources: capabilities().resources,
      executionRegistry: registry,
      nativeServer: { source, requests },
    });
    return { surface, result, requests };
  });
  return { compilation, admission, lowered };
}

function publicPayload(payload: ElysiaRoutePayload) {
  if (payload.kind !== "server/api") throw new TypeError("Expected public fixture payload.");
  return payload;
}

test("ordinary native handlers observe only a valid active OTel trace identity", async () => {
  const validTraceId = "1234567890abcdef1234567890abcdef";
  for (const parent of [
    { traceId: validTraceId, spanId: "1234567890abcdef", traceFlags: 1 },
    { traceId: "00000000000000000000000000000000", spanId: "1234567890abcdef", traceFlags: 1 },
    undefined,
  ]) {
    const active = parent === undefined ? ROOT_CONTEXT : trace.setSpanContext(ROOT_CONTEXT, parent);
    const current = spyOn(otelContext, "active").mockReturnValue(active);
    const records: RuntimeObservationRecord[] = [];
    const plugin = defineServerApiPlugin.factory()({
      capability: "handler-trace",
      services: {},
      routeBase: "/api",
      api: () => ({ read: os.handler(() => "native handler") }),
    })();
    const fixture = lowerFixture([plugin], {
      observation: {
        publish: (record) => {
          records.push(record);
        },
      },
    });
    try {
      const result = await fixture.lowered[0]!.result.payload.handle(
        new Request("http://local/api/read", { method: "POST" })
      );
      expect(result.matched).toBe(true);
      if (result.matched) expect(await result.response.json()).toBe("native handler");
      expect(records).toHaveLength(1);
      expect(records[0]!.payload).not.toHaveProperty("nativeEffect");
      if (parent?.traceId === validTraceId)
        expect(records[0]!.payload).toHaveProperty("traceId", validTraceId);
      else expect(records[0]!.payload).not.toHaveProperty("traceId");
    } finally {
      current.mockRestore();
      await fixture.admission.closeAndDrain();
    }
  }
});

test("native default, nested, explicit, prefixed and lazy public paths share handler/document truth", async () => {
  let factories = 0;
  let loaders = 0;
  let bodies = 0;
  const plugin = defineServerApiPlugin.factory()({
    capability: "paths",
    services: {},
    routeBase: "/api",
    api() {
      factories++;
      return {
        nested: {
          hello: os.handler(() => {
            bodies++;
            return "nested";
          }),
        },
        explicit: os.meta(openapi({ method: "GET", path: "/exact" })).handler(() => {
          bodies++;
          return "explicit";
        }),
        prefixed: os.meta(openapi.prefix("/local")).router({
          hello: os.handler(() => {
            bodies++;
            return "prefixed";
          }),
        }),
        deferred: os.lazy(async () => {
          loaders++;
          return {
            default: {
              hello: os.handler(() => {
                bodies++;
                return "lazy";
              }),
            },
          };
        }),
      };
    },
  })();
  const fixture = lowerFixture([plugin]);
  const payload = publicPayload(fixture.lowered[0]!.result.payload);
  expect({ factories, loaders, bodies }).toEqual({ factories: 1, loaders: 0, bodies: 0 });
  const document = await new OpenAPIGenerator().generate({ synthetic: await payload.document() });
  expect(Object.keys(document.paths ?? {}).sort()).toEqual([
    "/api/deferred/hello",
    "/api/exact",
    "/api/local/prefixed/hello",
    "/api/nested/hello",
  ]);
  expect(loaders).toBe(1);
  expect(bodies).toBe(0);
  for (const [method, path, expected] of [
    ["POST", "/api/nested/hello", "nested"],
    ["GET", "/api/exact", "explicit"],
    ["POST", "/api/local/prefixed/hello", "prefixed"],
    ["POST", "/api/deferred/hello", "lazy"],
  ]) {
    expect(await payload.matches(method!, path! as `/${string}`)).toBe(true);
    const result = await payload.handle(new Request(`http://local${path}`, { method }));
    expect(result.matched).toBe(true);
    if (result.matched) expect(await result.response.json()).toBe(expected);
  }
  expect(bodies).toBe(4);
  await fixture.admission.closeAndDrain();
  expect(() =>
    payload.handle(new Request("http://local/api/nested/hello", { method: "POST" }))
  ).toThrow(TypeError);
});

test("internal native RPC keeps its route base and never exposes document inputs", async () => {
  let bodies = 0;
  const plugin = defineServerInternalPlugin.factory()({
    capability: "internal",
    services: {},
    routeBase: "/private",
    internal: () => ({
      nested: {
        read: os.handler(() => {
          bodies++;
          return "private";
        }),
      },
    }),
  })();
  const fixture = lowerFixture([plugin]);
  const payload = fixture.lowered[0]!.result.payload;
  expect(payload.kind).toBe("server/internal");
  if (payload.kind !== "server/internal") throw new TypeError("Expected internal fixture payload.");
  expect("document" in payload).toBe(false);
  expect(await payload.routes()).toEqual([
    { method: "POST", path: "/private/nested/read" },
    { method: "PUT", path: "/private/nested/read" },
    { method: "PATCH", path: "/private/nested/read" },
    { method: "DELETE", path: "/private/nested/read" },
  ]);
  expect(await payload.matches("GET", "/private/nested/read")).toBe(false);
  expect(await payload.matches("POST", "/private/nested/read")).toBe(true);
  expect(bodies).toBe(0);
  const result = await payload.handle(
    new Request("http://local/private/nested/read", { method: "POST" })
  );
  expect(result.matched).toBe(true);
  if (result.matched) expect(await result.response.json()).toEqual({ json: "private" });
  expect(bodies).toBe(1);
  await fixture.admission.closeAndDrain();
});

test("native request context keeps exact Request and captured bounded resources through stream drain", async () => {
  const resource = defineRuntimeResource<"server.ready", { value: number }>({
    id: "server.ready",
    title: "Ready value",
    purpose: "Native continuation proof",
  });
  const optional = requireResource({
    resource,
    instance: "absent",
    optional: true,
    reason: "Optional fixture",
  });
  const required = requireResource({ resource, reason: "Ready fixture" });
  const foreign = requireResource({
    resource,
    instance: "foreign",
    optional: true,
    reason: "Foreign fixture",
  });
  const provider = defineRuntimeProvider({
    id: "server.ready.provider",
    title: "Cold ready fixture",
    provides: resource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.succeed({ value: 42 }),
        release: () => Effect.void,
      }),
  });
  const cleanup = deferred();
  let captured: ServerPluginContext | undefined;
  const procedure = os.$context<ServerPluginContext>().handler(({ context }) => {
    captured = context;
    expect(context.resources.get(optional)).toBeUndefined();
    expect(context.resources.has(optional)).toBe(false);
    expect(() => context.resources.get(foreign)).toThrow(TypeError);
    return (async function* () {
      try {
        yield context.resources.get(required).value;
      } finally {
        await cleanup.promise;
      }
    })();
  });
  const plugin = defineServerApiPlugin.factory()({
    capability: "resources",
    services: {},
    routeBase: "/api",
    resourceRequirements: [required, optional],
    api: () => ({ stream: procedure }),
  })();
  const fixture = lowerFixture([plugin], {
    providers: [providerSelection({ resource, provider })],
    values: new Map([[resource.id, { value: 42 }]]),
  });
  const requests = fixture.lowered[0]!.requests;
  const request = new Request("http://local/api/stream");
  const client = createRouterClient(
    { stream: procedure },
    {
      context: requests.context(request),
      interceptors: requests.clientInterceptors,
    }
  );
  const output = await client.stream(undefined);
  expect(captured!.request).toBe(request);
  let drained = false;
  const drain = fixture.admission.closeAndDrain().then(() => {
    drained = true;
  });
  expect(await output.next()).toEqual({ value: 42, done: false });
  const ending = output.return(undefined);
  await Promise.resolve();
  expect(drained).toBe(false);
  expect(captured!.resources.get(required)).toEqual({ value: 42 });
  cleanup.resolve();
  await ending;
  await drain;
  expect(() => captured!.resources.get(required)).toThrow(TypeError);
});

test("official Effect bridge preserves defect and abort cleanup while observation throws or rejects", async () => {
  const entered = deferred();
  const cleanup = deferred();
  const cleanupStarted = deferred();
  const failure = new Error("private defect payload");
  const records: RuntimeObservationRecord[] = [];
  const procedure = os.$context<ServerPluginContext>().effect(function* ({ context }) {
    if (context.request.headers.has("defect")) return yield* Effect.die(failure);
    return yield* Effect.scoped(
      Effect.gen(function* () {
        yield* Effect.acquireRelease(Effect.void, () =>
          Effect.promise(async () => {
            cleanupStarted.resolve();
            await cleanup.promise;
          })
        );
        entered.resolve();
        return yield* Effect.never;
      })
    );
  });
  const plugin = defineServerApiPlugin.factory()({
    capability: "outcomes",
    services: {},
    routeBase: "/api",
    api: () => ({ run: procedure }),
  })();
  const fixture = lowerFixture([plugin], {
    observation: {
      publish(record) {
        records.push(record);
        if (records.length === 1) throw new Error("sink failed");
        return Promise.reject(new Error("async sink failed"));
      },
    },
  });
  const requests = fixture.lowered[0]!.requests;
  const invoke = (request: Request) =>
    createProcedureClient(procedure, {
      context: requests.context(request),
      interceptors: requests.clientInterceptors,
    })(undefined, { signal: request.signal });
  await expect(
    invoke(new Request("http://local/api/run", { headers: { defect: "true" } }))
  ).rejects.toBe(failure);
  const controller = new AbortController();
  const reason = new Error("private cancellation reason");
  let settled = false;
  const running = invoke(
    new Request("http://local/api/run", { signal: controller.signal })
  ).finally(() => {
    settled = true;
  });
  const caught = running.catch((error) => error);
  await entered.promise;
  controller.abort(reason);
  await cleanupStarted.promise;
  let drained = false;
  const drain = fixture.admission.closeAndDrain().then(() => {
    drained = true;
  });
  expect(settled).toBe(false);
  expect(drained).toBe(false);
  cleanup.resolve();
  expect(await caught).toBe(reason);
  await drain;
  expect(records).toHaveLength(2);
  expect(records[0]!.payload).toMatchObject({
    outcome: "rejected",
    nativeEffect: { defect: true, interrupted: false },
  });
  expect(records[1]!.payload).toMatchObject({
    outcome: "rejected",
    nativeEffect: { interrupted: true },
  });
  expect(JSON.stringify(records)).not.toContain("private");
});

test("native declared errors and handler authorization stay native outcomes, not execution descriptors", async () => {
  const denied = new ORPCError("UNAUTHORIZED", { message: "private authorization detail" });
  const deniedEffect = os
    .$context<ServerPluginContext>()
    .errors({ FORBIDDEN: {} })
    .effect(function* ({ errors }) {
      return yield* Effect.fail(errors.FORBIDDEN({ message: "private declared detail" }));
    });
  const authorized = os
    .$context<ServerPluginContext>()
    .use(({ context, next }) => {
      if (!context.request.headers.has("authorization")) throw denied;
      return next();
    })
    .handler(() => "allowed");
  const records: RuntimeObservationRecord[] = [];
  const plugin = defineServerApiPlugin.factory()({
    capability: "auth",
    services: {},
    routeBase: "/api",
    api: () => ({ deniedEffect, authorized }),
  })();
  const fixture = lowerFixture([plugin], {
    observation: {
      publish: (record) => {
        records.push(record);
      },
    },
  });
  expect(fixture.compilation.plan.executionPlans).toEqual([]);
  const payload = fixture.lowered[0]!.result.payload;
  for (const [path, headers, status] of [
    ["authorized", {}, 401],
    ["authorized", { authorization: "native" }, 200],
    ["deniedEffect", {}, 403],
  ] as const) {
    const result = await payload.handle(
      new Request(`http://local/api/${path}`, { method: "POST", headers })
    );
    expect(result.matched).toBe(true);
    if (result.matched) expect(result.response.status).toBe(status);
  }
  expect(records.map((record) => record.payload)).toMatchObject([
    { outcome: "rejected", errorCode: "UNAUTHORIZED" },
    { outcome: "returned" },
    { outcome: "rejected", errorCode: "FORBIDDEN", nativeEffect: { defect: false } },
  ]);
  expect(JSON.stringify(records)).not.toContain("private");
  await fixture.admission.closeAndDrain();
});
