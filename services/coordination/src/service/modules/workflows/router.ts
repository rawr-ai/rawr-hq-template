import {
  ensureCoordinationStorage,
  getWorkflow as readWorkflow,
  listWorkflows as readWorkflows,
  saveWorkflow as persistWorkflow,
} from "../../../storage";
import { validateWorkflow } from "../../../validation";
import { impl } from "../../impl";
import { parseCoordinationId } from "../../shared/inputs";

const listWorkflows = impl.listWorkflows.handler(async ({ context }) => {
  const repoRoot = context.scope.repoRoot;
  await ensureCoordinationStorage(repoRoot);
  const workflows = await readWorkflows(repoRoot);
  return { workflows };
});

const saveWorkflow = impl.saveWorkflow.handler(async ({ context, input, errors }) => {
  const repoRoot = context.scope.repoRoot;
  await ensureCoordinationStorage(repoRoot);
  const validation = validateWorkflow(input.workflow);
  if (!validation.ok) {
    throw errors.WORKFLOW_VALIDATION_FAILED({
      message: "Workflow validation failed",
      data: validation,
    });
  }

  await persistWorkflow(repoRoot, input.workflow);
  return { workflow: input.workflow };
});

const getWorkflow = impl.getWorkflow.handler(async ({ context, input, errors }) => {
  const repoRoot = context.scope.repoRoot;
  await ensureCoordinationStorage(repoRoot);
  const workflowId = parseCoordinationId(input.workflowId);
  if (!workflowId) {
    throw errors.INVALID_WORKFLOW_ID({
      message: "Invalid workflowId format",
      data: {
        workflowId: typeof input.workflowId === "string" ? input.workflowId : null,
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

  return { workflow };
});

const validateWorkflowById = impl.validateWorkflow.handler(async ({ context, input, errors }) => {
  const repoRoot = context.scope.repoRoot;
  await ensureCoordinationStorage(repoRoot);
  const workflowId = parseCoordinationId(input.workflowId);
  if (!workflowId) {
    throw errors.INVALID_WORKFLOW_ID({
      message: "Invalid workflowId format",
      data: {
        workflowId: typeof input.workflowId === "string" ? input.workflowId : null,
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

  return {
    workflowId,
    validation: validateWorkflow(workflow),
  };
});

export const router = {
  listWorkflows,
  saveWorkflow,
  getWorkflow,
  validateWorkflow: validateWorkflowById,
};
