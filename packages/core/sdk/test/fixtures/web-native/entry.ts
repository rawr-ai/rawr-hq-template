import assert from "node:assert/strict";
import { closeSync, fstatSync, openSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineApp, defineEntrypoint, defineProcessCatalog, startApp } from "@habitat-ai/sdk/app";
import { defineWebAppPlugin } from "@habitat-ai/sdk/plugins/web";
import {
  defineWebEffect,
  type WebEffectExecutionContext,
} from "@habitat-ai/sdk/plugins/web/effect";
import { deriveRuntimeArtifacts } from "@habitat-ai/sdk/runtime/derivation";
import { createBunWebHarness } from "@habitat-ai/sdk/runtime/harnesses/web";
import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { defineRuntimeResource, requireResource } from "@habitat-ai/sdk/runtime/resources";
import { Effect } from "effect";

const port = Number(process.env.HABITAT_WEB_PORT);
assert(Number.isInteger(port) && port > 0);
const base = `http://127.0.0.1:${port}`;
const events: string[] = [];
let loaderCalls = 0;
let bodyCalls = 0;
let failureCalls = 0;
let acquired = 0;
let released = 0;
let leaseFd: number | undefined;
let captured: WebEffectExecutionContext | undefined;
const pullEntered = Promise.withResolvers<void>();
const pullGate = Promise.withResolvers<void>();
const pullSettled = Promise.withResolvers<void>();
const cancelEntered = Promise.withResolvers<void>();
const cancelGate = Promise.withResolvers<void>();
const executionEntered = Promise.withResolvers<void>();
const executionCanceled = Promise.withResolvers<void>();
const file = defineRuntimeResource<"web.file", number>({
  id: "web.file",
  title: "Web file lease",
  purpose: "Real request and lazy body lifetime proof",
});
const fileRequirement = requireResource({ resource: file, reason: "Request-time file access" });
const provider = defineRuntimeProvider({
  id: "web.file-provider",
  title: "Web file provider",
  provides: file,
  requires: [],
  build() {
    return providerFx.acquireRelease({
      acquire: Effect.sync(() => {
        const path = join(process.cwd(), "web-lease");
        const fd = openSync(path, "wx+");
        try {
          writeFileSync(fd, "real-web-resource");
        } catch (error) {
          closeSync(fd);
          unlinkSync(path);
          throw error;
        }
        leaseFd = fd;
        acquired++;
        events.push("acquired");
        return fd;
      }),
      release: (fd) =>
        Effect.sync(() => {
          closeSync(fd);
          leaseFd = undefined;
          unlinkSync(join(process.cwd(), "web-lease"));
          released++;
          events.push("released");
        }),
    });
  },
});

function live(context: WebEffectExecutionContext): void {
  const fd = context.context.resources.get(fileRequirement);
  assert.equal(fd, leaseFd);
  assert(fstatSync(fd).isFile());
  assert.equal(released, 0);
}
const request = defineWebEffect({
  effect: function* (context) {
    bodyCalls++;
    live(context);
    assert.equal(context.input.method, "POST");
    assert.equal(context.input.headers.get("x-native-request"), "preserved");
    const body = yield* Effect.promise(() => context.input.text());
    return new Response(`${new URL(context.input.url).pathname}:${body}`, {
      status: 201,
      headers: { "x-native-response": "preserved" },
    });
  },
});
const failure = defineWebEffect({
  effect: (context) =>
    Effect.gen(function* () {
      live(context);
      failureCalls++;
      return yield* Effect.fail(new Error("web effect failure"));
    }),
});
const cancellable = defineWebEffect({
  effect: (context) =>
    Effect.gen(function* () {
      executionEntered.resolve();
      yield* Effect.never;
      return new Response();
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          live(context);
          assert(context.input.signal.aborted);
          events.push("execution-canceled");
          executionCanceled.resolve();
        })
      )
    ),
});
const stream = defineWebEffect({
  effect: (context) =>
    Effect.sync(() => {
      captured = context;
      let initial = true;
      return new Response(
        new ReadableStream<Uint8Array>({
          async pull(controller) {
            live(context);
            if (initial) {
              initial = false;
              controller.enqueue(new TextEncoder().encode("first\n"));
              return;
            }
            pullEntered.resolve();
            await pullGate.promise;
            live(context);
            events.push("pull-settled");
            pullSettled.resolve();
            // Cancellation may already have closed the native stream.
            try {
              controller.close();
            } catch {
              /* Native cancellation owns closure. */
            }
          },
          async cancel() {
            live(context);
            events.push("cancel-entered");
            cancelEntered.resolve();
            await cancelGate.promise;
            // Native cancellation closes pending reads immediately; the source owns its hidden work.
            await pullSettled.promise;
            live(context);
            events.push("cancel-settled");
          },
        }),
        { headers: { "content-type": "text/plain" } }
      );
    }),
});
const plugin = defineWebAppPlugin.factory()({
  capability: "native-proof",
  resourceRequirements: [fileRequirement],
  routes: [
    {
      id: "page",
      path: "/",
      module: () => {
        loaderCalls++;
        return import("./route.js");
      },
    },
    { id: "request", path: "/request/:id", effect: request },
    { id: "failure", path: "/failure", effect: failure },
    { id: "cancel", path: "/cancel", effect: cancellable },
    { id: "stream", path: "/stream", effect: stream },
  ],
})();
const app = defineApp({ id: "web-native-proof", plugins: [plugin] });
const processes = defineProcessCatalog({ web: { id: "web", roles: ["web"] } });
const profile = defineRuntimeProfile({
  id: "web-local",
  providers: [providerSelection({ resource: file, provider })],
  harnesses: ["web-native"],
});
const entrypoint = defineEntrypoint({
  id: "web",
  app,
  process: processes.web,
  profile,
  identity: {
    app: app.id,
    process: "web",
    entrypoint: "web",
    deployment: "local",
    source: "built-artifact",
  },
});
deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
assert.deepEqual([loaderCalls, bodyCalls, acquired], [0, 0, 0]);
const harness = createBunWebHarness({ id: "web-native", hostname: "127.0.0.1", port });
const started = await startApp(entrypoint, {
  sources: { appRoot: process.cwd() },
  finalization: { policy: "waitForNativeStop", deadlineMs: 50 },
  integrations: [
    {
      surface: "web/app",
      harness: {
        ...harness,
        async mount(input) {
          assert.equal(input.launchIdentity, entrypoint.identity);
          const native = await harness.mount(input);
          events.push("mounted");
          return {
            ...native,
            stop() {
              const stopping = native.stop();
              void stopping.then(() => events.push("native-stopped"));
              return stopping;
            },
          };
        },
      },
    },
  ],
});
const controllers: AbortController[] = [];
const pending: Promise<unknown>[] = [];
try {
  assert.deepEqual([loaderCalls, bodyCalls, acquired], [1, 0, 1]);
  assert.equal((await started.health("readiness")).status, "passing");
  assert.equal((await started.health("liveness")).status, "passing");
  const html = await (await fetch(base)).text();
  assert(html.includes("Habitat native web"));
  const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]!);
  assert.equal(assetPaths.length, 2);
  const assets = await Promise.all(
    assetPaths.map(async (path) => {
      const result = await fetch(new URL(path, base));
      assert.equal(result.status, 200);
      return { path, body: await result.text(), type: result.headers.get("content-type") };
    })
  );
  assert(
    assets.some(
      ({ body, type }) => body.includes("native-browser-asset") && type?.includes("javascript")
    )
  );
  assert(assets.some(({ body, type }) => body.includes("color") && type?.includes("css")));
  const response = await fetch(`${base}/request/42`, {
    method: "POST",
    headers: { "x-native-request": "preserved" },
    body: "actual-body",
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-native-response"), "preserved");
  assert.equal(await response.text(), "/request/42:actual-body");
  assert.equal(bodyCalls, 1);
  const failed = await fetch(`${base}/failure`);
  assert.equal(failed.status, 500);
  await failed.text();
  assert.equal(failureCalls, 1);
  const executionAbort = new AbortController();
  controllers.push(executionAbort);
  const canceled = fetch(`${base}/cancel`, { signal: executionAbort.signal });
  pending.push(canceled.catch(() => {}));
  await executionEntered.promise;
  executionAbort.abort();
  await assert.rejects(canceled);
  await executionCanceled.promise;

  const streamAbort = new AbortController();
  controllers.push(streamAbort);
  const streamed = await fetch(`${base}/stream`, { signal: streamAbort.signal });
  const reader = streamed.body!.getReader();
  assert.equal(new TextDecoder().decode((await reader.read()).value), "first\n");
  await pullEntered.promise;
  streamAbort.abort();
  await cancelEntered.promise;
  const stopping = started.stop();
  assert.equal(started.stop(), stopping);
  let settled = false;
  void stopping.then(() => {
    settled = true;
  });
  assert.throws(() => started.health("readiness"));
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(settled, false);
  assert.equal(released, 0);
  assert(captured);
  live(captured);
  cancelGate.resolve();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(settled, false, "source cancellation still owns its pending pull cleanup");
  pullGate.resolve();
  await stopping;
  assert.equal(released, 1);
  assert.equal(loaderCalls, 1);
  for (const event of ["native-stopped", "cancel-settled", "pull-settled", "released"]) {
    assert.equal(events.filter((value) => value === event).length, 1, event);
  }
  assert(events.indexOf("cancel-settled") < events.indexOf("released"));
  assert(events.indexOf("pull-settled") < events.indexOf("released"));
  assert(events.indexOf("native-stopped") < events.indexOf("released"));
  assert.throws(() => captured!.context.resources.get(fileRequirement));
  await assert.rejects(fetch(base));
  console.log(
    JSON.stringify({
      result: "PASS",
      proof: "packed SDK built native web",
      assets: assets.map(({ path }) => path),
      events,
    })
  );
} finally {
  controllers.forEach((controller) => {
    controller.abort();
  });
  cancelGate.resolve();
  pullGate.resolve();
  await Promise.allSettled(pending);
  await started.stop();
}
