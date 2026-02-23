import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { hqContract } from "@rawr/core/orpc";
import { createFirstPartyRpcLink } from "@rawr/orpc-client";
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

export const hqClient = createORPCClient<ContractRouterClient<typeof hqContract>>(
  createFirstPartyRpcLink({
    url: resolveRpcUrl(),
  }),
);
