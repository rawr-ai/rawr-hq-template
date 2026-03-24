import { oc } from "@orpc/contract";
import { implement } from "@orpc/server";
import { coordinationContract, createCoordinationRouter } from "@rawr/coordination/orpc";
import type { RuntimeRouterContext } from "@rawr/runtime-context";
import { createStateRouter, stateContract } from "@rawr/state/orpc";

export const hqContract = oc.router({
  coordination: coordinationContract,
  state: stateContract,
});

export type HqContract = typeof hqContract;

export const workflowTriggerContract = oc.router({
  coordination: coordinationContract,
});

export type WorkflowTriggerContract = typeof workflowTriggerContract;

export function createHqRuntimeRouter<Context extends RuntimeRouterContext = RuntimeRouterContext>() {
  const os = implement<typeof hqContract, Context>(hqContract);

  return os.router({
    coordination: createCoordinationRouter<Context>(),
    state: createStateRouter<Context>(),
  });
}

export function createWorkflowTriggerRuntimeRouter<Context extends RuntimeRouterContext = RuntimeRouterContext>() {
  const os = implement<typeof workflowTriggerContract, Context>(workflowTriggerContract);

  return os.router({
    coordination: createCoordinationRouter<Context>(),
  });
}
