import type { RouterContract } from "@orpc/contract";
import type { AnyRouter } from "@orpc/server";
import { mergeNamedSurfaceTrees } from "../composition/merge-named-surface-trees";

type ContractTree = { [key: string]: RouterContract };
type RouterTree = { [key: string]: AnyRouter };

export { createInternalTraceForwardingOptions as createApiTraceForwardingOptions } from "../orpc/boundary/trace-forwarding";

export type ApiSurfaceContribution<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
> = Readonly<{
  contract: TContract;
  router: TRouter;
}>;

export type ApiSurfaceDeclaration<TContract extends ContractTree = ContractTree> = Readonly<{
  contract: TContract;
}>;

export type ApiPluginDeclaration<TContract extends ContractTree = ContractTree> = Readonly<{
  namespace: "orpc";
  internal: ApiSurfaceDeclaration<TContract>;
  published?: ApiSurfaceDeclaration<TContract>;
}>;

export type ApiPluginContribution<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
> = Readonly<{
  internal: ApiSurfaceContribution<TContract, TRouter>;
  published?: ApiSurfaceContribution<TContract, TRouter>;
}>;

type BivariantContributionFactory<TInput, TResult> = {
  bivarianceHack(input: TInput): TResult;
}["bivarianceHack"];

export type ApiPluginContributionBuilder<
  TBound = never,
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
> = BivariantContributionFactory<TBound, ApiPluginContribution<TContract, TRouter>>;

export type ApiPluginRegistration<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
  TBound = never,
> = Partial<ApiPluginContribution<TContract, TRouter>> &
  Readonly<{
    namespace: "orpc";
    declaration?: ApiPluginDeclaration<TContract>;
    contribute?: ApiPluginContributionBuilder<TBound, TContract, TRouter>;
  }>;

export type MaterializedApiPluginRegistration<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
  TBound = never,
> = ApiPluginContribution<TContract, TRouter> & ApiPluginRegistration<TContract, TRouter, TBound>;

type DefineApiPluginInput<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
  TBound = never,
> = Omit<ApiPluginRegistration<TContract, TRouter, TBound>, "namespace">;

export function defineApiPluginDeclaration<TContract extends ContractTree = ContractTree>(
  input: Omit<ApiPluginDeclaration<TContract>, "namespace">
): ApiPluginDeclaration<TContract> {
  return {
    namespace: "orpc",
    ...input,
  };
}

export function defineApiPlugin<
  TContract extends ContractTree = ContractTree,
  TRouter extends RouterTree = RouterTree,
  TBound = never,
>(
  input: DefineApiPluginInput<TContract, TRouter, TBound>
): ApiPluginRegistration<TContract, TRouter, TBound> {
  return {
    namespace: "orpc",
    ...input,
  };
}

export function composeApiPlugins<
  const TPlugins extends readonly MaterializedApiPluginRegistration[],
>(plugins: TPlugins) {
  return {
    internalContract: mergeNamedSurfaceTrees<ContractTree>(
      plugins.map((plugin) => plugin.internal.contract),
      { kind: "api", surface: "contract" }
    ),
    internalRouter: mergeNamedSurfaceTrees<RouterTree>(
      plugins.map((plugin) => plugin.internal.router),
      { kind: "api", surface: "router" }
    ),
    publishedContract: mergeNamedSurfaceTrees<ContractTree>(
      plugins.flatMap((plugin) => (plugin.published ? [plugin.published.contract] : [])),
      { kind: "api", surface: "contract" }
    ),
    publishedRouter: mergeNamedSurfaceTrees<RouterTree>(
      plugins.flatMap((plugin) => (plugin.published ? [plugin.published.router] : [])),
      { kind: "api", surface: "router" }
    ),
  } as const;
}
