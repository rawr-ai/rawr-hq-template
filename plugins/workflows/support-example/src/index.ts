import { supportExampleWorkflowContract } from "./contract";
import { createSupportExampleInngestFunctions, processSupportExampleRequestedEvent } from "./functions/support-example";
import { createSupportExampleWorkflowRouter } from "./router";

export function registerSupportExampleWorkflowPlugin() {
  return {
    namespace: "workflows" as const,
    contract: supportExampleWorkflowContract,
    router: createSupportExampleWorkflowRouter(),
  };
}

export { createSupportExampleInngestFunctions, processSupportExampleRequestedEvent };
export * from "./contract";
export * from "./context";
export * from "./models";
export * from "./router";
export * from "./run-store";
