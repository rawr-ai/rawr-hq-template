import type { BaseDeps } from "@rawr/hq-sdk";
import { createApiRouterBuilder } from "@rawr/hq-sdk/apis";
import { contract } from "./contract";
import {
  getStoredWorkflow,
  listStoredWorkflows,
  saveStoredWorkflow,
  validateStoredWorkflow,
} from "../service/modules/workflows/operations";
import { createRepository } from "../service/modules/workflows/repository";

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

function getRepository(context: AuthoringContext) {
  return createRepository(context.scope.repoRoot);
}

const listWorkflows = oc.listWorkflows.handler(async ({ context }) => {
  return {
    workflows: await listStoredWorkflows(getRepository(context)),
  };
});

const saveWorkflow = oc.saveWorkflow.handler(async ({ context, input, errors }) => {
  return await saveStoredWorkflow(getRepository(context), input.workflow, errors);
});

const getWorkflow = oc.getWorkflow.handler(async ({ context, input, errors }) => {
  const { workflow } = await getStoredWorkflow(getRepository(context), input.workflowId, errors);
  return { workflow };
});

const validateWorkflowById = oc.validateWorkflow.handler(async ({ context, input, errors }) => {
  return await validateStoredWorkflow(getRepository(context), input.workflowId, errors);
});

export const router = oc.router({
  listWorkflows,
  saveWorkflow,
  getWorkflow,
  validateWorkflow: validateWorkflowById,
});

export type Router = typeof router;
