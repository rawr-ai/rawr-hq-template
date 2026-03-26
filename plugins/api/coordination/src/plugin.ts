import {
  defineServerApiPlugin,
  type ServerApiPlugin,
} from "@rawr/hq-sdk/plugins";
import type { CoordinationWorkflowClientResolver } from "./context";
import { coordinationApiContract } from "./contract";
import { createCoordinationApiRouter } from "./router";

export type CoordinationApiPluginBound = Readonly<{
  resolveClient: CoordinationWorkflowClientResolver;
}>;

export const coordinationApiPlugin = defineServerApiPlugin<"coordination", CoordinationApiPluginBound, { resolveClient: CoordinationWorkflowClientResolver }, typeof coordinationApiContract, ReturnType<typeof createCoordinationApiRouter>>({
  capability: "coordination",
  exposure: {
    internal: {
      contract: coordinationApiContract,
    },
  },
  resources({ bound }) {
    return {
      resolveClient: bound.resolveClient,
    } as const;
  },
  routes({ resources, exposure }) {
    return {
      internal: {
        contract: exposure.internal.contract,
        router: createCoordinationApiRouter(resources.resolveClient),
      },
    };
  },
});

export type CoordinationApiPluginRegistration = ServerApiPlugin<
  "coordination",
  typeof coordinationApiContract,
  ReturnType<typeof createCoordinationApiRouter>,
  CoordinationApiPluginBound
>;
