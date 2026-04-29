import { oc, type } from "@orpc/contract";
import { implement, os } from "@orpc/server";

export const OrpcContractProbe = oc.router({
  create: oc
    .route({
      method: "POST",
      path: "/work-items",
    })
    .input(type<{ readonly title: string }>())
    .output(type<{ readonly id: string; readonly title: string }>()),
});

export const OrpcNativeImplementerProbe = implement(OrpcContractProbe).$context<{
  readonly traceId: string;
}>();

export const OrpcNativeRouterProbe = OrpcNativeImplementerProbe.router({
  create: OrpcNativeImplementerProbe.create.handler(({ context, input }) => ({
    id: context.traceId,
    title: input.title,
  })),
});

export const OrpcServerBuilderProbe = os
  .$context<{ readonly traceId: string }>()
  .route({
    method: "POST",
    path: "/work-items",
  })
  .input(type<{ readonly title: string }>())
  .handler(({ context, input }) => ({
    id: context.traceId,
    title: input.title,
  }));

export function describeOrpcProbe() {
  return {
    contractKeys: Object.keys(OrpcContractProbe),
    routerKeys: Object.keys(OrpcNativeRouterProbe),
    serverHasNativeHandler: "handler" in OrpcServerBuilderProbe,
  };
}
