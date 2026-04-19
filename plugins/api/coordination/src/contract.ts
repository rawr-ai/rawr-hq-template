import { contract as coordinationContract } from "@rawr/coordination/service/contract";

const coordinationTag = ["coordination"] as const;

export const coordinationApiRouterContract = {
  coordination: {
    listWorkflows: coordinationContract.workflows.listWorkflows.route({
      method: "GET",
      path: "/coordination/workflows",
      tags: coordinationTag,
      summary: "List saved coordination workflows",
      operationId: "coordinationListWorkflows",
    }),
    saveWorkflow: coordinationContract.workflows.saveWorkflow.route({
      method: "POST",
      path: "/coordination/workflows",
      tags: coordinationTag,
      summary: "Create or update a coordination workflow",
      operationId: "coordinationSaveWorkflow",
    }),
    getWorkflow: coordinationContract.workflows.getWorkflow.route({
      method: "GET",
      path: "/coordination/workflows/{workflowId}",
      tags: coordinationTag,
      summary: "Get a coordination workflow by id",
      operationId: "coordinationGetWorkflow",
    }),
    validateWorkflow: coordinationContract.workflows.validateWorkflow.route({
      method: "POST",
      path: "/coordination/workflows/{workflowId}/validate",
      tags: coordinationTag,
      summary: "Validate a coordination workflow",
      operationId: "coordinationValidateWorkflow",
    }),
  },
} as const;

export const coordinationApiContract = coordinationApiRouterContract;

export type CoordinationApiContract = typeof coordinationApiContract;
