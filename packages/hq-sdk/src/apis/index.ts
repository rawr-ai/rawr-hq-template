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

export type ApiSurfaceDeclaration<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
> = Readonly<{
  contract: TContract;
}>;

export type ApiPluginDeclaration<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
> = Readonly<{
  namespace: "orpc";
  internal: ApiSurfaceDeclaration<TContract>;
  published?: ApiSurfaceDeclaration<TContract>;
}>;

export type ApiPluginContribution<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
> = Readonly<{
  internal: ApiSurfaceContribution<TContract, TRouter>;
  published?: ApiSurfaceContribution<TContract, TRouter>;
}>;

type BivariantContributionFactory<TInput, TResult> = {
  bivarianceHack(input: TInput): TResult;
}["bivarianceHack"];

export type ApiPluginContributionBuilder<
  TBound = never,
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
> = BivariantContributionFactory<TBound, ApiPluginContribution<TContract, TRouter>>;

export type ApiPluginRegistration<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TBound = never,
> = Partial<ApiPluginContribution<TContract, TRouter>> & Readonly<{
  namespace: "orpc";
  declaration?: ApiPluginDeclaration<TContract>;
  contribute?: ApiPluginContributionBuilder<TBound, TContract, TRouter>;
}>;

export type MaterializedApiPluginRegistration<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TBound = never,
> = ApiPluginContribution<TContract, TRouter> & ApiPluginRegistration<TContract, TRouter, TBound>;

type DefineApiPluginInput<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TBound = never,
> = Omit<ApiPluginRegistration<TContract, TRouter, TBound>, "namespace">;

export function defineApiPluginDeclaration<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
>(
  input: Omit<ApiPluginDeclaration<TContract>, "namespace">,
): ApiPluginDeclaration<TContract> {
  return {
    namespace: "orpc",
    ...input,
  };
}

export function defineApiPlugin<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
  TBound = never,
>(
  input: DefineApiPluginInput<TContract, TRouter, TBound>,
): ApiPluginRegistration<TContract, TRouter, TBound> {
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

export function composeApiPlugins<const TPlugins extends readonly MaterializedApiPluginRegistration[]>(plugins: TPlugins) {
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
