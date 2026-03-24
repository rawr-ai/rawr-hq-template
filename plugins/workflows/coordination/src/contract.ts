import { contract as coordinationContract } from "@rawr/coordination/service/contract";

const coordinationTag = ["coordination"] as const;

export const coordinationWorkflowRouterContract = {
  coordination: {
    queueRun: coordinationContract.runs.queueRun.route({
      method: "POST",
      path: "/coordination/workflows/{workflowId}/run",
      tags: coordinationTag,
      summary: "Queue a coordination workflow run",
      operationId: "coordinationWorkflowQueueRun",
    }),
    getRunStatus: coordinationContract.runs.getRunStatus.route({
      method: "GET",
      path: "/coordination/runs/{runId}",
      tags: coordinationTag,
      summary: "Get coordination workflow run status",
      operationId: "coordinationWorkflowGetRunStatus",
    }),
    getRunTimeline: coordinationContract.runs.getRunTimeline.route({
      method: "GET",
      path: "/coordination/runs/{runId}/timeline",
      tags: coordinationTag,
      summary: "Get coordination workflow run timeline",
      operationId: "coordinationWorkflowGetRunTimeline",
    }),
  },
} as const;

export const coordinationWorkflowContract = coordinationWorkflowRouterContract;

export type CoordinationWorkflowContract = typeof coordinationWorkflowContract;
