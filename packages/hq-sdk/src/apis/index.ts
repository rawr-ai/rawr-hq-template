import type { AnyContractRouterObject, AnyProcedureRouterObject } from "../orpc/router-shapes";

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

function mergeNamedSurfaceTrees<TTree extends object>(
  trees: readonly TTree[],
  input: { surface: "contract" | "router" },
): TTree {
  const result: Record<string, unknown> = {};

  for (const tree of trees) {
    for (const [key, value] of Object.entries(tree)) {
      if (key in result) {
        throw new Error(`duplicate api ${input.surface} namespace: ${key}`);
      }
      result[key] = value;
    }
  }

  return result as TTree;
}

export function defineApiPlugin<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
>(
  input: ApiPluginRegistration<TContract, TRouter>,
): ApiPluginRegistration<TContract, TRouter> {
  return input;
}

export function composeApiPlugins<const TPlugins extends readonly ApiPluginRegistration[]>(plugins: TPlugins) {
  return {
    internalContract: mergeNamedSurfaceTrees<AnyContractRouterObject>(
      plugins.map((plugin) => plugin.internal.contract),
      { surface: "contract" },
    ),
    internalRouter: mergeNamedSurfaceTrees<AnyProcedureRouterObject>(
      plugins.map((plugin) => plugin.internal.router),
      { surface: "router" },
    ),
    publishedContract: mergeNamedSurfaceTrees<AnyContractRouterObject>(
      plugins.flatMap((plugin) => (plugin.published ? [plugin.published.contract] : [])),
      { surface: "contract" },
    ),
    publishedRouter: mergeNamedSurfaceTrees<AnyProcedureRouterObject>(
      plugins.flatMap((plugin) => (plugin.published ? [plugin.published.router] : [])),
      { surface: "router" },
    ),
  } as const;
}

export type {
  AnyContractRouterObject,
  AnyProcedureRouterObject,
} from "../orpc/router-shapes";
