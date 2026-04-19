import type { AnyContractRouterObject, AnyProcedureRouterObject } from "../orpc/router-shapes";
import { createContextualRouterBuilder } from "../orpc/factory/implementer";
import { mergeNamedSurfaceTrees } from "../composition/merge-named-surface-trees";
import type { Context } from "@orpc/server";
export {
  createInternalTraceForwardingOptions as createApiTraceForwardingOptions,
} from "../orpc/boundary/trace-forwarding";

export type ApiSurfaceContribution<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
> = Readonly<{
  contract: TContract;
  router: TRouter;
}>;

export type ApiPluginRegistration<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
> = Readonly<{
  namespace: "orpc";
  internal: ApiSurfaceContribution<TContract, TRouter>;
  published?: ApiSurfaceContribution<TContract, TRouter>;
}>;

type DefineApiPluginInput<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
> = Omit<ApiPluginRegistration<TContract, TRouter>, "namespace">;

export function defineApiPlugin<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
>(
  input: DefineApiPluginInput<TContract, TRouter>,
): ApiPluginRegistration<TContract, TRouter> {
  return {
    namespace: "orpc",
    ...input,
  };
}

export function createApiRouterBuilder<
  const TContract extends AnyContractRouterObject,
  TContext extends Context,
>(contract: TContract) {
  return createContextualRouterBuilder<TContract, TContext>(contract);
}

export function composeApiPlugins<const TPlugins extends readonly ApiPluginRegistration[]>(plugins: TPlugins) {
  return {
    internalContract: mergeNamedSurfaceTrees<AnyContractRouterObject>(
      plugins.map((plugin) => plugin.internal.contract),
      { kind: "api", surface: "contract" },
    ),
    internalRouter: mergeNamedSurfaceTrees<AnyProcedureRouterObject>(
      plugins.map((plugin) => plugin.internal.router),
      { kind: "api", surface: "router" },
    ),
    publishedContract: mergeNamedSurfaceTrees<AnyContractRouterObject>(
      plugins.flatMap((plugin) => (plugin.published ? [plugin.published.contract] : [])),
      { kind: "api", surface: "contract" },
    ),
    publishedRouter: mergeNamedSurfaceTrees<AnyProcedureRouterObject>(
      plugins.flatMap((plugin) => (plugin.published ? [plugin.published.router] : [])),
      { kind: "api", surface: "router" },
    ),
  } as const;
}

export type {
  AnyContractRouterObject,
  AnyProcedureRouterObject,
} from "../orpc/router-shapes";
