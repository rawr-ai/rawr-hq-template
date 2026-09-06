import { Type } from "typebox";

import {
  defineAsyncWorkflowPlugin,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineServerInternalPlugin,
  defineService,
  defineWebAppPlugin,
  defineWorkflow,
  Effect,
  providerFx,
  providerSelection,
  requireResource,
  resourceDep,
  useService,
} from "../../../definition/src/index";
import { defineWebEffect, type WebEffectExecutionContext } from "../../../definition/src/web";
import { RuntimeSchema } from "../../../schema/src/index";
import { coldService } from "../support/cold-service";
import { deriveServerFixture } from "./server-source-fixture";

export const zeroWebCalls = { body: 0, module: 0, build: 0, acquire: 0, release: 0, async: 0 };

export function webSourceFixture(input: { reverse?: boolean; effectPath?: string } = {}) {
  const calls = { ...zeroWebCalls };
  const contexts: WebEffectExecutionContext[] = [];
  const response = new Response("web-result", { status: 201, headers: { "x-web": "native" } });
  const effect = defineWebEffect({
    policy: { retry: { times: 1 }, interruptible: true },
    effect: (context) => {
      calls.body++;
      contexts.push(context);
      return Effect.succeed(response);
    },
  });
  const module = async () => {
    calls.module++;
    return { default: "native-module" };
  };
  const resource = defineRuntimeResource({
    id: "web-host-resource",
    title: "Host process resource",
    purpose: "Explicit web request dependency",
  });
  const requirement = requireResource({ resource, reason: "Web request" });
  const provider = defineRuntimeProvider({
    id: "web-host-provider",
    title: "Host process provider",
    provides: resource,
    requires: [],
    build: () => {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: providerFx.tryPromise({
          try: async () => {
            calls.acquire++;
            return { source: "native-host" };
          },
          catch: (cause) => cause,
        }),
        release: () => {
          calls.release++;
          return providerFx.succeed(undefined);
        },
      });
    },
  });
  const routes = [
    { id: "page", path: "/", module },
    { id: "request", path: input.effectPath ?? "/request", effect },
    { id: "reuse", path: "/reuse", effect },
  ] as const;
  const web = (instance: string) =>
    defineWebAppPlugin.factory()({
      capability: "native-web",
      instance,
      resourceRequirements: [requirement],
      routes: input.reverse ? [...routes].reverse() : routes,
    })();
  const first = web("first");
  const second = web("second");
  const unavailable = defineRuntimeResource({
    id: "sibling-only",
    title: "Sibling only",
    purpose: "Not selected",
  });
  const service = coldService(
    defineService({
      id: "sibling-service",
      deps: { sibling: resourceDep(unavailable) },
    })
  );
  const server = defineServerInternalPlugin.factory()({
    capability: "sibling-service",
    services: { sibling: useService(service) },
    routeBase: "/rpc",
    internal: () => ({}),
  })();
  const async = defineAsyncWorkflowPlugin.factory()({
    capability: "sibling-workflow",
    services: {},
    resourceRequirements: [requireResource({ resource: unavailable, reason: "Async only" })],
    workflows: [
      defineWorkflow({
        id: "sibling-workflow",
        eventName: "sibling/workflow",
        inputSchema: RuntimeSchema.fromTypeBox(Type.String()),
        steps: [],
        run: () => {
          calls.async++;
        },
      }),
    ],
  })();
  const plugins = input.reverse ? [async, server, second, first] : [first, second, server, async];
  const providers = [providerSelection({ resource, provider })];
  const derivation = deriveServerFixture(plugins, ["web"], providers);
  return {
    calls,
    contexts,
    response,
    effect,
    module,
    resource,
    requirement,
    provider,
    providers,
    plugins,
    first,
    second,
    derivation,
  };
}
