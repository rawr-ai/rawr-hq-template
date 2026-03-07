import { getStatus } from "./operations/triage/get-status";
import { triggerRun } from "./operations/triage/trigger-run";

export function createSupportExampleWorkflowRouter() {
  return {
    supportExample: {
      triage: {
        triggerRun,
        getStatus,
      },
    },
  } as const;
}

export type SupportExampleWorkflowRouter = ReturnType<typeof createSupportExampleWorkflowRouter>;
