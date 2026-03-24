import type { BaseDeps } from "@rawr/hq-sdk";
import { createApiRouterBuilder } from "@rawr/hq-sdk/apis";
import { contract } from "./contract";
import {
  getStoredWorkflow,
  listStoredWorkflows,
  saveStoredWorkflow,
  validateStoredWorkflow,
} from "../service/modules/workflows/module";

type AuthoringContext = {
  deps: BaseDeps;
  scope: {
    repoRoot: string;
  };
  config: {};
  invocation: {
    traceId: string;
  };
  provided: {};
};

const oc = createApiRouterBuilder<typeof contract, AuthoringContext>(contract);

const listWorkflows = oc.listWorkflows.handler(async ({ context }) => {
  return {
    workflows: await listStoredWorkflows(context.scope.repoRoot),
  };
});

const saveWorkflow = oc.saveWorkflow.handler(async ({ context, input, errors }) => {
  return await saveStoredWorkflow(context.scope.repoRoot, input.workflow, errors);
});

const getWorkflow = oc.getWorkflow.handler(async ({ context, input, errors }) => {
  const { workflow } = await getStoredWorkflow(context.scope.repoRoot, input.workflowId, errors);
  return { workflow };
});

const validateWorkflowById = oc.validateWorkflow.handler(async ({ context, input, errors }) => {
  return await validateStoredWorkflow(context.scope.repoRoot, input.workflowId, errors);
});

export const router = oc.router({
  listWorkflows,
  saveWorkflow,
  getWorkflow,
  validateWorkflow: validateWorkflowById,
});

export type Router = typeof router;
