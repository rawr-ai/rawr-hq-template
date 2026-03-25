import {
  defineApiPlugin,
  defineApiPluginDeclaration,
  type ApiPluginContribution,
} from "@rawr/hq-sdk/apis";
import type { CoordinationWorkflowClientResolver } from "./context";
import { coordinationApiContract } from "./contract";
import { createCoordinationApiRouter } from "./router";

export {
  createCoordinationApiRouter,
  type CoordinationApiContext,
  type CoordinationWorkflowClientResolver,
  type CoordinationApiRouter,
} from "./router";

export type CoordinationApiPluginBound = Readonly<{
  resolveClient: CoordinationWorkflowClientResolver;
}>;

const coordinationApiDeclaration = defineApiPluginDeclaration({
  internal: {
    contract: coordinationApiContract,
  },
});

function contributeCoordinationApiPlugin(
  bound: CoordinationApiPluginBound,
): ApiPluginContribution<typeof coordinationApiContract, ReturnType<typeof createCoordinationApiRouter>> {
  return {
    internal: {
      contract: coordinationApiDeclaration.internal.contract,
      router: createCoordinationApiRouter(bound.resolveClient),
    },
  };
}

export function registerCoordinationApiPlugin() {
  return defineApiPlugin({
    declaration: coordinationApiDeclaration,
    contribute: contributeCoordinationApiPlugin,
  });
}

export type CoordinationApiPluginRegistration = ReturnType<typeof registerCoordinationApiPlugin>;
