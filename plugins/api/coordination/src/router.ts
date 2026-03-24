import {
  createApiRouterBuilder,
  createApiTraceForwardingOptions,
} from "@rawr/hq-sdk/apis";
import { coordinationApiContract } from "./contract";
import type { CoordinationApiContext, CoordinationAuthoringClientResolver } from "./context";

const os = createApiRouterBuilder<typeof coordinationApiContract, CoordinationApiContext>(coordinationApiContract);

function createCoordinationRouter(resolveClient: CoordinationAuthoringClientResolver) {
  return os.router({
    coordination: {
      listWorkflows: os.coordination.listWorkflows.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).listWorkflows(input, createApiTraceForwardingOptions(context));
      }),
      saveWorkflow: os.coordination.saveWorkflow.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).saveWorkflow(input, createApiTraceForwardingOptions(context));
      }),
      getWorkflow: os.coordination.getWorkflow.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).getWorkflow(input, createApiTraceForwardingOptions(context));
      }),
      validateWorkflow: os.coordination.validateWorkflow.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).validateWorkflow(input, createApiTraceForwardingOptions(context));
      }),
    },
  });
}

export function createCoordinationApiRouter(resolveClient: CoordinationAuthoringClientResolver) {
  return createCoordinationRouter(resolveClient);
}

export type { CoordinationApiContext, CoordinationAuthoringClientResolver } from "./context";
export type CoordinationApiRouter = ReturnType<typeof createCoordinationApiRouter>;
