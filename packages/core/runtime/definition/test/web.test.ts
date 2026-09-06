import { describe, expect, test } from "bun:test";
import { Cause, Exit, Effect as NativeEffect } from "effect";

import { Effect } from "../src/effect";
import { readExecutionProjection } from "../src/execution";
import { defineWebAppPlugin, type WebRouteProjection } from "../src/plugin";
import { defineRuntimeResource, requireResource } from "../src/resource";
import {
  defineWebEffect,
  lowerWebEffectDescriptor,
  type WebEffectExecutionContext,
} from "../src/web";

function context(input = new Request("http://localhost/web")): WebEffectExecutionContext {
  return {
    input,
    context: {
      resources: {
        has: () => false,
        get: () => {
          throw new TypeError("No resource selected in this context fixture.");
        },
      },
    },
    telemetry: { span: (_name, effect) => effect, event: () => Effect.succeed(undefined) },
    execution: {
      appId: "web-fixture",
      processId: "web",
      entrypointId: "web",
      profileId: "test",
      role: "web",
      surface: "web/app",
      ownerId: "web.app.fixture",
      executionId: "web-route",
      traceId: "fixture-trace",
    },
  };
}

describe("cold web executable authoring", () => {
  test("snapshots route membership and requirements without running or freezing native values", () => {
    const calls: string[] = [];
    const body = () => {
      calls.push("body");
      return Effect.succeed(new Response("response"));
    };
    const load = async () => {
      calls.push("module");
      return { default: "native-module" as const };
    };
    const policy = {
      retry: { times: 2, backoff: "fixed" as const, delay: "5 ms" as const },
      timeout: { duration: "1 seconds" as const },
      interruptible: true,
    };
    const descriptor = defineWebEffect({ policy, effect: body });
    const resource = defineRuntimeResource<"web-data", { readonly value: string }>({
      id: "web-data",
      title: "Web data",
      purpose: "Explicit host-process resource",
    });
    const requirement = requireResource({ resource, reason: "Render a response" });
    const requirements = [requirement];
    const route = { id: "response", path: "/response", effect: descriptor, label: "ignored" };
    const routes: WebRouteProjection[] = [
      { id: "page", path: "/page", module: load },
      route,
      { id: "alternate", path: "/alternate", effect: descriptor },
    ];
    const factory = defineWebAppPlugin.factory()({
      capability: "fixture",
      instance: "selected",
      routes,
      resourceRequirements: requirements,
    });
    const plugin = factory();
    const projection = plugin.project({ pluginId: plugin.id });
    expect(calls).toEqual([]);
    expect(descriptor).toEqual({ kind: "web.effect", policy, effect: body });
    expect(Object.keys(descriptor)).toEqual(["kind", "policy", "effect"]);
    expect(descriptor.effect).toBe(body);
    expect(plugin.routes[0]).toEqual({ id: "page", path: "/page", module: load });
    expect(plugin.routes[1]).toEqual({ id: "response", path: "/response", effect: descriptor });
    expect(plugin.routes[2]).toEqual({ id: "alternate", path: "/alternate", effect: descriptor });
    const moduleRoute = plugin.routes[0]!;
    const effectRoute = plugin.routes[1]!;
    const alternateRoute = plugin.routes[2]!;
    expect("module" in moduleRoute && moduleRoute.module).toBe(load);
    expect("effect" in effectRoute && effectRoute.effect).toBe(descriptor);
    expect("effect" in alternateRoute && alternateRoute.effect).toBe(descriptor);
    expect(plugin.resourceRequirements[0]).toBe(requirement);
    expect(plugin.services).toEqual({});
    expect(projection.facts.routes).toEqual([
      { id: "page", path: "/page" },
      { id: "response", path: "/response" },
      { id: "alternate", path: "/alternate" },
    ]);
    for (const value of [
      factory,
      descriptor,
      descriptor.policy,
      descriptor.policy.retry,
      descriptor.policy.timeout,
      plugin,
      plugin.routes,
      ...plugin.routes,
      plugin.resourceRequirements,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(body)).toBe(false);
    expect(Object.isFrozen(load)).toBe(false);
    expect(Object.isFrozen(policy)).toBe(false);
    expect(Object.isFrozen(requirements)).toBe(false);

    policy.retry.times = 7;
    route.path = "/changed";
    route.effect = defineWebEffect({ effect: () => Effect.succeed(new Response("other")) });
    routes.pop();
    requirements.pop();
    expect(descriptor.policy.retry?.times).toBe(2);
    expect(plugin.routes).toHaveLength(3);
    expect(plugin.routes[1]).toEqual({ id: "response", path: "/response", effect: descriptor });
    expect(plugin.resourceRequirements).toEqual([requirement]);
    expect(calls).toEqual([]);
  });

  test("refuses ambiguous, missing and malformed route bodies and duplicate occurrence IDs", () => {
    let calls = 0;
    const effect = defineWebEffect({
      effect: () => {
        calls += 1;
        return Effect.succeed(new Response());
      },
    });
    const module = async () => {
      calls += 1;
      return {};
    };
    const invalidRoutes: unknown[] = [
      [{ id: "both", path: "/", module, effect }],
      [{ id: "neither", path: "/" }],
      [{ id: "bad-module", path: "/", module: {} }],
      [{ id: "bad-effect", path: "/", effect: null }],
      [{ id: "bad-kind", path: "/", effect: { ...effect, kind: "async.step-effect" } }],
      [{ id: "bad-body", path: "/", effect: { ...effect, effect: undefined } }],
      [{ id: "bad-policy", path: "/", effect: { kind: "web.effect", effect: effect.effect } }],
      [
        { id: "same", path: "/page", module },
        { id: "same", path: "/response", effect },
      ],
    ];
    for (const routes of invalidRoutes) {
      expect(() =>
        defineWebAppPlugin.factory()({
          capability: "invalid",
          routes: routes as readonly WebRouteProjection[],
        })()
      ).toThrow(TypeError);
    }
    expect(calls).toBe(0);
    expect(() =>
      // @ts-expect-error Untyped consumers still cannot omit the cold body.
      defineWebEffect({})
    ).toThrow(TypeError);
  });

  test("retains policy, native program, Request and Response identity through cold lowering", async () => {
    const controller = new AbortController();
    const request = new Request("http://localhost/exact", { signal: controller.signal });
    const invocation = context(request);
    const response = new Response("exact", { status: 201, headers: { "x-native": "preserved" } });
    const program = NativeEffect.succeed(response);
    const contexts: WebEffectExecutionContext[] = [];
    const descriptor = defineWebEffect({
      effect: (received) => {
        contexts.push(received);
        return program;
      },
    });
    const first = lowerWebEffectDescriptor({
      executionId: "first-occurrence",
      path: "/first",
      descriptor,
    });
    const second = lowerWebEffectDescriptor({
      executionId: "second-occurrence",
      path: "/second",
      descriptor,
    });
    expect(contexts).toEqual([]);
    expect(first).not.toBe(second);
    expect(first.policy).toBe(descriptor.policy);
    expect(first.boundary).toBe("plugin.web-surface");
    expect(readExecutionProjection(first)).toEqual({ kind: "web.route", path: "/first" });
    expect(readExecutionProjection(second)).toEqual({ kind: "web.route", path: "/second" });
    expect(Object.keys(first)).toEqual(["kind", "executionId", "boundary", "policy", "run"]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(readExecutionProjection(first))).toBe(true);
    const lowered = first.run(invocation);
    expect(contexts).toEqual([]);
    expect(NativeEffect.isEffect(lowered)).toBe(true);
    expect(await NativeEffect.runPromise(lowered)).toBe(response);
    expect(contexts).toEqual([invocation]);
    expect(contexts[0]).toBe(invocation);
    expect(contexts[0]?.input).toBe(request);
    expect(contexts[0]?.input.signal).toBe(request.signal);
    expect(contexts[0]?.context.resources).toBe(invocation.context.resources);
    expect(Object.keys(contexts[0] ?? {})).toEqual(["input", "context", "telemetry", "execution"]);
    controller.abort();
    expect(contexts[0]?.input.signal.aborted).toBe(true);
  });

  test("keeps generator construction lazy and native typed failures unchanged", async () => {
    let calls = 0;
    const response = new Response("generator");
    const descriptor = defineWebEffect({
      *effect() {
        calls += 1;
        return yield* NativeEffect.succeed(response);
      },
    });
    const lowered = lowerWebEffectDescriptor({ executionId: "generator", path: "/", descriptor });
    const program = lowered.run(context());
    expect(calls).toBe(0);
    expect(await NativeEffect.runPromise(program)).toBe(response);
    expect(calls).toBe(1);

    const failure = { _tag: "WebFailure" as const };
    const failed = defineWebEffect({ effect: () => NativeEffect.fail(failure) });
    const failedProgram = lowerWebEffectDescriptor({
      executionId: "failure",
      path: "/failure",
      descriptor: failed,
    }).run(context());
    const result = await NativeEffect.runPromiseExit(failedProgram);
    expect(Exit.isFailure(result)).toBe(true);
    if (Exit.isFailure(result)) expect(Cause.squash(result.cause)).toBe(failure);
  });
});
