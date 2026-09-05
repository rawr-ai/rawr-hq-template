import { Context, Effect as NativeEffect } from "effect";

import type { HabitatEffect } from "../src/effect";
import {
  defineWebAppPlugin,
  type WebAppPluginDefinition,
  type WebRouteProjection,
} from "../src/plugin";
import { defineRuntimeResource, requireResource } from "../src/resource";
import {
  defineWebEffect,
  type WebEffectDescriptor,
  type WebEffectExecutionContext,
} from "../src/web";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
type Channels<T> = T extends WebEffectDescriptor<infer A, infer E, infer R> ? [A, E, R] : never;

interface Dependency {
  readonly value: string;
}
const Dependency = Context.Service<Dependency>("web-dependency");
class SpecificResponse extends Response {
  readonly variant = "specific" as const;
}
const failure = { _tag: "WebFailure" as const };
const descriptor = defineWebEffect({
  *effect({ input, context, execution, telemetry }) {
    const resource = yield* NativeEffect.service(Dependency);
    const value = yield* NativeEffect.try({
      try: () => `${input.method}:${resource.value}:${execution.executionId}`,
      catch: () => failure,
    });
    context.resources.has(requirement);
    yield* telemetry.event("web.request");
    return new SpecificResponse(value);
  },
});
const resource = defineRuntimeResource<"web-data", { readonly value: string }>({
  id: "web-data",
  title: "Web data",
  purpose: "Host-process data",
});
const requirement = requireResource({ resource, reason: "Response rendering" });
const nativeProgram = NativeEffect.succeed(new SpecificResponse("native"));
const nativeDescriptor = defineWebEffect({ effect: () => nativeProgram });
const noYieldDescriptor = defineWebEffect({
  *effect() {
    return new SpecificResponse("no-yield");
  },
});
const load = async () => ({ default: "native" as const });
const plugin = defineWebAppPlugin.factory()({
  capability: "typed",
  routes: [
    { id: "module", path: "/module", module: load, label: "discarded" },
    { id: "effect", path: "/effect", effect: descriptor, label: "discarded" },
  ],
  resourceRequirements: [requirement],
})();
const configured = defineWebAppPlugin.factory<{ readonly instance: string }>()((options) => ({
  capability: "configured",
  instance: options.instance,
  routes: [{ id: "response", path: "/response", effect: descriptor }],
  resourceRequirements: [requirement],
}))({ instance: "selected" });

export type WebTypeOracles = readonly [
  Assert<Equal<Channels<typeof descriptor>, [SpecificResponse, typeof failure, Dependency]>>,
  Assert<Equal<Channels<typeof nativeDescriptor>, [SpecificResponse, never, never]>>,
  Assert<Equal<Channels<typeof noYieldDescriptor>, [SpecificResponse, never, never]>>,
  Assert<Equal<(typeof plugin.routes)[0]["id"], "module">>,
  Assert<Equal<(typeof plugin.routes)[1]["path"], "/effect">>,
  Assert<Equal<(typeof plugin.routes)[0]["module"], typeof load>>,
  Assert<Equal<(typeof plugin.routes)[1]["effect"], typeof descriptor>>,
  Assert<Equal<keyof (typeof plugin.routes)[0], "id" | "path" | "module">>,
  Assert<Equal<keyof (typeof plugin.routes)[1], "id" | "path" | "effect">>,
  Assert<Equal<typeof plugin.resourceRequirements, readonly [typeof requirement]>>,
  Assert<Equal<typeof configured.resourceRequirements, readonly [typeof requirement]>>,
  Assert<Equal<keyof WebEffectExecutionContext, "input" | "context" | "execution" | "telemetry">>,
  Assert<Equal<keyof WebEffectExecutionContext["context"], "resources">>,
  Assert<Equal<keyof typeof descriptor, "kind" | "policy" | "effect">>,
  Assert<Equal<keyof typeof plugin.services, never>>,
  Assert<Equal<WebAppPluginDefinition["routes"][number] extends never ? true : false, false>>,
];

function acceptsErasedRoutes(erased: WebAppPluginDefinition): void {
  for (const route of erased.routes) {
    if ("effect" in route) {
      const exact: WebEffectDescriptor = route.effect;
      void exact;
    } else {
      const loader: () => Promise<unknown> = route.module;
      void loader;
    }
  }
}

if (false) {
  const moduleRoute: WebRouteProjection<{ readonly default: "native" }> = {
    id: "module",
    path: "/",
    module: load,
  };
  void moduleRoute;
  acceptsErasedRoutes(plugin);
  defineWebEffect({
    // @ts-expect-error Native Promise execution is not a cold Effect program.
    effect: async () => new Response(),
  });
  defineWebEffect({
    // @ts-expect-error Web execution returns Response, not arbitrary JSON.
    effect: () => NativeEffect.succeed({ value: "not-a-response" }),
  });
  defineWebEffect({
    // @ts-expect-error Generator result must also be a Response.
    *effect() {
      return "not-a-response";
    },
  });
  defineWebEffect({
    // @ts-expect-error A raw Response is not an Effect or Effect generator.
    effect: () => new Response(),
  });
  defineWebEffect({
    effect(context) {
      const request: Request = context.input;
      const value: { readonly value: string } = context.context.resources.get(requirement);
      // @ts-expect-error The original Request has one location, input.
      context.request;
      // @ts-expect-error Web effects do not receive direct service bindings.
      context.context.clients;
      // @ts-expect-error Resource capabilities are bounded; no public runtime runner.
      context.context.runtime;
      return NativeEffect.succeed(new Response(`${request.method}:${value.value}`));
    },
  });
  defineWebAppPlugin.factory()({
    capability: "both",
    // @ts-expect-error A native module and an Effect cannot own the same route declaration.
    routes: [{ id: "both", path: "/", module: load, effect: descriptor }],
  });
  defineWebAppPlugin.factory()({
    capability: "neither",
    // @ts-expect-error Route membership requires exactly one cold source.
    routes: [{ id: "neither", path: "/" }],
  });
  defineWebAppPlugin.factory()({
    capability: "native-function",
    // @ts-expect-error Native callback functions do not replace web Effect descriptors.
    routes: [{ id: "callback", path: "/", effect: () => Promise.resolve(new Response()) }],
  });
  defineWebAppPlugin.factory()({
    capability: "services",
    routes: [],
    // @ts-expect-error Host resources do not admit direct web service bindings.
    services: {},
  });
  // @ts-expect-error Snapshot route arrays are immutable.
  plugin.routes.push({ id: "extra", path: "/extra", effect: nativeDescriptor });
  // @ts-expect-error Route occurrence identity is frozen.
  plugin.routes[1].id = "changed";
  // @ts-expect-error Surplus route author fields never enter the snapshot.
  plugin.routes[1].label;
  const effect: HabitatEffect<SpecificResponse> = nativeProgram;
  void effect;
}
