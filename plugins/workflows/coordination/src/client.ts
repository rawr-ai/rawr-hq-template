import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import { coordinationWorkflowContract } from "./contract";

type CoordinationWorkflowRootClient = ContractRouterClient<typeof coordinationWorkflowContract>;
export type CoordinationWorkflowClient = CoordinationWorkflowRootClient["coordination"];

export function createCoordinationWorkflowClient(
  link: Parameters<typeof createORPCClient<CoordinationWorkflowRootClient>>[0],
): CoordinationWorkflowClient {
  return createORPCClient<CoordinationWorkflowRootClient>(link).coordination;
}
