import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { stateApiContract } from "./contract";

type StateApiRootClient = ContractRouterClient<typeof stateApiContract>;
export type StateApiClient = StateApiRootClient["state"];

export function createStateApiClient(
  link: Parameters<typeof createORPCClient<StateApiRootClient>>[0],
): StateApiClient {
  return createORPCClient<StateApiRootClient>(link).state;
}
