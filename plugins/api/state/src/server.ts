import { defineApiPlugin } from "@rawr/hq-sdk/apis";
import type { StateClientResolver } from "./context";
import { stateApiContract } from "./contract";
import { createStateRouter } from "./router";

export {
  type StateApiContext,
  type StateClientResolver,
} from "./context";
export { createStateRouter, type StateApiRouter } from "./router";

export function registerStateApiPlugin(input: {
  resolveClient: StateClientResolver;
}) {
  return defineApiPlugin({
    internal: {
      contract: stateApiContract,
      router: createStateRouter(input.resolveClient),
    },
  });
}

export type StateApiPluginRegistration = ReturnType<typeof registerStateApiPlugin>;
