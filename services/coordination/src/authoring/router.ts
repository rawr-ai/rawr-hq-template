import { impl } from "./impl";
import {
  getStoredWorkflow,
  listStoredWorkflows,
  saveStoredWorkflow,
  validateStoredWorkflow,
} from "../service/modules/workflows/module";

const listWorkflows = impl.listWorkflows.handler(async ({ context }) => {
  return {
    workflows: await listStoredWorkflows(context.scope.repoRoot),
  };
});

const saveWorkflow = impl.saveWorkflow.handler(async ({ context, input, errors }) => {
  return await saveStoredWorkflow(context.scope.repoRoot, input.workflow, errors);
});

const getWorkflow = impl.getWorkflow.handler(async ({ context, input, errors }) => {
  const { workflow } = await getStoredWorkflow(context.scope.repoRoot, input.workflowId, errors);
  return { workflow };
});

const validateWorkflowById = impl.validateWorkflow.handler(async ({ context, input, errors }) => {
  return await validateStoredWorkflow(context.scope.repoRoot, input.workflowId, errors);
});

export const router = impl.router({
  listWorkflows,
  saveWorkflow,
  getWorkflow,
  validateWorkflow: validateWorkflowById,
});

export type Router = typeof router;
