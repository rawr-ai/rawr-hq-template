import {
  getStoredWorkflow,
  listStoredWorkflows,
  saveStoredWorkflow,
  validateStoredWorkflow,
} from "./operations";
import { module } from "./module";

const listWorkflows = module.listWorkflows.handler(async ({ context }) => {
  return {
    workflows: await listStoredWorkflows(context.repo),
  };
});

const saveWorkflow = module.saveWorkflow.handler(async ({ context, input, errors }) => {
  return await saveStoredWorkflow(context.repo, input.workflow, errors);
});

const getWorkflow = module.getWorkflow.handler(async ({ context, input, errors }) => {
  const { workflow } = await getStoredWorkflow(context.repo, input.workflowId, errors);
  return { workflow };
});

const validateWorkflowById = module.validateWorkflow.handler(async ({ context, input, errors }) => {
  return await validateStoredWorkflow(context.repo, input.workflowId, errors);
});

export const router = module.router({
  listWorkflows,
  saveWorkflow,
  getWorkflow,
  validateWorkflow: validateWorkflowById,
});
