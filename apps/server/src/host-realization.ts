import { type Router, withHiddenRouterContract } from "@orpc/server";
import type { RawrHostRolePlan } from "./host-seam";
import { mergeRawrHostSurfaceTrees } from "./host-surface-merge";
import type { RawrBoundaryContext } from "./request-context";

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical host realization
 *
 * Owns:
 * - turning one host role plan into executable request/process surfaces
 *
 * Must not own:
 * - declaration choice
 * - host satisfier construction
 * - fallback interop with shared-package materializers
 */

function materializeRawrHostOrpc(rolePlan: RawrHostRolePlan) {
  const contract = mergeRawrHostSurfaceTrees([
    rolePlan.api.internalContract,
    rolePlan.workflows.internalContract,
  ]);
  const router = mergeRawrHostSurfaceTrees([
    rolePlan.api.internalRouter,
    rolePlan.workflows.internalRouter,
  ]);
  const contextCompatibleRouter: Router<RawrBoundaryContext> = router;
  const contextCompatiblePublishedRouter: Router<RawrBoundaryContext> =
    rolePlan.api.publishedRouter;

  return {
    contract,
    router: withHiddenRouterContract(contextCompatibleRouter, contract),
    published: {
      contract: rolePlan.api.publishedContract,
      router: withHiddenRouterContract(
        contextCompatiblePublishedRouter,
        rolePlan.api.publishedContract
      ),
    },
  } as const;
}

function materializeRawrHostWorkflows(rolePlan: RawrHostRolePlan) {
  const contextCompatibleInternalRouter: Router<RawrBoundaryContext> =
    rolePlan.workflows.internalRouter;
  const contextCompatiblePublishedRouter: Router<RawrBoundaryContext> =
    rolePlan.workflows.publishedRouter;

  return {
    surfaces: rolePlan.workflows.surfaces,
    internal: {
      contract: rolePlan.workflows.internalContract,
      router: withHiddenRouterContract(
        contextCompatibleInternalRouter,
        rolePlan.workflows.internalContract
      ),
    },
    published: {
      contract: rolePlan.workflows.publishedContract,
      router: withHiddenRouterContract(
        contextCompatiblePublishedRouter,
        rolePlan.workflows.publishedContract
      ),
    },
    createInngestFunctions: rolePlan.workflows.createInngestFunctions,
  } as const;
}

export function materializeRawrHostRolePlan(rolePlan: RawrHostRolePlan) {
  return {
    orpc: materializeRawrHostOrpc(rolePlan),
    workflows: materializeRawrHostWorkflows(rolePlan),
  } as const;
}
