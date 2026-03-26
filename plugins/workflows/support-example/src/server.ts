import {
  createSupportExampleInngestFunctions,
  processSupportExampleRequestedEvent,
} from "./functions/support-example";
import { supportExampleWorkflowPlugin } from "./plugin";

export {
  supportExampleWorkflowPlugin,
  type SupportExampleWorkflowPluginBound,
  type SupportExampleWorkflowPluginRegistration,
} from "./plugin";
export { createSupportExampleInngestFunctions, processSupportExampleRequestedEvent };
export {
  supportExampleWorkflowContract,
  type SupportExampleWorkflowContract,
} from "./contract";
export type { SupportExampleWorkflowContext } from "./context";
export { createSupportExampleWorkflowRouter } from "./router";

/** @deprecated Temporary compatibility shim; import `supportExampleWorkflowPlugin` from `./plugin` instead. */
export function registerSupportExampleWorkflowPlugin() {
  return supportExampleWorkflowPlugin;
}
