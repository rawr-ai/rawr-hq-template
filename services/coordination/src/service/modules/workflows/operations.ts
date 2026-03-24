import type {
  CoordinationWorkflowV1,
  ValidationResultV1,
} from "../../../domain/types";
import { validateWorkflow } from "../../../domain/validation";
import { parseCoordinationId } from "../../shared/inputs";
import type { WorkflowRepository } from "./repository";

type InvalidWorkflowIdErrorFactory = (args: {
  message: string;
  data: {
    workflowId: string | null;
  };
}) => unknown;

type WorkflowNotFoundErrorFactory = (args: {
  message: string;
  data: {
    workflowId: string;
  };
}) => unknown;

type WorkflowValidationFailedErrorFactory = (args: {
  message: string;
  data: ValidationResultV1;
}) => unknown;

type WorkflowLookupErrors = {
  INVALID_WORKFLOW_ID: InvalidWorkflowIdErrorFactory;
  WORKFLOW_NOT_FOUND: WorkflowNotFoundErrorFactory;
};

export async function listStoredWorkflows(repo: WorkflowRepository) {
  return await repo.listWorkflows();
}

export async function saveStoredWorkflow(
  repo: WorkflowRepository,
  workflow: CoordinationWorkflowV1,
  errors: {
    WORKFLOW_VALIDATION_FAILED: WorkflowValidationFailedErrorFactory;
  },
) {
  const validation = validateWorkflow(workflow);
  if (!validation.ok) {
    throw errors.WORKFLOW_VALIDATION_FAILED({
      message: "Workflow validation failed",
      data: validation,
    });
  }

  await repo.saveWorkflow(workflow);
  return { workflow };
}

export async function getStoredWorkflow(
  repo: WorkflowRepository,
  workflowIdInput: string,
  errors: WorkflowLookupErrors,
) {
  const workflowId = parseCoordinationId(workflowIdInput);
  if (!workflowId) {
    throw errors.INVALID_WORKFLOW_ID({
      message: "Invalid workflowId format",
      data: {
        workflowId: typeof workflowIdInput === "string" ? workflowIdInput : null,
      },
    });
  }

  const workflow = await repo.getWorkflow(workflowId);
  if (!workflow) {
    throw errors.WORKFLOW_NOT_FOUND({
      message: "workflow not found",
      data: { workflowId },
    });
  }

  return { workflowId, workflow };
}

export async function validateStoredWorkflow(
  repo: WorkflowRepository,
  workflowIdInput: string,
  errors: WorkflowLookupErrors,
) {
  const { workflowId, workflow } = await getStoredWorkflow(repo, workflowIdInput, errors);
  return {
    workflowId,
    validation: validateWorkflow(workflow),
  };
}
