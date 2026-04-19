import type { AnyContractRouterObject, AnyProcedureRouterObject } from "./orpc/router-shapes";
import type { WorkflowSurfaceMetadata } from "./workflows";

export type ComposedApiPluginSurface = Readonly<{
  internalContract: AnyContractRouterObject;
  internalRouter: AnyProcedureRouterObject;
  publishedContract: AnyContractRouterObject;
  publishedRouter: AnyProcedureRouterObject;
}>;

export type ComposedWorkflowPluginSurface<TCreateInngestFunctions = (...args: readonly unknown[]) => readonly unknown[]> = Readonly<{
  surfaces: readonly WorkflowSurfaceMetadata[];
  internalContract: AnyContractRouterObject;
  internalRouter: AnyProcedureRouterObject;
  publishedContract: AnyContractRouterObject;
  publishedRouter: AnyProcedureRouterObject;
  createInngestFunctions: TCreateInngestFunctions;
}>;

function isMergeableSurfaceNode(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !("~orpc" in (value as Record<string, unknown>));
}

export function mergeDeclaredSurfaceTrees<TTree extends object>(
  trees: readonly TTree[],
  path: readonly string[] = [],
): TTree {
  const merged: Record<string, unknown> = {};

  for (const tree of trees) {
    for (const [key, value] of Object.entries(tree)) {
      if (!(key in merged)) {
        merged[key] = value;
        continue;
      }

      const existing = merged[key];
      if (isMergeableSurfaceNode(existing) && isMergeableSurfaceNode(value)) {
        merged[key] = mergeDeclaredSurfaceTrees(
          [existing, value] as readonly Record<string, unknown>[],
          [...path, key],
        );
        continue;
      }

      throw new Error(`duplicate declared surface at ${[...path, key].join(".")}`);
    }
  }

  return merged as TTree;
}
