import { minifyContractRouter, type AnyContractRouter } from "@orpc/contract";
import { createSupportExampleWorkflowRouter } from "./router";

const router = createSupportExampleWorkflowRouter();

export const supportExampleWorkflowContract = minifyContractRouter(
  router as unknown as AnyContractRouter,
) as typeof router;

export type SupportExampleWorkflowContract = typeof supportExampleWorkflowContract;
