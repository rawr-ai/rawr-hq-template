import {
  defineApiPlugin,
  defineApiPluginDeclaration,
  type ApiPluginContribution,
} from "@rawr/hq-sdk/apis";
import type { StateClientResolver } from "./context";
import { stateApiContract } from "./contract";
import { createStateRouter } from "./router";

export {
  type StateApiContext,
  type StateClientResolver,
} from "./context";
export { createStateRouter, type StateApiRouter } from "./router";

export type StateApiPluginBound = Readonly<{
  resolveClient: StateClientResolver;
}>;

const stateApiDeclaration = defineApiPluginDeclaration({
  internal: {
    contract: stateApiContract,
  },
});

function contributeStateApiPlugin(
  bound: StateApiPluginBound,
): ApiPluginContribution<typeof stateApiContract, ReturnType<typeof createStateRouter>> {
  return {
    internal: {
      contract: stateApiDeclaration.internal.contract,
      router: createStateRouter(bound.resolveClient),
    },
  };
}

export function registerStateApiPlugin() {
  return defineApiPlugin({
    declaration: stateApiDeclaration,
    contribute: contributeStateApiPlugin,
  });
}

export type StateApiPluginRegistration = ReturnType<typeof registerStateApiPlugin>;
