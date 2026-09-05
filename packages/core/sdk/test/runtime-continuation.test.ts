import { closeSync, existsSync, fstatSync, openSync, unlinkSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type as schemaType } from "@orpc/contract";
import type { WithEffectContext } from "@orpc/experimental-effect";
import "@orpc/experimental-effect/extensions/effect";
import { createRouterClient, implement } from "@orpc/server";
import { Effect, Exit } from "effect";
import { expect, test } from "vitest";

import { orderBootgraph } from "../../runtime/bootgraph/src/index";
import { compileRuntimePlan } from "../../runtime/compiler/src/index";
import { createProcessRuntime } from "../../runtime/process-runtime/src/index";
import { provisionProcess } from "../../runtime/substrate/effect/src/index";
import {
  defineApp,
  defineEntrypoint,
  defineProcessCatalog,
  runtimeLaunchIdentity,
} from "../src/app";
import { defineAsyncSchedulePlugin, defineSchedule } from "../src/plugins/async";
import { type AsyncStepExecutionContext, defineAsyncStepEffect } from "../src/plugins/async/effect";
import { defineServerApiPlugin } from "../src/plugins/server";
import { deriveRuntimeArtifacts } from "../src/runtime/derivation";
import { defineRuntimeProfile, providerSelection } from "../src/runtime/profiles";
import { defineRuntimeProvider } from "../src/runtime/providers";
import { providerFx } from "../src/runtime/providers/effect";
import { defineRuntimeResource } from "../src/runtime/resources";
import { defineService, resourceDep, sealService, serviceDep, useService } from "../src/service";

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function start(root: string) {
  const path = join(root, "continuation.lease");
  const calls = { read: 0, release: 0 };
  const cleanupEntered = deferred();
  const cleanupAllowed = deferred();
  const stepEntered = deferred();
  const stepAllowed = deferred();
  const resource = defineRuntimeResource<"continuation.lease", { readonly fd: number }>({
    id: "continuation.lease",
    title: "Continuation lease",
    purpose: "Prove admitted child work retains its actual process lease",
  });
  const provider = defineRuntimeProvider({
    id: "continuation.provider",
    title: "File lease",
    provides: resource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => ({ fd: openSync(path, "wx") })),
        release: ({ fd }) =>
          Effect.sync(() => {
            calls.release++;
            closeSync(fd);
            unlinkSync(path);
          }),
      }),
  });
  const childDefinition = defineService({
    id: "continuation.child",
    deps: { lease: resourceDep(resource) },
  });
  const childContract = childDefinition.oc.router({
    read: childDefinition.oc.output(schemaType<string>()),
  });
  const child = sealService(childDefinition, {
    contract: childContract,
    construct: ({ clients, deps }) => {
      const native = implement(childContract).$context<WithEffectContext<never>>();
      const router = native.router({
        read: native.read.effect(function* () {
          fstatSync(deps.lease.fd);
          calls.read++;
          return yield* Effect.succeed("lease-open");
        }),
      });
      return {
        kind: "service.client.construction-bound",
        serviceId: childDefinition.id,
        withInvocation: () =>
          clients.bind({
            context: () => ({}),
            createNativeClient: (options) => createRouterClient(router, options),
          }),
      };
    },
  });
  let leaked: ReturnType<ReturnType<typeof child.construct>["withInvocation"]> | undefined;
  const parentDefinition = defineService({
    id: "continuation.parent",
    deps: { child: serviceDep(child) },
  });
  const parentContract = parentDefinition.oc.router({
    capture: parentDefinition.oc.output(schemaType<string>()),
    stream: parentDefinition.oc.output(schemaType<AsyncGenerator<string, void, unknown>>()),
  });
  const parent = sealService(parentDefinition, {
    contract: parentContract,
    construct: ({ clients, deps }) => {
      const native = implement(parentContract).$context<WithEffectContext<never>>();
      const router = native.router({
        capture: native.capture.effect(function* () {
          leaked = deps.child.withInvocation({});
          return yield* leaked.read();
        }),
        stream: native.stream.effect(function* () {
          const scoped = deps.child.withInvocation({});
          yield* Effect.void;
          return (async function* () {
            try {
              // A native async iterator consumes the test-owned Effect through its Promise protocol.
              yield await Effect.runPromise(scoped.read());
            } finally {
              cleanupEntered.resolve();
              await cleanupAllowed.promise;
            }
          })();
        }),
      });
      return {
        kind: "service.client.construction-bound",
        serviceId: parentDefinition.id,
        withInvocation: () =>
          clients.bind({
            context: () => ({}),
            createNativeClient: (options) => createRouterClient(router, options),
          }),
      };
    },
  });
  const plugin = defineServerApiPlugin.factory()({
    capability: "continuation",
    routeBase: "/continuation",
    services: { parent: useService(parent), child: useService(child) },
    api: () => ({}),
  })();
  type StepContext = AsyncStepExecutionContext<
    unknown,
    { child: ReturnType<typeof child.construct> }
  >;
  const step = defineAsyncStepEffect({
    id: "call-child",
    policy: {},
    effect: (context: StepContext) =>
      Effect.gen(function* () {
        stepEntered.resolve();
        yield* Effect.promise(() => stepAllowed.promise);
        return yield* context.clients.child.withInvocation({}).read();
      }),
  });
  const asyncPlugin = defineAsyncSchedulePlugin.factory()({
    capability: "continuation-step",
    services: { child: useService(child) },
    schedules: [
      defineSchedule({
        id: "child-tick",
        cron: "* * * * *",
        steps: [step],
        run: () => undefined,
      }),
    ],
  })();
  const app = defineApp({ id: "continuation-app", plugins: [plugin, asyncPlugin] });
  const profile = defineRuntimeProfile({
    id: "continuation-profile",
    providers: [providerSelection({ resource, provider })],
  });
  const process = defineProcessCatalog({
    main: { id: "continuation-process", roles: ["server", "async"] },
  }).main;
  const entrypoint = defineEntrypoint({
    id: "continuation-entrypoint",
    app,
    profile,
    process,
    identity: runtimeLaunchIdentity({
      app: app.id,
      process: process.id,
      entrypoint: "continuation-entrypoint",
      deployment: "test",
      source: "continuation-proof",
    }),
  });
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
  const parentId = compilation.plan.serviceBindings.find(
    (binding) => binding.serviceId === parentDefinition.id
  )!.bindingId;
  const childId = compilation.plan.serviceBindings.find(
    (binding) => binding.serviceId === childDefinition.id
  )!.bindingId;
  const asyncSurface = compilation.plan.surfaces.find(
    (surface) => surface.surface === "async/schedule"
  )!;
  const asyncChild = asyncSurface.serviceBindings.find((binding) => binding.localName === "child")!;
  const stepBoundary = runtime.registry.get<void, string, never, StepContext>(
    asyncSurface.executionDescriptorRefs[0]!
  );
  return {
    runtime,
    path,
    calls,
    cleanupEntered,
    cleanupAllowed,
    stepEntered,
    stepAllowed,
    executeStep: () =>
      runtime.execution.execute({
        boundary: stepBoundary,
        invocation: {
          input: undefined,
          context: {
            event: undefined,
            clients: { child: runtime.binding(asyncChild.bindingId, child) },
            resources: runtime.access.roles.get("async")!,
            telemetry: undefined,
            execution: undefined,
          },
        },
      }),
    parent: runtime.binding(parentId, parent).withInvocation({}),
    child: runtime.binding(childId, child).withInvocation({}),
    leaked: () => {
      if (!leaked) throw new Error("Parent did not capture its child view");
      return leaked;
    },
  };
}

test("a child invocation view leaked by a settled parent refuses while root work remains open", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-continuation-leak-"));
  const fixture = await start(root);
  try {
    expect(await Effect.runPromise(fixture.parent.capture())).toBe("lease-open");
    expect(Exit.isFailure(await Effect.runPromiseExit(fixture.leaked().read()))).toBe(true);
    expect(fixture.calls.read).toBe(1);
    expect(await Effect.runPromise(fixture.child.read())).toBe("lease-open");
    expect(existsSync(fixture.path)).toBe(true);
    expect(fixture.calls.release).toBe(0);
  } finally {
    await fixture.runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("an admitted non-oRPC descriptor retains its native service continuation during stop", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-continuation-descriptor-"));
  const fixture = await start(root);
  try {
    const pending = fixture.executeStep();
    await fixture.stepEntered.promise;
    let stopped = false;
    const stopping = fixture.runtime.stop().then(() => {
      stopped = true;
    });
    expect(Exit.isFailure(await Effect.runPromiseExit(fixture.child.read()))).toBe(true);
    expect(stopped).toBe(false);
    expect(fixture.calls.release).toBe(0);
    expect(existsSync(fixture.path)).toBe(true);
    fixture.stepAllowed.resolve();
    expect(await pending).toBe("lease-open");
    await stopping;
    expect(fixture.calls).toEqual({ read: 1, release: 1 });
    expect(existsSync(fixture.path)).toBe(false);
  } finally {
    fixture.stepAllowed.resolve();
    await fixture.runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});

test("an admitted native stream retains child continuation through consumption and real cleanup", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-continuation-stream-"));
  const fixture = await start(root);
  const stream = await Effect.runPromise(fixture.parent.stream());
  let stopped = false;
  try {
    const stopping = fixture.runtime.stop().then(() => {
      stopped = true;
    });
    expect(Exit.isFailure(await Effect.runPromiseExit(fixture.child.read()))).toBe(true);
    expect(await stream.next()).toEqual({ done: false, value: "lease-open" });
    const returning = stream.return();
    await fixture.cleanupEntered.promise;
    expect(stopped).toBe(false);
    expect(fixture.calls.release).toBe(0);
    expect(existsSync(fixture.path)).toBe(true);
    fixture.cleanupAllowed.resolve();
    await returning;
    await stopping;
    expect(fixture.calls).toEqual({ read: 1, release: 1 });
    expect(existsSync(fixture.path)).toBe(false);
  } finally {
    fixture.cleanupAllowed.resolve();
    await stream.return();
    await fixture.runtime.stop();
    await rm(root, { recursive: true, force: true });
  }
});
