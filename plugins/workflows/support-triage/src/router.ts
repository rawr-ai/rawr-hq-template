import { getSupportTriageStatus } from "./operations/get-triage-status";
import { triggerSupportTriage } from "./operations/trigger-triage";
import { os } from "./orpc";

export function createSupportTriageWorkflowRouter() {
  return os.router({
    triggerSupportTriage,
    getSupportTriageStatus,
  });
}

export type SupportTriageWorkflowRouter = ReturnType<typeof createSupportTriageWorkflowRouter>;
