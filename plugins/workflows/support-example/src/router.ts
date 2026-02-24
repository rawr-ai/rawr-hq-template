import { getStatus } from "./operations/triage/get-status";
import { triggerRun } from "./operations/triage/trigger-run";
import { os } from "./orpc";

export function createSupportExampleWorkflowRouter() {
  return os.router({
    supportExample: os.supportExample.router({
      triage: os.supportExample.triage.router({
        triggerRun,
        getStatus,
      }),
    }),
  });
}

export type SupportExampleWorkflowRouter = ReturnType<typeof createSupportExampleWorkflowRouter>;
