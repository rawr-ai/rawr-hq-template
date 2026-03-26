import type { Inngest } from "inngest";
import {
  defineAsyncWorkflowPlugin,
  type AsyncWorkflowPlugin,
} from "@rawr/hq-sdk/plugins";
import type { WorkflowRuntimeInput } from "@rawr/hq-sdk/workflows";
import { coordinationWorkflowContract } from "./contract";
import type { CoordinationWorkflowAuthoringClientResolver } from "./context";
import {
  createCoordinationInngestFunction,
  type CoordinationRuntimeAdapter,
} from "./inngest";
import { createCoordinationWorkflowRouter } from "./router";

export type CoordinationWorkflowRuntimeInput = Readonly<{
  client: Inngest;
  runtime: CoordinationRuntimeAdapter;
}>;

export type CoordinationWorkflowPluginBound = Readonly<{
  resolveAuthoringClient: CoordinationWorkflowAuthoringClientResolver;
}>;

export const coordinationWorkflowPlugin = defineAsyncWorkflowPlugin<"coordination", CoordinationWorkflowPluginBound, { resolveAuthoringClient: CoordinationWorkflowAuthoringClientResolver }, typeof coordinationWorkflowContract, ReturnType<typeof createCoordinationWorkflowRouter>, WorkflowRuntimeInput<CoordinationRuntimeAdapter>, unknown>({
  capability: "coordination",
  exposure: {
    internal: {
      contract: coordinationWorkflowContract,
    },
    published: {
      routeBase: "/coordination",
      contract: coordinationWorkflowContract,
    },
    runtime: {
      kind: "inngest-functions",
    },
  },
  resources({ bound }) {
    return {
      resolveAuthoringClient: bound.resolveAuthoringClient,
    } as const;
  },
  routes({ resources, exposure }) {
    const surface = {
      contract: coordinationWorkflowContract,
      router: createCoordinationWorkflowRouter(resources.resolveAuthoringClient),
    } as const;

    return {
      internal: surface,
      published: {
        routeBase: exposure.published!.routeBase,
        ...surface,
      },
    };
  },
  workflows({ runtime }) {
    return createCoordinationInngestFunction(runtime as WorkflowRuntimeInput<CoordinationRuntimeAdapter>).functions;
  },
});

export type CoordinationWorkflowPluginRegistration = AsyncWorkflowPlugin<
  "coordination",
  typeof coordinationWorkflowContract,
  ReturnType<typeof createCoordinationWorkflowRouter>,
  WorkflowRuntimeInput<CoordinationRuntimeAdapter>,
  unknown,
  CoordinationWorkflowPluginBound
>;
