import { ORPCError, createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ContractRouterClient } from "@orpc/contract";
import { hqContract } from "@rawr/core/orpc";
import type {
  CoordinationWorkflowV1,
  JsonValue,
} from "@rawr/coordination";
import { publicEnv } from "../../config/publicEnv";

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

const hqClient = createORPCClient<ContractRouterClient<typeof hqContract>>(
  new RPCLink({
    url: resolveRpcUrl(),
  }),
);

export function coordinationClientErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ORPCError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function listWorkflows() {
  return hqClient.coordination.listWorkflows({});
}

export function saveWorkflow(workflow: CoordinationWorkflowV1) {
  return hqClient.coordination.saveWorkflow({ workflow });
}

export function validateWorkflowById(workflowId: string) {
  return hqClient.coordination.validateWorkflow({ workflowId });
}

export function runWorkflowById(workflowId: string, input: JsonValue) {
  return hqClient.coordination.queueRun({ workflowId, input });
}

export function getRunStatus(runId: string) {
  return hqClient.coordination.getRunStatus({ runId });
}

export function getRunTimeline(runId: string) {
  return hqClient.coordination.getRunTimeline({ runId });
}
