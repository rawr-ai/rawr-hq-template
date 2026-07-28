import { implement } from "@orpc/server";
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
  const requestScopedOrpc = implement(contract).$context<RawrBoundaryContext>();
  const requestScopedPublishedApi = implement(
    rolePlan.api.publishedContract
  ).$context<RawrBoundaryContext>();

  return {
    contract,
    router: requestScopedOrpc.router(router),
    published: {
      contract: rolePlan.api.publishedContract,
      router: requestScopedPublishedApi.router(rolePlan.api.publishedRouter),
    },
  } as const;
}

function materializeRawrHostWorkflows(rolePlan: RawrHostRolePlan) {
  const requestScopedPublishedWorkflow = implement(
    rolePlan.workflows.publishedContract
  ).$context<RawrBoundaryContext>();
  const requestScopedInternalWorkflow = implement(
    rolePlan.workflows.internalContract
  ).$context<RawrBoundaryContext>();

  return {
    surfaces: rolePlan.workflows.surfaces,
    internal: {
      contract: rolePlan.workflows.internalContract,
      router: requestScopedInternalWorkflow.router(rolePlan.workflows.internalRouter),
    },
    published: {
      contract: rolePlan.workflows.publishedContract,
      router: requestScopedPublishedWorkflow.router(rolePlan.workflows.publishedRouter),
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
