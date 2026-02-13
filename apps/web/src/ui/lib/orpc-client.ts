import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { hqContract } from "@rawr/core/orpc";
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
  new RPCLink({
    url: resolveRpcUrl(),
  }),
);
