import { os } from "@orpc/server";

import {
  defineServerApiPlugin,
  defineServerInternalPlugin,
  type ServerPluginContext,
} from "../src/plugin";
import { defineService, sealService, useService } from "../src/service";

export function assertServerContextTypes(): void {
  const definition = defineService({ id: "context-proof", deps: {} });
  const contract = definition.oc;
  const service = sealService(definition, {
    contract,
    construct: () => {
      throw new Error("Cold type proof must not construct a service.");
    },
  });
  const services = { selected: useService(service) };
  const router = {
    read: os.$context<ServerPluginContext<typeof services>>().handler(({ context }) => {
      const request: Request = context.request;
      const serviceId: string = context.clients.selected.serviceId;
      // @ts-expect-error Undeclared service clients are not ambient context.
      context.clients.other;
      // @ts-expect-error Omitting workflow uses does not grant ambient dispatcher names.
      context.workflows.undeclared;
      // @ts-expect-error Provider selection and runtime authority are not request context.
      context.managedRuntime;
      return { method: request.method, serviceId };
    }),
  };
  defineServerApiPlugin.factory()({
    capability: "typed",
    routeBase: "/typed",
    services,
    api: () => router,
  });
  defineServerInternalPlugin.factory()({
    capability: "lazy",
    routeBase: "/rpc",
    services,
    internal: () => ({ nested: os.lazy(async () => ({ default: router })) }),
  });
  const unavailableContext = os
    .$context<{ token: string }>()
    .handler(({ context }) => context.token);
  defineServerApiPlugin.factory()({
    capability: "unavailable",
    routeBase: "/unavailable",
    services: {},
    // @ts-expect-error The process supplies only the admitted server context.
    api: () => unavailableContext,
  });
  defineServerInternalPlugin.factory()({
    capability: "undeclared",
    routeBase: "/undeclared",
    services: {},
    // @ts-expect-error A router cannot require a service absent from this plugin's uses.
    internal: () => router,
  });
}
