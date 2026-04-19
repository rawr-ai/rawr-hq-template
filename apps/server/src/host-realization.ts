import { implement } from "@orpc/server";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import type { RawrHostBoundRolePlan } from "./host-seam";
import { mergeRawrHostSurfaceTrees } from "./host-surface-merge";

/**
 * @agents-style seam-law declaration -> host binding -> request/process materialization
 * @agents-style canonical host realization
 *
 * Owns:
 * - turning one host-bound role plan into executable request/process surfaces
 *
 * Must not own:
 * - declaration choice
 * - host satisfier construction
 * - fallback interop with shared-package materializers
 */

function materializeRawrHostOrpc(boundRolePlan: RawrHostBoundRolePlan) {
  const contract = mergeRawrHostSurfaceTrees([
    boundRolePlan.api.internalContract,
    boundRolePlan.workflows.internalContract,
  ]);
  const router = mergeRawrHostSurfaceTrees([
    boundRolePlan.api.internalRouter,
    boundRolePlan.workflows.internalRouter,
  ]);
  const requestScopedOrpc = implement(contract).$context<BoundaryRequestSupportContext>();
  const requestScopedPublishedApi = implement(boundRolePlan.api.publishedContract).$context<BoundaryRequestSupportContext>();

  return {
    contract,
    router: requestScopedOrpc.router(router),
    published: {
      contract: boundRolePlan.api.publishedContract,
      router: requestScopedPublishedApi.router(boundRolePlan.api.publishedRouter),
    },
  } as const;
}

function materializeRawrHostWorkflows(boundRolePlan: RawrHostBoundRolePlan) {
  const requestScopedPublishedWorkflow = implement(boundRolePlan.workflows.publishedContract).$context<BoundaryRequestSupportContext>();
  const requestScopedInternalWorkflow = implement(boundRolePlan.workflows.internalContract).$context<BoundaryRequestSupportContext>();

  return {
    surfaces: boundRolePlan.workflows.surfaces,
    internal: {
      contract: boundRolePlan.workflows.internalContract,
      router: requestScopedInternalWorkflow.router(boundRolePlan.workflows.internalRouter),
    },
    published: {
      contract: boundRolePlan.workflows.publishedContract,
      router: requestScopedPublishedWorkflow.router(boundRolePlan.workflows.publishedRouter),
    },
    createInngestFunctions: boundRolePlan.workflows.createInngestFunctions,
  } as const;
}

export function materializeRawrHostBoundRolePlan(
  boundRolePlan: RawrHostBoundRolePlan,
) {
  return {
    orpc: materializeRawrHostOrpc(boundRolePlan),
    workflows: materializeRawrHostWorkflows(boundRolePlan),
  } as const;
}
