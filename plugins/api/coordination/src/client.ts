import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { coordinationApiContract } from "./contract";

type CoordinationApiRootClient = ContractRouterClient<typeof coordinationApiContract>;
export type CoordinationApiClient = CoordinationApiRootClient["coordination"];

export function createCoordinationApiClient(
  link: Parameters<typeof createORPCClient<CoordinationApiRootClient>>[0],
): CoordinationApiClient {
  return createORPCClient<CoordinationApiRootClient>(link).coordination;
}
