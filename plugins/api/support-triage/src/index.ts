import { supportTriageApiContract } from "./contract";
import { supportTriageApiRouter } from "./router";

export function registerSupportTriageApiPlugin() {
  return {
    namespace: "orpc" as const,
    contract: supportTriageApiContract,
    router: supportTriageApiRouter,
  };
}

export type SupportTriageApiPluginRegistration = ReturnType<typeof registerSupportTriageApiPlugin>;

