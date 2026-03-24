import type { AnyContractRouterObject, AnyProcedureRouterObject } from "./orpc-shapes";

export type ApiContextEnricher = (context: any) => any;

export type ApiSurfaceContribution<
  TContract extends AnyContractRouterObject = AnyContractRouterObject,
  TRouter extends AnyProcedureRouterObject = AnyProcedureRouterObject,
> = Readonly<{
  contract: TContract;
  router: TRouter;
  enrichContext?: ApiContextEnricher;
}>;

export type ApiPluginRegistration = Readonly<{
  namespace: "orpc";
  internal: ApiSurfaceContribution;
  published?: ApiSurfaceContribution;
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

export function composeApiPlugins(plugins: readonly ApiPluginRegistration[]) {
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
    enrichContext(context: any): any {
      return plugins.reduce(
        (current, plugin) => plugin.internal.enrichContext?.(current) ?? current,
        context,
      );
    },
  } as const;
}
