import { implement } from "@orpc/server";
import { coordinationWorkflowContract } from "./contract";
import type { CoordinationWorkflowContext } from "./context";
import {
  coordinationWorkflowProjectionInvocation,
  createCoordinationWorkflowProjectionClient,
} from "./projection-bridge";

const os = implement<typeof coordinationWorkflowContract, CoordinationWorkflowContext>(
  coordinationWorkflowContract,
);

export function createCoordinationWorkflowRouter() {
  return os.router({
    coordination: {
      queueRun: os.coordination.queueRun.handler(async ({ context, input }) => {
        return createCoordinationWorkflowProjectionClient(context).queueRun(
          input,
          coordinationWorkflowProjectionInvocation,
        );
      }),
      getRunStatus: os.coordination.getRunStatus.handler(async ({ context, input }) => {
        return createCoordinationWorkflowProjectionClient(context).getRunStatus(
          input,
          coordinationWorkflowProjectionInvocation,
        );
      }),
      getRunTimeline: os.coordination.getRunTimeline.handler(async ({ context, input }) => {
        return createCoordinationWorkflowProjectionClient(context).getRunTimeline(
          input,
          coordinationWorkflowProjectionInvocation,
        );
      }),
    },
  });
}

export type CoordinationWorkflowRouter = ReturnType<typeof createCoordinationWorkflowRouter>;
