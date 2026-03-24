import { createWorkflowRouterBuilder } from "@rawr/hq-sdk/workflows";
import { coordinationWorkflowContract } from "./contract";
import type { CoordinationWorkflowContext } from "./context";
import {
  createCoordinationWorkflowProjectionClient,
} from "./projection-bridge";

const os = createWorkflowRouterBuilder<typeof coordinationWorkflowContract, CoordinationWorkflowContext>(
  coordinationWorkflowContract,
);

export function createCoordinationWorkflowRouter() {
  return os.router({
    coordination: {
      queueRun: os.coordination.queueRun.handler(async ({ context, input }) => {
        return createCoordinationWorkflowProjectionClient(context).queueRun(
          input,
          {
            context: {
              invocation: {
                traceId: context.correlationId,
              },
            },
          },
        );
      }),
      getRunStatus: os.coordination.getRunStatus.handler(async ({ context, input }) => {
        return createCoordinationWorkflowProjectionClient(context).getRunStatus(
          input,
          {
            context: {
              invocation: {
                traceId: context.correlationId,
              },
            },
          },
        );
      }),
      getRunTimeline: os.coordination.getRunTimeline.handler(async ({ context, input }) => {
        return createCoordinationWorkflowProjectionClient(context).getRunTimeline(
          input,
          {
            context: {
              invocation: {
                traceId: context.correlationId,
              },
            },
          },
        );
      }),
    },
  });
}

export type CoordinationWorkflowRouter = ReturnType<typeof createCoordinationWorkflowRouter>;
