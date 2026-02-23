import { implement } from "@orpc/server";
import { supportTriageWorkflowContract } from "./contract";
import type { SupportTriageWorkflowContext } from "./context";
import { getSupportTriageStatus } from "./operations/get-triage-status";
import { triggerSupportTriage } from "./operations/trigger-triage";

const os = implement<typeof supportTriageWorkflowContract, SupportTriageWorkflowContext>(supportTriageWorkflowContract);

export function createSupportTriageWorkflowRouter() {
  return os.router({
    triggerSupportTriage: os.triggerSupportTriage.handler(triggerSupportTriage),
    getSupportTriageStatus: os.getSupportTriageStatus.handler(getSupportTriageStatus),
  });
}

export type SupportTriageWorkflowRouter = ReturnType<typeof createSupportTriageWorkflowRouter>;
