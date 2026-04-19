import { implement } from "@orpc/server";
import {
  mergeDeclaredSurfaceTrees,
} from "@rawr/hq-sdk/composition";
import type { BoundaryRequestSupportContext } from "@rawr/runtime-context";
import type { RawrHostBoundRolePlan } from "./host-seam";

function materializeRawrHostOrpc(boundRolePlan: RawrHostBoundRolePlan) {
  const contract = mergeDeclaredSurfaceTrees([
    boundRolePlan.api.internalContract,
    boundRolePlan.workflows.internalContract,
  ]);
  const router = mergeDeclaredSurfaceTrees([
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
