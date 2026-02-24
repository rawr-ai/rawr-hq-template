import { oc } from "@orpc/contract";
import { getStatusContract, triggerRunContract } from "./triage";

export const supportExampleWorkflowContract = oc.router({
  supportExample: oc.router({
    triage: oc.router({
      triggerRun: triggerRunContract,
      getStatus: getStatusContract,
    }),
  }),
});

export type SupportExampleWorkflowContract = typeof supportExampleWorkflowContract;

export { supportExampleWorkflowErrorMap } from "./errors";
export type { GetStatusInput, GetStatusOutput, SupportExampleRun, TriggerRunInput, TriggerRunOutput } from "./triage";
