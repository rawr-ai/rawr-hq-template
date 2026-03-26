import {
  defineServerApiPlugin,
  type ServerApiPlugin,
} from "@rawr/hq-sdk/plugins";
import type { StateClientResolver } from "./context";
import { stateApiContract } from "./contract";
import { createStateRouter } from "./router";

export type StateApiPluginBound = Readonly<{
  resolveClient: StateClientResolver;
}>;

export const stateApiPlugin = defineServerApiPlugin<"state", StateApiPluginBound, { resolveClient: StateClientResolver }, typeof stateApiContract, ReturnType<typeof createStateRouter>>({
  capability: "state",
  exposure: {
    internal: {
      contract: stateApiContract,
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
        router: createStateRouter(resources.resolveClient),
      },
    };
  },
});

export type StateApiPluginRegistration = ServerApiPlugin<
  "state",
  typeof stateApiContract,
  ReturnType<typeof createStateRouter>,
  StateApiPluginBound
>;
