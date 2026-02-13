import type {
  CoordinationWorkflowV1,
  RunStatusV1,
  ValidationResultV1,
} from "@rawr/coordination";
import {
  COORDINATION_RUN_EVENT,
  fromWorkflowKitWorkflow,
  toWorkflowKitWorkflow,
} from "@rawr/coordination-inngest/browser";
import type { Workflow as WorkflowKitWorkflow } from "@inngest/workflow-kit";
import type {
  RunActionState,
  StatusKind,
  WorkflowEdgeModel,
  WorkflowNodeModel,
} from "../types/workflow";

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

export function statusForRunState(status: string): StatusKind {
  if (status === "completed" || status === "ok") return "success";
  if (status === "running" || status === "queued" || status === "pending") return "warning";
  if (status === "failed" || status === "error") return "error";
  return "neutral";
}

function iconForDeskKind(kind: string): string {
  if (kind === "desk:analysis") return "inbox";
  if (kind === "desk:execution") return "cpu";
  return "play";
}

export function workflowGraph(workflow: CoordinationWorkflowV1): {
  nodes: WorkflowNodeModel[];
  edges: WorkflowEdgeModel[];
  event: string;
} {
  const nodes: WorkflowNodeModel[] = [
    {
      id: `trigger-${workflow.workflowId}`,
      type: "trigger",
      title: COORDINATION_RUN_EVENT,
      subtitle: workflow.description?.trim() || "Coordination and handoff design",
      icon: "zap",
      position: { x: 0, y: 0 },
    },
    ...workflow.desks.map((desk, index) => ({
      id: desk.deskId,
      type: "action" as const,
      title: desk.name,
      subtitle: desk.responsibility,
      icon: iconForDeskKind(desk.kind),
      position: { x: 0, y: index + 1 },
    })),
  ];

  const knownNodeIds = new Set(nodes.map((node) => node.id));
  const edges: WorkflowEdgeModel[] = [];
  const triggerId = `trigger-${workflow.workflowId}`;

  if (workflow.entryDeskId && knownNodeIds.has(workflow.entryDeskId)) {
    edges.push({
      id: `edge-${triggerId}-${workflow.entryDeskId}`,
      source: triggerId,
      target: workflow.entryDeskId,
    });
  }

  for (const handoff of workflow.handoffs) {
    if (!knownNodeIds.has(handoff.fromDeskId) || !knownNodeIds.has(handoff.toDeskId)) {
      continue;
    }

    edges.push({
      id: handoff.handoffId,
      source: handoff.fromDeskId,
      target: handoff.toDeskId,
    });
  }

  return {
    nodes,
    edges,
    event: COORDINATION_RUN_EVENT,
  };
}

export function validationSummary(validation: ValidationResultV1): {
  status: StatusKind;
  label: string;
  message: string;
} {
  if (validation.ok) {
    return {
      status: "success",
      label: "Pass",
      message: "Workflow satisfies validation checks.",
    };
  }

  return {
    status: "warning",
    label: "Fail",
    message: `Validation issues: ${validation.errors.length}`,
  };
}

export function runActionState(input: {
  busy: boolean;
  polling: boolean;
  validationOk: boolean;
  needsSave: boolean;
}): RunActionState {
  if (input.polling) {
    return { disabled: true, label: "Running…" };
  }

  if (input.busy || !input.validationOk) {
    return { disabled: true, label: "Run" };
  }

  if (input.needsSave) {
    return { disabled: false, label: "Save + Run" };
  }

  return { disabled: false, label: "Run" };
}

export function monitorLinkForRun(run: RunStatusV1 | null): string | null {
  if (!run?.traceLinks?.length) return null;
  return run.traceLinks.find((link) => link.provider === "inngest")?.url ?? run.traceLinks[0]?.url ?? null;
}

export function nextBackoffMs(attempt: number): number {
  const base = Math.min(4000, 500 * 2 ** attempt);
  const jitter = 0.75 + Math.random() * 0.5;
  return Math.floor(base * jitter);
}
