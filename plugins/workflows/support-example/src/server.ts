import type { Inngest } from "inngest";
import {
  defineWorkflowPlugin,
  defineWorkflowPluginDeclaration,
  type WorkflowPluginContribution,
  type WorkflowRuntimeInput,
} from "@rawr/hq-sdk/workflows";
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

const supportExampleWorkflowDeclaration = defineWorkflowPluginDeclaration({
  capability: "support-example" as const,
  internal: {
    contract: supportExampleWorkflowContract,
  },
  published: {
    routeBase: "/support-example/triage" as const,
    contract: supportExampleWorkflowContract,
  },
  runtime: {
    kind: "inngest-functions" as const,
  },
});

const supportExampleWorkflowContractDeclaration = supportExampleWorkflowContract;
const supportExampleWorkflowRouteBase = "/support-example/triage" as const;

function contributeSupportExampleWorkflowPlugin(
  bound: RegisterSupportExampleWorkflowPluginOptions,
): WorkflowPluginContribution<
  typeof supportExampleWorkflowContract,
  ReturnType<typeof createSupportExampleWorkflowRouter>,
  WorkflowRuntimeInput,
  unknown
> {
  const surface = {
    contract: supportExampleWorkflowContractDeclaration,
    router: createSupportExampleWorkflowRouter(bound.resolveSupportExampleClient),
  } as const;

  return {
    internal: surface,
    published: {
      routeBase: supportExampleWorkflowRouteBase,
      ...surface,
    },
    runtime: {
      createInngestFunctions(input: WorkflowRuntimeInput) {
        return createSupportExampleInngestFunctions({
          client: input.client,
          resolveSupportExampleClient: bound.resolveSupportExampleClient,
        });
      },
    },
  };
}

export function registerSupportExampleWorkflowPlugin(
  options: RegisterSupportExampleWorkflowPluginOptions,
) {
  const contribution = contributeSupportExampleWorkflowPlugin(options);

  return defineWorkflowPlugin({
    capability: supportExampleWorkflowDeclaration.capability,
    declaration: supportExampleWorkflowDeclaration,
    contribute: contributeSupportExampleWorkflowPlugin,
    ...contribution,
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
