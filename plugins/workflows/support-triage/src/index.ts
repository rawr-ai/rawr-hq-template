import { supportTriageWorkflowContract } from "./contract";
import { createSupportTriageInngestFunctions, processSupportTriageRequestedEvent } from "./functions/support-triage";
import { createSupportTriageWorkflowRouter } from "./router";

export function registerSupportTriageWorkflowPlugin() {
  return {
    namespace: "workflows" as const,
    contract: supportTriageWorkflowContract,
    router: createSupportTriageWorkflowRouter(),
  };
}

export { createSupportTriageInngestFunctions, processSupportTriageRequestedEvent };
export * from "./contract";
export * from "./context";
export * from "./models";
export * from "./router";
export * from "./run-store";
