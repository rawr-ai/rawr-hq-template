import { schema } from "@rawr/hq-sdk";
import {
  GetWorkflowInputSchema,
  GetWorkflowOutputSchema,
  ListWorkflowsInputSchema,
  ListWorkflowsOutputSchema,
  SaveWorkflowInputSchema,
  SaveWorkflowOutputSchema,
  ValidateWorkflowInputSchema,
  ValidateWorkflowOutputSchema,
} from "./schemas";
import { ocBase } from "../../base";
import {
  INVALID_WORKFLOW_ID,
  WORKFLOW_NOT_FOUND,
} from "../../shared/errors";
import { WORKFLOW_VALIDATION_FAILED } from "./errors";

export const workflowsContract = {
  listWorkflows: ocBase
    .meta({ entity: "workflow", idempotent: true })
    .input(schema(ListWorkflowsInputSchema))
    .output(schema(ListWorkflowsOutputSchema)),

  saveWorkflow: ocBase
    .meta({ entity: "workflow", idempotent: false })
    .input(schema(SaveWorkflowInputSchema))
    .output(schema(SaveWorkflowOutputSchema))
    .errors({
      WORKFLOW_VALIDATION_FAILED,
    }),

  getWorkflow: ocBase
    .meta({ entity: "workflow", idempotent: true })
    .input(schema(GetWorkflowInputSchema))
    .output(schema(GetWorkflowOutputSchema))
    .errors({
      INVALID_WORKFLOW_ID,
      WORKFLOW_NOT_FOUND,
    }),

  validateWorkflow: ocBase
    .meta({ entity: "workflow", idempotent: true })
    .input(schema(ValidateWorkflowInputSchema))
    .output(schema(ValidateWorkflowOutputSchema))
    .errors({
      INVALID_WORKFLOW_ID,
      WORKFLOW_NOT_FOUND,
    }),
};

export const contract = workflowsContract;
