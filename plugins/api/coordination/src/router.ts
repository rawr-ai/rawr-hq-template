import { createApiRouterBuilder } from "@rawr/hq-sdk/apis";
import { coordinationApiContract } from "./contract";
import type { CoordinationApiContext, CoordinationAuthoringClientResolver } from "./context";

const os = createApiRouterBuilder<typeof coordinationApiContract, CoordinationApiContext>(coordinationApiContract);

function createCoordinationRouter(resolveClient: CoordinationAuthoringClientResolver) {
  return os.router({
    coordination: {
      listWorkflows: os.coordination.listWorkflows.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).listWorkflows(input, {
          context: {
            invocation: {
              traceId: context.correlationId,
            },
          },
        });
      }),
      saveWorkflow: os.coordination.saveWorkflow.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).saveWorkflow(input, {
          context: {
            invocation: {
              traceId: context.correlationId,
            },
          },
        });
      }),
      getWorkflow: os.coordination.getWorkflow.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).getWorkflow(input, {
          context: {
            invocation: {
              traceId: context.correlationId,
            },
          },
        });
      }),
      validateWorkflow: os.coordination.validateWorkflow.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).validateWorkflow(input, {
          context: {
            invocation: {
              traceId: context.correlationId,
            },
          },
        });
      }),
    },
  });
}

export function createCoordinationApiRouter(resolveClient: CoordinationAuthoringClientResolver) {
  return createCoordinationRouter(resolveClient);
}

export type { CoordinationApiContext, CoordinationAuthoringClientResolver } from "./context";
export type CoordinationApiRouter = ReturnType<typeof createCoordinationApiRouter>;
