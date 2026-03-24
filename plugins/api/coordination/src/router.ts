import { implement } from "@orpc/server";
import { coordinationApiContract } from "./contract";
import {
  createCoordinationProjectionBridge,
  type CoordinationApiContext,
} from "./projection-bridge";

const os = implement<typeof coordinationApiContract, CoordinationApiContext>(coordinationApiContract);

function createCoordinationRouter() {
  return os.router({
    coordination: {
      listWorkflows: os.coordination.listWorkflows.handler(async ({ context, input }) => {
        return createCoordinationProjectionBridge(context).listWorkflows(input);
      }),
      saveWorkflow: os.coordination.saveWorkflow.handler(async ({ context, input }) => {
        return createCoordinationProjectionBridge(context).saveWorkflow(input);
      }),
      getWorkflow: os.coordination.getWorkflow.handler(async ({ context, input }) => {
        return createCoordinationProjectionBridge(context).getWorkflow(input);
      }),
      validateWorkflow: os.coordination.validateWorkflow.handler(async ({ context, input }) => {
        return createCoordinationProjectionBridge(context).validateWorkflow(input);
      }),
    },
  });
}

export function createCoordinationApiRouter() {
  return createCoordinationRouter();
}

export type { CoordinationApiContext } from "./projection-bridge";
export type CoordinationApiRouter = ReturnType<typeof createCoordinationApiRouter>;
