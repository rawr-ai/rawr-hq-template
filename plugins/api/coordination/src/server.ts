import { coordinationApiContract } from "./contract";
import { createCoordinationApiRouter } from "./router";

export {
  createCoordinationApiRouter,
  type CoordinationApiContext,
  type CoordinationApiRouter,
} from "./router";

export function registerCoordinationApiPlugin() {
  return {
    namespace: "orpc" as const,
    internal: {
      contract: coordinationApiContract,
      router: createCoordinationApiRouter(),
    },
  };
}

export type CoordinationApiPluginRegistration = ReturnType<typeof registerCoordinationApiPlugin>;
