import { createCoordinationApiClient } from "@rawr/plugin-api-coordination";
import { createCoordinationWorkflowClient } from "@rawr/plugin-workflows-coordination/client";
import { createFirstPartyRpcLink } from "@rawr/orpc-client";
import { createStateApiClient } from "@rawr/plugin-api-state";
import { publicEnv } from "../config/publicEnv";

function resolveRpcUrl(): string {
  const envUrl = publicEnv.rpcUrl;
  if (typeof envUrl === "string" && envUrl.trim() !== "") {
    return envUrl.trim();
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}/rpc`;
  }
  return "http://localhost:3000/rpc";
}

export const hqClient = {
  coordinationApi: createCoordinationApiClient(
    createFirstPartyRpcLink({
      url: resolveRpcUrl(),
    }),
  ),
  coordinationWorkflow: createCoordinationWorkflowClient(
    createFirstPartyRpcLink({
      url: resolveRpcUrl(),
    }),
  ),
  state: createStateApiClient(
    createFirstPartyRpcLink({
      url: resolveRpcUrl(),
    }),
  ),
} as const;
