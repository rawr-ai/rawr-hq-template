import { supportTriageApiContract } from "./contract";
import type { SupportTriageApiContext, SupportTriageApiOperationDeps } from "./context";
import { createSupportTriageApiRouter } from "./router";

export function registerSupportTriageApiPlugin<Context extends SupportTriageApiContext = SupportTriageApiContext>(
  deps: SupportTriageApiOperationDeps<Context>,
) {
  return {
    namespace: "orpc" as const,
    contract: supportTriageApiContract,
    router: createSupportTriageApiRouter<Context>(deps),
  };
}

export type SupportTriageApiPluginRegistration = ReturnType<typeof registerSupportTriageApiPlugin>;
