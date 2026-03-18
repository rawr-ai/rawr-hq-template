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

export {
  __resetSupportExampleRunStoreForTests,
  getSupportExampleRun,
  saveSupportExampleRun,
} from "./run-store";
export { createSupportExampleInngestFunctions, processSupportExampleRequestedEvent };
export type { SupportExampleWorkflowContext } from "./context";
export { createSupportExampleWorkflowRouter } from "./router";
