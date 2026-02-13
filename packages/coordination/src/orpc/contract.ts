import { oc } from "@orpc/contract";
import {
  GetRunStatusInputSchema,
  GetRunStatusOutputSchema,
  GetRunTimelineInputSchema,
  GetRunTimelineOutputSchema,
  GetWorkflowInputSchema,
  GetWorkflowOutputSchema,
  ListWorkflowsInputSchema,
  ListWorkflowsOutputSchema,
  QueueRunInputSchema,
  QueueRunOutputSchema,
  SaveWorkflowInputSchema,
  SaveWorkflowOutputSchema,
  ValidateWorkflowInputSchema,
  ValidateWorkflowOutputSchema,
  typeBoxStandardSchema,
} from "./schemas";

const coordinationTag = ["coordination"] as const;

export const coordinationContract = oc.router({
  listWorkflows: oc
    .route({
      method: "GET",
      path: "/coordination/workflows",
      tags: coordinationTag,
      summary: "List saved coordination workflows",
      operationId: "coordinationListWorkflows",
    })
    .input(typeBoxStandardSchema(ListWorkflowsInputSchema))
    .output(typeBoxStandardSchema(ListWorkflowsOutputSchema)),

  saveWorkflow: oc
    .route({
      method: "POST",
      path: "/coordination/workflows",
      tags: coordinationTag,
      summary: "Create or update a coordination workflow",
      operationId: "coordinationSaveWorkflow",
    })
    .input(typeBoxStandardSchema(SaveWorkflowInputSchema))
    .output(typeBoxStandardSchema(SaveWorkflowOutputSchema)),

  getWorkflow: oc
    .route({
      method: "GET",
      path: "/coordination/workflows/{workflowId}",
      tags: coordinationTag,
      summary: "Get a coordination workflow by id",
      operationId: "coordinationGetWorkflow",
    })
    .input(typeBoxStandardSchema(GetWorkflowInputSchema))
    .output(typeBoxStandardSchema(GetWorkflowOutputSchema)),

  validateWorkflow: oc
    .route({
      method: "POST",
      path: "/coordination/workflows/{workflowId}/validate",
      tags: coordinationTag,
      summary: "Validate a coordination workflow",
      operationId: "coordinationValidateWorkflow",
    })
    .input(typeBoxStandardSchema(ValidateWorkflowInputSchema))
    .output(typeBoxStandardSchema(ValidateWorkflowOutputSchema)),

  queueRun: oc
    .route({
      method: "POST",
      path: "/coordination/workflows/{workflowId}/run",
      tags: coordinationTag,
      summary: "Queue a workflow run",
      operationId: "coordinationQueueRun",
    })
    .input(typeBoxStandardSchema(QueueRunInputSchema))
    .output(typeBoxStandardSchema(QueueRunOutputSchema)),

  getRunStatus: oc
    .route({
      method: "GET",
      path: "/coordination/runs/{runId}",
      tags: coordinationTag,
      summary: "Get workflow run status",
      operationId: "coordinationGetRunStatus",
    })
    .input(typeBoxStandardSchema(GetRunStatusInputSchema))
    .output(typeBoxStandardSchema(GetRunStatusOutputSchema)),

  getRunTimeline: oc
    .route({
      method: "GET",
      path: "/coordination/runs/{runId}/timeline",
      tags: coordinationTag,
      summary: "Get workflow run timeline",
      operationId: "coordinationGetRunTimeline",
    })
    .input(typeBoxStandardSchema(GetRunTimelineInputSchema))
    .output(typeBoxStandardSchema(GetRunTimelineOutputSchema)),
});

export type CoordinationContract = typeof coordinationContract;
