import type { RouterContract } from "@orpc/contract";
import type { AnyRouter } from "@orpc/server";
import type { WorkflowSurfaceMetadata } from "./workflows";

type ContractTree = { [key: string]: RouterContract };
type RouterTree = { [key: string]: AnyRouter };

export type ComposedApiPluginSurface = Readonly<{
  internalContract: ContractTree;
  internalRouter: RouterTree;
  publishedContract: ContractTree;
  publishedRouter: RouterTree;
}>;

export type ComposedWorkflowPluginSurface<
  TCreateInngestFunctions = (...args: readonly unknown[]) => readonly unknown[],
> = Readonly<{
  surfaces: readonly WorkflowSurfaceMetadata[];
  internalContract: ContractTree;
  internalRouter: RouterTree;
  publishedContract: ContractTree;
  publishedRouter: RouterTree;
  createInngestFunctions: TCreateInngestFunctions;
}>;

function isMergeableSurfaceNode(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !("~orpc" in (value as Record<string, unknown>))
  );
}

/**
 * Combines independently declared API or workflow trees into one host-realizable surface.
 * Object branches merge recursively, while duplicate terminal paths fail so plugins cannot
 * silently replace another owner's contract or router.
 *
 * @param trees - The declared surface fragments selected by application composition.
 * @param path - The recursive path used to identify ownership collisions.
 * @returns A merged tree preserving every non-conflicting declaration.
 * @throws When two declarations claim the same terminal surface path.
 */
export function mergeDeclaredSurfaceTrees<TTree extends object>(
  trees: readonly TTree[],
  path: readonly string[] = []
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
          [...path, key]
        );
        continue;
      }

      throw new Error(`duplicate declared surface at ${[...path, key].join(".")}`);
    }
  }

  return merged as TTree;
}
