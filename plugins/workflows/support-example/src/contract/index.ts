import { oc } from "@orpc/contract";
import { getStatusContract, triggerRunContract } from "./triage";

export const supportExampleWorkflowContract = oc.router({
  supportExample: {
    triage: {
      triggerRun: triggerRunContract,
      getStatus: getStatusContract,
    },
  },
});

export type SupportExampleWorkflowContract = typeof supportExampleWorkflowContract;

export { supportExampleWorkflowErrorMap } from "./errors";
export type { GetStatusInput, GetStatusOutput, SupportExampleRun, TriggerRunInput, TriggerRunOutput } from "./triage";
