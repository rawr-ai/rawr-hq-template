import { getStatus } from "./operations/get-status";
import { triggerRun } from "./operations/trigger-run";
import { os } from "./orpc";

export function createSupportTriageWorkflowRouter() {
  return os.router({
    triggerRun,
    getStatus,
  });
}

export type SupportTriageWorkflowRouter = ReturnType<typeof createSupportTriageWorkflowRouter>;
