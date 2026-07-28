import { oc, type } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { implement, os } from "@orpc/server";

export const OrpcContractProbe = oc.router({
  create: oc
    .meta(
      openapi({
        method: "POST",
        path: "/work-items",
      })
    )
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
  .meta(
    openapi({
      method: "POST",
      path: "/work-items",
    })
  )
  .input(type<{ readonly title: string }>())
  .handler(({ context, input }) => ({
    id: context.traceId,
    title: input.title,
  }));

export function describeOrpcProbe() {
  return {
    contractKeys: Object.keys(OrpcContractProbe),
    routerKeys: Object.keys(OrpcNativeRouterProbe),
    serverPayloadKind: typeof OrpcServerBuilderProbe,
  };
}
