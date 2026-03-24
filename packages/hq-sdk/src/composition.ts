import { implement, type Context } from "@orpc/server";
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

function mergeDeclaredSurfaceTrees<TTree extends object>(
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

export function materializeRequestScopedPluginSurfaces<
  TContext extends Context,
  TCreateInngestFunctions,
>(input: {
  api: ComposedApiPluginSurface;
  workflows: ComposedWorkflowPluginSurface<TCreateInngestFunctions>;
}) {
  const contract = mergeDeclaredSurfaceTrees<AnyContractRouterObject>([
    input.api.internalContract,
    input.workflows.internalContract,
  ]);
  const router = mergeDeclaredSurfaceTrees<AnyProcedureRouterObject>([
    input.api.internalRouter,
    input.workflows.internalRouter,
  ]);

  const requestScopedOrpc = implement(contract).$context<TContext>();
  const requestScopedPublishedApi = implement(input.api.publishedContract).$context<TContext>();
  const requestScopedPublishedWorkflow = implement(input.workflows.publishedContract).$context<TContext>();
  const requestScopedInternalWorkflow = implement(input.workflows.internalContract).$context<TContext>();

  return {
    orpc: {
      contract,
      router: requestScopedOrpc.router(router),
      published: {
        contract: input.api.publishedContract,
        router: requestScopedPublishedApi.router(input.api.publishedRouter),
      },
    },
    workflows: {
      surfaces: input.workflows.surfaces,
      internal: {
        contract: input.workflows.internalContract,
        router: requestScopedInternalWorkflow.router(input.workflows.internalRouter),
      },
      published: {
        contract: input.workflows.publishedContract,
        router: requestScopedPublishedWorkflow.router(input.workflows.publishedRouter),
      },
      createInngestFunctions: input.workflows.createInngestFunctions,
    },
  } as const;
}
