import { supportExampleApiContract } from "./contract";
import { supportExampleApiRouter } from "./router";

export function registerSupportExampleApiPlugin() {
  return {
    namespace: "orpc" as const,
    contract: supportExampleApiContract,
    router: supportExampleApiRouter,
  };
}

export type SupportExampleApiPluginRegistration = ReturnType<typeof registerSupportExampleApiPlugin>;

