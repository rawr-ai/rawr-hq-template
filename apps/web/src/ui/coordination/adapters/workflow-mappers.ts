import type { CoordinationWorkflowV1, RunStatusV1 } from "@rawr/coordination";
import {
  fromWorkflowKitWorkflow,
  toWorkflowKitWorkflow,
} from "@rawr/coordination-inngest/browser";
import type { Workflow as WorkflowKitWorkflow } from "@inngest/workflow-kit";
import type { StatusTone } from "../types/workflow";

export const RUN_TERMINAL_STATES = new Set<RunStatusV1["status"]>(["completed", "failed"]);

export function workflowsEqual(a: CoordinationWorkflowV1, b: CoordinationWorkflowV1): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function toCanvasWorkflow(workflow: CoordinationWorkflowV1): WorkflowKitWorkflow {
  return toWorkflowKitWorkflow(workflow);
}

export function fromCanvasWorkflow(input: {
  workflow: WorkflowKitWorkflow;
  baseWorkflow: CoordinationWorkflowV1;
}): CoordinationWorkflowV1 {
  return fromWorkflowKitWorkflow(input);
}

export function toneForStatus(status: string): StatusTone {
  if (status === "completed" || status === "ok") return "is-success";
  if (status === "running" || status === "queued" || status === "pending") return "is-warning";
  if (status === "failed" || status === "error") return "is-error";
  return "";
}

export function nextBackoffMs(attempt: number): number {
  const base = Math.min(4000, 500 * 2 ** attempt);
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.floor(base * jitter);
}
