import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { coordinationContract } from "@rawr/coordination";
import { createFirstPartyRpcLink } from "@rawr/orpc-client";
import { stateContract } from "@rawr/state";
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
  coordination: createORPCClient<ContractRouterClient<typeof coordinationContract>>(
    createFirstPartyRpcLink({
      url: resolveRpcUrl(),
    }),
  ),
  state: createORPCClient<ContractRouterClient<typeof stateContract>>(
    createFirstPartyRpcLink({
      url: resolveRpcUrl(),
    }),
  ),
} as const;
