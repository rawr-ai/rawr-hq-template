import { expect, test } from "bun:test";
import type {
  WebEffectRoute,
  WebHostPayload,
  WebModuleRoute,
} from "../../process-runtime/src/adapters/web";
import type { MountReadySurfaceRuntimeRecord } from "../../process-runtime/src/mount-ready-process";
import type { HarnessMountInput } from "../src/harness-descriptor";
import { createBunWebHarness } from "../web/index";

function input(
  routes: WebHostPayload["routes"]
): HarnessMountInput<MountReadySurfaceRuntimeRecord<WebHostPayload>> {
  return {
    launchIdentity: Object.freeze({
      app: "web-test",
      process: "web",
      entrypoint: "main",
      deployment: "test",
      source: "web-test",
    }),
    roles: ["web"],
    mountReadyPayloads: [
      {
        kind: "runtime.mount-ready-surface",
        surfacePlanId: "web-surface",
        pluginOwnerId: "web-plugin",
        role: "web",
        surface: "web/app",
        capability: "web-test",
        harnessId: "web-host",
        serviceBindings: [],
        payload: { kind: "web/app", routes },
        payloadSchemas: [],
        findings: [],
        observations: [],
      },
    ],
    processAccess: {
      appId: "web-test",
      processId: "web",
      entrypointId: "main",
      profileId: "test",
      roles: ["web"],
      resource() {
        throw new Error("This host must not acquire resources.");
      },
      optionalResource() {
        return undefined;
      },
    },
    requiredResources: { ready: true, resources: [] },
    reports: { report() {} },
  };
}

function effect(path: string, handle: WebEffectRoute["handle"]): WebEffectRoute {
  return {
    kind: "web.effect",
    id: path,
    path,
    handle,
    ref: {
      kind: "execution.descriptor-ref",
      boundary: "plugin.web-surface",
      ownerId: `plugin-owner:sha256:${"0".repeat(64)}`,
      executionId: `execution-descriptor:sha256:${"0".repeat(64)}`,
      surfaceId: path,
    },
  };
}

function moduleRoute(path: string, load: WebModuleRoute["load"]): WebModuleRoute {
  return {
    kind: "web.module",
    id: path,
    path,
    load,
    ref: {
      kind: "web.route-module-ref",
      ownerId: `plugin-owner:sha256:${"0".repeat(64)}`,
      routeId: path,
      path,
    },
  };
}

function config(port: number) {
  return { id: "web-host", hostname: "127.0.0.1", port };
}

async function freePort(): Promise<number> {
  const reservation = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
  const port = reservation.port!;
  await reservation.stop(false);
  return port;
}

test("the cold native factory captures host options and validates before listening", () => {
  const options = config(0);
  const descriptor = createBunWebHarness(options);
  options.id = "changed";
  expect(descriptor.id).toBe("web-host");
  expect(descriptor.roles).toEqual(["web"]);
  expect(descriptor.surfaces).toEqual(["web/app"]);
  for (const port of [-1, 65536, 1.5, Number.NaN])
    expect(() => createBunWebHarness(config(port))).toThrow(TypeError);
});

test("real lazy TS-to-HTML modules and native Request routes share Bun's actual path map", async () => {
  const port = await freePort();
  let loaded = 0;
  let invoked = 0;
  let captured: Request | undefined;
  const descriptor = createBunWebHarness(config(port));
  const mount = input([
    moduleRoute("/", async () => {
      loaded++;
      return import("./fixtures/web/page");
    }),
    effect("/items/:id", async (request) => {
      captured = request;
      invoked++;
      return Response.json({
        native: request instanceof Request,
        params: "params" in request ? request.params : undefined,
        method: request.method,
        header: request.headers.get("x-original"),
        body: await request.text(),
      });
    }),
    effect("/items/fixed", async () => new Response("native static precedence")),
  ]);
  expect(loaded).toBe(0);
  expect(invoked).toBe(0);
  const host = await descriptor.mount(mount);
  try {
    expect(loaded).toBe(1);
    expect(invoked).toBe(0);
    const html = await fetch(`http://127.0.0.1:${port}/`).then((response) => response.text());
    expect(html).toContain("Native HTML route");
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
      (match) => match[1]!
    );
    expect(assets.some((asset) => asset.endsWith(".js"))).toBe(true);
    expect(assets.some((asset) => asset.endsWith(".css"))).toBe(true);
    for (const asset of assets) {
      const response = await fetch(new URL(asset, `http://127.0.0.1:${port}/`));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        asset.endsWith(".js") ? "javascript" : "css"
      );
      expect((await response.text()).length).toBeGreaterThan(0);
    }
    const result = await fetch(`http://127.0.0.1:${port}/items/native`, {
      method: "POST",
      headers: { "x-original": "same" },
      body: "raw",
    }).then((response) => response.json());
    expect(result).toEqual({
      native: true,
      params: { id: "native" },
      method: "POST",
      header: "same",
      body: "raw",
    });
    expect(captured?.bodyUsed).toBe(true);
    expect(
      await fetch(`http://127.0.0.1:${port}/items/fixed`).then((response) => response.text())
    ).toBe("native static precedence");
    expect(invoked).toBe(1);
    expect(await host.readiness?.()).toMatchObject({
      status: "passing",
      launchIdentity: mount.launchIdentity,
    });
  } finally {
    await host.stop();
  }
  expect(await host.liveness?.()).toMatchObject({ status: "failing" });
});

test("duplicate exact path ownership refuses before any module loads, without banning native patterns", async () => {
  let loaded = 0;
  const descriptor = createBunWebHarness(config(0));
  const first = moduleRoute("/same", async () => {
    loaded++;
    return import("./fixtures/web/page");
  });
  for (const duplicate of [first, effect("/same", async () => new Response())])
    await expect(descriptor.mount(input([first, duplicate]))).rejects.toThrow(
      "duplicate exact paths"
    );
  expect(loaded).toBe(0);
  const mount = input([first]);
  await expect(
    descriptor.mount({
      ...mount,
      mountReadyPayloads: [
        ...mount.mountReadyPayloads,
        { ...mount.mountReadyPayloads[0]!, surfacePlanId: "other" },
      ],
    })
  ).rejects.toThrow("duplicate exact paths");
  expect(loaded).toBe(0);
});

test("native transport maps rejected handlers to bounded 500 without killing the host", async () => {
  const port = await freePort();
  const failure = new Error("private-native-handler-failure");
  const host = await createBunWebHarness(config(port)).mount(
    input([
      effect("/failure", async () => {
        throw failure;
      }),
      effect("/success", async () => new Response("still serving")),
    ])
  );
  try {
    const response = await fetch(`http://127.0.0.1:${port}/failure`);
    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Internal Server Error");
    expect(await fetch(`http://127.0.0.1:${port}/success`).then((value) => value.text())).toBe(
      "still serving"
    );
    expect(await host.liveness?.()).toMatchObject({ status: "passing" });
  } finally {
    await host.stop();
  }
});

test("invalid modules and absent readiness fail before binding and preserve loader failure identity", async () => {
  const failure = new Error("exact loader rejection");
  const descriptor = createBunWebHarness(config(0));
  await expect(
    descriptor.mount(
      input([
        moduleRoute("/", async () => {
          throw failure;
        }),
      ])
    )
  ).rejects.toBe(failure);
  for (const value of [undefined, {}, { default: "html" }, { default: { index: 1 } }])
    await expect(descriptor.mount(input([moduleRoute("/", async () => value)]))).rejects.toThrow(
      TypeError
    );
  let loaded = 0;
  const mount = input([
    moduleRoute("/", async () => {
      loaded++;
      return import("./fixtures/web/page");
    }),
  ]);
  await expect(
    descriptor.mount({ ...mount, requiredResources: { ready: false, resources: [] } })
  ).rejects.toThrow(TypeError);
  expect(loaded).toBe(0);
});

test("original Request cancellation reaches the body and graceful stop waits a held Response stream", async () => {
  const port = await freePort();
  const entered = Promise.withResolvers<void>();
  const aborted = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let signal: AbortSignal | undefined;
  const host = await createBunWebHarness(config(port)).mount(
    input([
      effect("/abort", async (request) => {
        request.signal.addEventListener("abort", () => aborted.resolve(), { once: true });
        entered.resolve();
        await aborted.promise;
        return new Response("aborted");
      }),
      effect("/stream", async (request) => {
        signal = request.signal;
        let first = true;
        return new Response(
          new ReadableStream<Uint8Array>({
            async pull(controller) {
              if (first) {
                first = false;
                controller.enqueue(new TextEncoder().encode("first"));
                return;
              }
              await release.promise;
              controller.enqueue(new TextEncoder().encode("last"));
              controller.close();
            },
          })
        );
      }),
    ])
  );
  const controller = new AbortController();
  const canceled = fetch(`http://127.0.0.1:${port}/abort`, { signal: controller.signal }).catch(
    () => undefined
  );
  let stopping: Promise<void> | undefined;
  try {
    await entered.promise;
    controller.abort();
    await aborted.promise;
    expect(await canceled).toBeUndefined();
    const response = await fetch(`http://127.0.0.1:${port}/stream`);
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("first");
    stopping = host.stop();
    expect(host.stop()).toBe(stopping);
    let stopped = false;
    void stopping.then(() => {
      stopped = true;
    });
    await Bun.sleep(20);
    expect(stopped).toBe(false);
    expect(signal?.aborted).toBe(false);
    const fresh = await fetch(`http://127.0.0.1:${port}/stream`, {
      headers: { Connection: "close" },
    }).catch(() => undefined);
    expect(fresh === undefined || fresh.status === 503).toBe(true);
    expect(await host.readiness?.()).toMatchObject({ status: "failing" });
    release.resolve();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("last");
    expect((await reader.read()).done).toBe(true);
    await stopping;
  } finally {
    controller.abort();
    aborted.resolve();
    release.resolve();
    await canceled;
    await (stopping ?? host.stop());
  }
});
