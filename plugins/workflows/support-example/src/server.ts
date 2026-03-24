import type { Inngest } from "inngest";
import { defineWorkflowPlugin, type WorkflowRuntimeInput } from "@rawr/hq-sdk/workflows";
import { supportExampleWorkflowContract } from "./contract";
import type { SupportExampleClient } from "./context";
import { createSupportExampleInngestFunctions, processSupportExampleRequestedEvent } from "./functions/support-example";
import { createSupportExampleWorkflowRouter } from "./router";

export type SupportExampleWorkflowRuntimeInput = Readonly<{
  client: Inngest;
}>;

export type RegisterSupportExampleWorkflowPluginOptions = Readonly<{
  resolveSupportExampleClient: (repoRoot: string) => SupportExampleClient;
}>;

export function registerSupportExampleWorkflowPlugin(
  options: RegisterSupportExampleWorkflowPluginOptions,
) {
  const surface = {
    contract: supportExampleWorkflowContract,
    router: createSupportExampleWorkflowRouter(options.resolveSupportExampleClient),
  } as const;

  return defineWorkflowPlugin({
    capability: "support-example" as const,
    internal: surface,
    published: {
      routeBase: "/support-example/triage" as const,
      ...surface,
    },
    runtime: {
      createInngestFunctions(input: WorkflowRuntimeInput) {
        return createSupportExampleInngestFunctions({
          client: input.client,
          resolveSupportExampleClient: options.resolveSupportExampleClient,
        });
      },
    },
  });
}

export { createSupportExampleInngestFunctions, processSupportExampleRequestedEvent };
export {
  supportExampleWorkflowContract,
  type SupportExampleWorkflowContract,
} from "./contract";
export type { SupportExampleWorkflowContext } from "./context";
export { createSupportExampleWorkflowRouter } from "./router";
export type SupportExampleWorkflowPluginRegistration = ReturnType<typeof registerSupportExampleWorkflowPlugin>;
