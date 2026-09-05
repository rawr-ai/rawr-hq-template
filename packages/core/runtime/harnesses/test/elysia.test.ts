import { expect, test } from "bun:test";
import { oc } from "@orpc/contract";
import { openapi, populateRouterContractOpenAPIPaths } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIMatcher } from "@orpc/openapi/standard";
import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { RPC_DEFAULT_ALLOW_METHODS, RPCMatcher } from "@orpc/server/standard";
import { mergeHttpPath, pathToHttpPath } from "@orpc/shared";
import type {
  ElysiaRoutePayload,
  MountReadySurfaceRuntimeRecord,
} from "../../process-runtime/src/index";
import { createElysiaHarness } from "../elysia/index";
import type { HarnessMountInput } from "../src/index";

function input(
  payload: ElysiaRoutePayload
): HarnessMountInput<MountReadySurfaceRuntimeRecord<ElysiaRoutePayload>> {
  return {
    launchIdentity: {
      app: "app",
      process: "server",
      entrypoint: "main",
      deployment: "test",
      source: "test",
    },
    roles: ["server"],
    mountReadyPayloads: [
      {
        kind: "runtime.mount-ready-surface",
        surfacePlanId: "surface",
        pluginOwnerId: "plugin",
        role: "server",
        surface: payload.kind,
        capability: "test",
        harnessId: "http",
        serviceBindings: [],
        payload,
        payloadSchemas: [],
        findings: [],
        observations: [],
      },
    ],
    processAccess: {
      appId: "app",
      processId: "server",
      entrypointId: "main",
      profileId: "test",
      roles: ["server"],
      resource: () => {
        throw Error("Host cannot acquire resources");
      },
      optionalResource: () => undefined,
    },
    requiredResources: { ready: true, resources: [] },
    reports: { report() {} },
  };
}

function config(port: number) {
  return {
    id: "http",
    hostname: "127.0.0.1",
    port,
    publicDocument: { path: "/openapi.json", info: { title: "Test", version: "1" } },
  };
}

function publicPayload(path: `/${string}`, method: "GET" | "POST" = "GET"): ElysiaRoutePayload {
  const router = { operation: os.meta(openapi({ path, method })).handler(() => "public") };
  const matcher = new OpenAPIMatcher(router);
  const handler = new OpenAPIHandler(router);
  return {
    kind: "server/api",
    routeBase: "/api",
    document: async () =>
      oc.meta(openapi.prefix("/api")).router(populateRouterContractOpenAPIPaths(router)),
    matches: async (method, path) => (await matcher.match(method, path, "/api")) !== undefined,
    handle: (request) => handler.handle(request, { prefix: "/api", context: {} }),
  };
}

function internalPayload(name: string): ElysiaRoutePayload {
  const router = { [name]: os.handler(() => "internal") };
  const matcher = new RPCMatcher(router);
  const handler = new RPCHandler(router);
  return {
    kind: "server/internal",
    routeBase: "/api",
    routes: async () =>
      RPC_DEFAULT_ALLOW_METHODS.map((method) => ({
        method,
        path: mergeHttpPath("/api", pathToHttpPath([name])),
      })),
    matches: async (method, path) => (await matcher.match(method, path, "/api")) !== undefined,
    handle: (request) => handler.handle(request, { prefix: "/api", context: {} }),
  };
}

function cohost(payloads: readonly ElysiaRoutePayload[]) {
  return {
    ...input(payloads[0]!),
    mountReadyPayloads: payloads.map((payload, index) => ({
      ...input(payload).mountReadyPayloads[0]!,
      surfacePlanId: `surface:${index}`,
    })),
  };
}

test("native cross-owner overlap refuses aliases, mixed dynamic paths and conflicting RPC ownership", async () => {
  for (const payloads of [
    [publicPayload("/items/{id}"), publicPayload("/items/{slug}")],
    [publicPayload("/{x}/a"), publicPayload("/b/{y}")],
    [publicPayload("/files/{+rest}"), publicPayload("/files/a/b")],
    [internalPayload("read"), internalPayload("read")],
    [publicPayload("/read", "POST"), internalPayload("read")],
  ]) {
    await expect(createElysiaHarness(config(0)).mount(cohost(payloads))).rejects.toBeInstanceOf(
      TypeError
    );
  }
});

test("same base, disjoint methods and literal RPC stars retain native meaning", async () => {
  const port = await freePort();
  const host = await createElysiaHarness(config(port)).mount(
    cohost([
      publicPayload("/read"),
      internalPayload("read"),
      internalPayload("*"),
      publicPayload("/literal", "POST"),
    ])
  );
  try {
    expect(await fetch(`http://127.0.0.1:${port}/api/read`).then((r) => r.json())).toBe("public");
    expect(
      await fetch(`http://127.0.0.1:${port}/api/literal`, { method: "POST" }).then((r) => r.json())
    ).toBe("public");
    expect(
      await fetch(`http://127.0.0.1:${port}/api/not-a-star`, { method: "POST" }).then(
        (r) => r.status
      )
    ).toBe(404);
  } finally {
    await host.stop();
  }
});

test("only public surfaces require a publication endpoint", async () => {
  const { publicDocument: _publication, ...options } = config(await freePort());
  const host = await createElysiaHarness(options).mount(input(internalPayload("read")));
  try {
    expect(await fetch(`http://127.0.0.1:${options.port}/openapi.json`).then((r) => r.status)).toBe(
      404
    );
  } finally {
    await host.stop();
  }
  await expect(
    createElysiaHarness({ ...options, port: 0 }).mount(input(publicPayload("/read")))
  ).rejects.toBeInstanceOf(TypeError);
});

async function freePort(): Promise<number> {
  const reservation = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = reservation.port!;
  await reservation.stop(true);
  return port;
}

test("cold factory captures config and refuses malformed host options without listening", () => {
  const options = config(0);
  const descriptor = createElysiaHarness(options);
  options.id = "changed";
  expect(descriptor.id).toBe("http");
  expect(descriptor.surfaces).toEqual(["server/api", "server/internal"]);
  expect(() => createElysiaHarness({ ...options, port: -1 })).toThrow(TypeError);
  expect(() =>
    createElysiaHarness({
      ...options,
      publicDocument: { ...options.publicDocument, path: "/{id}" },
    })
  ).toThrow(TypeError);
});

test("native public handler and native generated document agree, with original Request body", async () => {
  const router = {
    echo: os.meta(openapi({ method: "POST", path: "/echo" })).handler(({ input }) => input ?? "ok"),
  };
  const handler = new OpenAPIHandler(router);
  const matcher = new OpenAPIMatcher(router);
  const payload: ElysiaRoutePayload = {
    kind: "server/api",
    routeBase: "/public",
    handle: (request) => handler.handle(request, { prefix: "/public", context: {} }),
    document: async () =>
      oc.meta(openapi.prefix("/public")).router(populateRouterContractOpenAPIPaths(router)),
    matches: async (method, path) => (await matcher.match(method, path, "/public")) !== undefined,
  };
  const port = await freePort();
  const host = await createElysiaHarness(config(port)).mount(input(payload));
  try {
    const document = (await fetch(`http://127.0.0.1:${port}/openapi.json`).then((r) =>
      r.json()
    )) as { paths: Record<string, unknown> };
    expect(Object.keys(document.paths)).toEqual(["/public/echo"]);
    const response = await fetch(`http://127.0.0.1:${port}/public/echo`, {
      method: "POST",
      body: JSON.stringify({ message: "body" }),
      headers: { "content-type": "application/json" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "body" });
    expect(await host.readiness?.()).toMatchObject({ status: "passing", harnessId: "http" });
  } finally {
    await host.stop();
  }
  expect(await host.readiness?.()).toMatchObject({ status: "failing" });
});

test("stop shares native graceful drain, rejects new connections, and preserves admitted request signal", async () => {
  const entered = Promise.withResolvers<void>();
  const gate = Promise.withResolvers<void>();
  let signal: AbortSignal | undefined;
  const payload: ElysiaRoutePayload = {
    kind: "server/internal",
    routeBase: "/internal",
    async routes() {
      return [];
    },
    async matches() {
      return false;
    },
    async handle(request) {
      signal = request.signal;
      entered.resolve();
      await gate.promise;
      return { matched: true, response: new Response("settled") };
    },
  };
  const port = await freePort();
  const host = await createElysiaHarness(config(port)).mount(input(payload));
  const first = fetch(`http://127.0.0.1:${port}/internal`, {
    headers: { Connection: "close" },
  }).then((r) => r.text());
  await entered.promise;
  let stopped = false;
  const stop = host.stop();
  expect(host.stop()).toBe(stop);
  void stop.then(() => {
    stopped = true;
  });
  try {
    await Bun.sleep(25);
    expect(stopped).toBe(false);
    expect(signal?.aborted).toBe(false);
    await expect(
      fetch(`http://127.0.0.1:${port}/new`, { headers: { Connection: "close" } })
    ).rejects.toBeDefined();
  } finally {
    gate.resolve();
    await first;
    await stop;
  }
  expect(stopped).toBe(true);
});

test("required readiness refuses before native bind", async () => {
  const mount = input({
    kind: "server/internal",
    routeBase: "/internal",
    async routes() {
      return [];
    },
    async matches() {
      return false;
    },
    async handle() {
      return { matched: false };
    },
  });
  await expect(
    createElysiaHarness(config(0)).mount({
      ...mount,
      requiredResources: { ready: false, resources: [] },
    })
  ).rejects.toBeInstanceOf(TypeError);
});

test("native matcher refuses a dynamic publication collision without invoking a procedure", async () => {
  let invoked = 0;
  const router = {
    read: os.meta(openapi({ method: "GET", path: "/{id}" })).handler(() => {
      invoked++;
      return "value";
    }),
  };
  const matcher = new OpenAPIMatcher(router);
  const handler = new OpenAPIHandler(router);
  const payload: ElysiaRoutePayload = {
    kind: "server/api",
    routeBase: "/",
    handle: (request) => handler.handle(request, { context: {} }),
    matches: async (method, path) => (await matcher.match(method, path, undefined)) !== undefined,
    document: async () => populateRouterContractOpenAPIPaths(router),
  };
  await expect(createElysiaHarness(config(0)).mount(input(payload))).rejects.toBeInstanceOf(
    TypeError
  );
  expect(invoked).toBe(0);
});

test("duplicate native public method/path refuses before a listening socket exists", async () => {
  const router = {
    read: os.meta(openapi({ method: "GET", path: "/same" })).handler(() => "value"),
  };
  const payload: ElysiaRoutePayload = {
    kind: "server/api",
    routeBase: "/",
    async handle() {
      throw Error("must remain cold");
    },
    async matches() {
      return false;
    },
    document: async () => populateRouterContractOpenAPIPaths(router),
  };
  const mount = input(payload);
  await expect(
    createElysiaHarness(config(0)).mount({
      ...mount,
      mountReadyPayloads: [
        ...mount.mountReadyPayloads,
        { ...mount.mountReadyPayloads[0]!, surfacePlanId: "second" },
      ],
    })
  ).rejects.toBeInstanceOf(TypeError);
});

test("client cancellation reaches the native Request signal and settles before stop", async () => {
  const entered = Promise.withResolvers<void>();
  const aborted = Promise.withResolvers<void>();
  const port = await freePort();
  const host = await createElysiaHarness(config(port)).mount(
    input({
      kind: "server/internal",
      routeBase: "/",
      async routes() {
        return [];
      },
      async matches() {
        return false;
      },
      async handle(request) {
        request.signal.addEventListener("abort", () => aborted.resolve(), { once: true });
        entered.resolve();
        await aborted.promise;
        return { matched: true, response: new Response("aborted") };
      },
    })
  );
  const controller = new AbortController();
  const response = fetch(`http://127.0.0.1:${port}/abort`, { signal: controller.signal }).catch(
    () => undefined
  );
  await entered.promise;
  controller.abort();
  try {
    await Promise.race([
      aborted.promise,
      Bun.sleep(1000).then(() => {
        throw Error("No native request abort");
      }),
    ]);
    expect(await response).toBeUndefined();
  } finally {
    aborted.resolve();
    await host.stop();
  }
});
