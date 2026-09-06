import { expect, test } from "bun:test";
import { Effect } from "effect";
import { compileRuntimePlan } from "../../compiler/src/compile-runtime-plan";
import { defineApp, defineEntrypoint, defineProcessCatalog } from "../../definition/src/app";
import { defineWebAppPlugin } from "../../definition/src/plugin";
import { defineRuntimeProfile } from "../../definition/src/profile";
import type { RuntimeResourceMap } from "../../definition/src/provider";
import { defineRuntimeResource, requireResource } from "../../definition/src/resource";
import { defineWebEffect, type WebEffectDescriptor } from "../../definition/src/web";
import { deriveRuntimeArtifacts } from "../../derivation/src/derive-runtime-artifacts";
import { createWebRouteModuleTable } from "../../derivation/src/web-route-module-table";
import { provisionProcess } from "../../substrate/effect/src/provision-process";
import { createWebAdapter, type WebEffectRoute, type WebHostPayload } from "../src/adapters/web";
import { createProcessRuntime } from "../src/create-process-runtime";

const resource = defineRuntimeResource({
  id: "web.optional",
  title: "Optional web capability",
  purpose: "Bounded lookup proof",
});
const optional = requireResource({
  resource,
  optional: true,
  reason: "Selected optional requirement",
});
const foreign = requireResource({
  resource,
  optional: true,
  reason: "Unselected optional requirement",
});

async function fixture(
  descriptor: WebEffectDescriptor,
  table: "exact" | "missing" | "empty" = "exact"
) {
  let loads = 0;
  const module = Object.freeze({ default: "a cold owner-test module, not a native HTML fixture" });
  const load = async () => {
    loads++;
    return module;
  };
  const app = defineApp({
    id: "web.owner-test",
    plugins: [
      defineWebAppPlugin.factory()({
        capability: "web-proof",
        resourceRequirements: [optional],
        routes: [
          { id: "page", path: "/", module: load },
          { id: "operation", path: "/operation/:id", effect: descriptor },
        ],
      })(),
    ],
  });
  const profile = defineRuntimeProfile({ id: "web-test", providers: [] });
  const process = defineProcessCatalog({ web: { id: "web-process", roles: ["web"] } }).web;
  const entrypoint = defineEntrypoint({
    id: "web-entry",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "web-entry",
      deployment: "test",
      source: "web-owner-test",
    },
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const compilation = compileRuntimePlan({ derivation });
  expect(compilation.plan.bootgraphInput.nodes).toEqual([]);
  // Empty native provisioning exercises process assembly without inventing a bootgraph owner edge.
  const provisioned = await provisionProcess({
    compilation,
    bootgraph: {
      kind: "bootgraph.ordered",
      modules: [],
      order: [],
      rollbackOrder: [],
      releaseOrder: [],
    },
    sources: { appRoot: import.meta.dir },
  });
  const runtime = await createProcessRuntime({
    compilation,
    provisioned,
    descriptorTable: derivation.executionDescriptorTable,
    ...(table === "missing"
      ? {}
      : {
          webRouteModuleTable:
            table === "empty" ? createWebRouteModuleTable([]) : derivation.webRouteModuleTable,
        }),
  });
  const surface = compilation.plan.surfaces[0];
  if (surface === undefined) throw new Error("Expected the selected web surface.");
  return { runtime, surface, derivation, load, module, loads: () => loads };
}

function operation(routes: WebHostPayload["routes"]): WebEffectRoute {
  const route = routes.find((value) => value.kind === "web.effect");
  if (route === undefined) throw new Error("Expected a lowered web operation.");
  return route;
}

test("real cold tables lower exact loaders and operational refs before native Request execution", async () => {
  let calls = 0;
  let request: Request | undefined;
  const descriptor = defineWebEffect({
    effect(context) {
      calls++;
      return Effect.gen(function* () {
        request = context.input;
        expect(Object.keys(context.context)).toEqual(["resources"]);
        expect(context.context.resources.has(optional)).toBe(false);
        expect(context.context.resources.get(optional)).toBeUndefined();
        expect(() => context.context.resources.get(foreign)).toThrow(
          "outside this selected plugin"
        );
        const span = yield* Effect.currentSpan;
        expect(context.execution.traceId).toBe(span.traceId);
        const body = yield* Effect.promise(() => context.input.text());
        return new Response(body, { status: 201, headers: { "x-web": context.execution.surface } });
      });
    },
  });
  const proof = await fixture(descriptor);
  try {
    const lowered = proof.runtime.lower(proof.surface, createWebAdapter({ harness: "web" }));
    expect(calls).toBe(0);
    expect(proof.loads()).toBe(0);
    const module = lowered.payload.routes.find((route) => route.kind === "web.module");
    if (module?.kind !== "web.module") throw new Error("Expected selected module route.");
    expect(module.ref).toBe(proof.surface.webRouteModuleRefs[0]);
    expect(module.load).toBe(proof.load);
    const effect = operation(lowered.payload.routes);
    expect(effect.ref === proof.surface.executionDescriptorRefs[0]).toBe(true);
    expect(proof.runtime.registry.get(effect.ref).descriptor).toBe(
      proof.derivation.executionDescriptorTable.get(effect.ref)
    );
    expect(effect.path).toBe("/operation/:id");
    const native = new Request("http://web.test/operation/one", {
      method: "POST",
      body: "original native body",
    });
    const response = await effect.handle(native);
    expect(request).toBe(native);
    expect(response.status).toBe(201);
    expect(response.headers.get("x-web")).toBe("web/app");
    expect(await response.text()).toBe("original native body");
    expect(calls).toBe(1);
    expect(proof.loads()).toBe(0);
    expect(await module.load()).toBe(proof.module);
    expect(proof.loads()).toBe(1);
  } finally {
    await proof.runtime.stop();
  }
});

test("missing table entries and copied or mismatched surfaces refuse without running either arm", async () => {
  let calls = 0;
  const descriptor = defineWebEffect({
    effect() {
      calls++;
      return Effect.succeed(new Response());
    },
  });
  for (const table of ["missing", "empty"] as const) {
    const proof = await fixture(descriptor, table);
    try {
      expect(() =>
        proof.runtime.lower(proof.surface, createWebAdapter({ harness: "web" }))
      ).toThrow(TypeError);
      expect(calls).toBe(0);
      expect(proof.loads()).toBe(0);
    } finally {
      await proof.runtime.stop();
    }
  }
  const proof = await fixture(descriptor);
  try {
    let lowered = 0;
    const adapter = createWebAdapter({ harness: "web" });
    const observed = {
      ...adapter,
      lower: (...args: Parameters<typeof adapter.lower>) => {
        lowered++;
        return adapter.lower(...args);
      },
    };
    expect(() => proof.runtime.lower({ ...proof.surface }, observed)).toThrow(TypeError);
    expect(() => proof.runtime.lower(proof.surface, { ...observed, role: "server" })).toThrow(
      TypeError
    );
    expect(lowered).toBe(0);
    expect(calls).toBe(0);
    expect(proof.loads()).toBe(0);
  } finally {
    await proof.runtime.stop();
  }
});

test("native Request abort interrupts the actual web Effect and awaits its finalizer", async () => {
  const entered = Promise.withResolvers<void>();
  let finalized = 0;
  let signal: AbortSignal | undefined;
  const proof = await fixture(
    defineWebEffect({
      effect(context) {
        signal = context.input.signal;
        return Effect.gen(function* () {
          entered.resolve();
          yield* Effect.never;
          return new Response("must not return");
        }).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              finalized++;
            })
          )
        );
      },
    })
  );
  const controller = new AbortController();
  const native = new Request("http://web.test/operation/one", { signal: controller.signal });
  const effect = operation(
    proof.runtime.lower(proof.surface, createWebAdapter({ harness: "web" })).payload.routes
  );
  const result = effect.handle(native).then(
    () => "unexpected",
    (error: unknown) => error
  );
  try {
    await entered.promise;
    expect(signal).toBe(native.signal);
    controller.abort();
    expect(await result).not.toBe("unexpected");
    expect(finalized).toBe(1);
  } finally {
    controller.abort();
    await result;
    await proof.runtime.stop();
  }
});

test("lazy Response consumption retains its exact declared resource view through process stop", async () => {
  const release = Promise.withResolvers<void>();
  let resources: RuntimeResourceMap | undefined;
  let readAfterStop = false;
  const proof = await fixture(
    defineWebEffect({
      effect(context) {
        resources = context.context.resources;
        return Effect.succeed(
          new Response(
            new ReadableStream<Uint8Array>({
              async pull(controller) {
                await release.promise;
                expect(context.context.resources.has(optional)).toBe(false);
                readAfterStop = true;
                controller.enqueue(new TextEncoder().encode("retained"));
                controller.close();
              },
            })
          )
        );
      },
    })
  );
  const route = operation(
    proof.runtime.lower(proof.surface, createWebAdapter({ harness: "web" })).payload.routes
  );
  const response = await route.handle(new Request("http://web.test/operation/one"));
  let stopped = false;
  const stop = proof.runtime.stop().then(() => {
    stopped = true;
  });
  try {
    await Bun.sleep(10);
    expect(stopped).toBe(false);
    expect(readAfterStop).toBe(false);
    await expect(route.handle(new Request("http://web.test/operation/two"))).rejects.toThrow(
      TypeError
    );
    release.resolve();
    expect(await response.text()).toBe("retained");
    await stop;
    expect(readAfterStop).toBe(true);
    expect(() => resources?.has(optional)).toThrow(TypeError);
  } finally {
    release.resolve();
    await response.body?.cancel().catch(() => {});
    await stop;
  }
});
