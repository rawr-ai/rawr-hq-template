import { defineApiPlugin } from "@rawr/hq-sdk/apis";
import type { CoordinationAuthoringClientResolver } from "./context";
import { coordinationApiContract } from "./contract";
import { createCoordinationApiRouter } from "./router";

export {
  createCoordinationApiRouter,
  type CoordinationApiContext,
  type CoordinationAuthoringClientResolver,
  type CoordinationApiRouter,
} from "./router";

export function registerCoordinationApiPlugin(input: {
  resolveClient: CoordinationAuthoringClientResolver;
}) {
  return defineApiPlugin({
    internal: {
      contract: coordinationApiContract,
      router: createCoordinationApiRouter(input.resolveClient),
    },
  });
}

export type CoordinationApiPluginRegistration = ReturnType<typeof registerCoordinationApiPlugin>;
