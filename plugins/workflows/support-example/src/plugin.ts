import type { Inngest } from "inngest";
import {
  defineAsyncWorkflowPlugin,
  type AsyncWorkflowPlugin,
} from "@rawr/hq-sdk/plugins";
import type { WorkflowRuntimeInput } from "@rawr/hq-sdk/workflows";
import { supportExampleWorkflowContract } from "./contract";
import type { SupportExampleClient } from "./context";
import { createSupportExampleInngestFunctions } from "./functions/support-example";
import { createSupportExampleWorkflowRouter } from "./router";

export type SupportExampleWorkflowRuntimeInput = Readonly<{
  client: Inngest;
}>;

export type SupportExampleWorkflowPluginBound = Readonly<{
  resolveSupportExampleClient: (repoRoot: string) => SupportExampleClient;
}>;

export const supportExampleWorkflowPlugin = defineAsyncWorkflowPlugin<"support-example", SupportExampleWorkflowPluginBound, { resolveSupportExampleClient: (repoRoot: string) => SupportExampleClient }, typeof supportExampleWorkflowContract, ReturnType<typeof createSupportExampleWorkflowRouter>, WorkflowRuntimeInput, unknown>({
  capability: "support-example",
  exposure: {
    internal: {
      contract: supportExampleWorkflowContract,
    },
    published: {
      routeBase: "/support-example/triage",
      contract: supportExampleWorkflowContract,
    },
    runtime: {
      kind: "inngest-functions",
    },
  },
  resources({ bound }) {
    return {
      resolveSupportExampleClient: bound.resolveSupportExampleClient,
    } as const;
  },
  routes({ resources, exposure }) {
    const surface = {
      contract: supportExampleWorkflowContract,
      router: createSupportExampleWorkflowRouter(resources.resolveSupportExampleClient),
    } as const;

    return {
      internal: surface,
      published: {
        routeBase: exposure.published!.routeBase,
        ...surface,
      },
    };
  },
  workflows({ runtime, resources }) {
    return createSupportExampleInngestFunctions({
      client: (runtime as WorkflowRuntimeInput).client,
      resolveSupportExampleClient: resources.resolveSupportExampleClient,
    });
  },
});

export type SupportExampleWorkflowPluginRegistration = AsyncWorkflowPlugin<
  "support-example",
  typeof supportExampleWorkflowContract,
  ReturnType<typeof createSupportExampleWorkflowRouter>,
  WorkflowRuntimeInput,
  unknown,
  SupportExampleWorkflowPluginBound
>;
