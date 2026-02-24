import { getStatus } from "./operations/get-status";
import { triggerRun } from "./operations/trigger-run";
import { os } from "./orpc";

export function createSupportExampleWorkflowRouter() {
  return os.router({
    triggerRun,
    getStatus,
  });
}

export type SupportExampleWorkflowRouter = ReturnType<typeof createSupportExampleWorkflowRouter>;
