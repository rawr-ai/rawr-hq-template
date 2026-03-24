import type {
  CoordinationWorkflowV1,
  ValidationResultV1,
} from "../../../domain/types";
import { validateWorkflow } from "../../../domain/validation";
import {
  ensureCoordinationStorage,
  getWorkflow as readWorkflow,
  listWorkflows as readWorkflows,
  saveWorkflow as persistWorkflow,
} from "../../../storage";
import { parseCoordinationId } from "../../shared/inputs";

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

export async function listStoredWorkflows(repoRoot: string) {
  await ensureCoordinationStorage(repoRoot);
  return await readWorkflows(repoRoot);
}

export async function saveStoredWorkflow(
  repoRoot: string,
  workflow: CoordinationWorkflowV1,
  errors: {
    WORKFLOW_VALIDATION_FAILED: WorkflowValidationFailedErrorFactory;
  },
) {
  await ensureCoordinationStorage(repoRoot);
  const validation = validateWorkflow(workflow);
  if (!validation.ok) {
    throw errors.WORKFLOW_VALIDATION_FAILED({
      message: "Workflow validation failed",
      data: validation,
    });
  }

  await persistWorkflow(repoRoot, workflow);
  return { workflow };
}

export async function getStoredWorkflow(
  repoRoot: string,
  workflowIdInput: string,
  errors: WorkflowLookupErrors,
) {
  await ensureCoordinationStorage(repoRoot);
  const workflowId = parseCoordinationId(workflowIdInput);
  if (!workflowId) {
    throw errors.INVALID_WORKFLOW_ID({
      message: "Invalid workflowId format",
      data: {
        workflowId: typeof workflowIdInput === "string" ? workflowIdInput : null,
      },
    });
  }

  const workflow = await readWorkflow(repoRoot, workflowId);
  if (!workflow) {
    throw errors.WORKFLOW_NOT_FOUND({
      message: "workflow not found",
      data: { workflowId },
    });
  }

  return { workflowId, workflow };
}

export async function validateStoredWorkflow(
  repoRoot: string,
  workflowIdInput: string,
  errors: WorkflowLookupErrors,
) {
  const { workflowId, workflow } = await getStoredWorkflow(repoRoot, workflowIdInput, errors);
  return {
    workflowId,
    validation: validateWorkflow(workflow),
  };
}
