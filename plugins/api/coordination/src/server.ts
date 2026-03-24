import { defineApiPlugin } from "@rawr/hq-sdk/apis";
import { coordinationApiContract } from "./contract";
import { createCoordinationApiRouter } from "./router";

export {
  createCoordinationApiRouter,
  type CoordinationApiContext,
  type CoordinationApiRouter,
} from "./router";

export function registerCoordinationApiPlugin() {
  return defineApiPlugin({
    namespace: "orpc" as const,
    internal: {
      contract: coordinationApiContract,
      router: createCoordinationApiRouter(),
    },
  });
}

export type CoordinationApiPluginRegistration = ReturnType<typeof registerCoordinationApiPlugin>;
