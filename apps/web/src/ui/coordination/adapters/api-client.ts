import { ORPCError } from "@orpc/client";
import type {
  CoordinationWorkflowV1,
  JsonValue,
} from "@rawr/coordination";
import { hqClient } from "../../lib/orpc-client";

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
