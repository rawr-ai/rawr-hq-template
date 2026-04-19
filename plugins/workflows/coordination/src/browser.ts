import type { PublicEngineAction, Workflow } from "@inngest/workflow-kit";
import {
  DESK_KINDS_V1,
  type CoordinationWorkflowV1,
  type DeskDefinitionV1,
  type DeskKindV1,
  type JsonSchemaV1,
} from "@rawr/coordination";

export const COORDINATION_RUN_EVENT = "rawr/coordination.workflow.run" as const;

const DEFAULT_OBJECT_SCHEMA: JsonSchemaV1 = {
  type: "object",
  properties: { payload: { type: "string" } },
  required: ["payload"],
};

export const DESK_KIND_META: Record<string, { name: string; description: string }> = {
  "desk:analysis": {
    name: "Analysis Desk",
    description: "Analyze incoming context and produce a structured handoff output.",
  },
  "desk:execution": {
    name: "Execution Desk",
    description: "Perform execution work and emit next-step payloads.",
  },
  "desk:qa": {
    name: "QA Desk",
    description: "Verify output quality, consistency, and acceptance constraints.",
  },
  "desk:join": {
    name: "Join Desk",
    description: "Join multiple upstream outputs into a single coordinated payload.",
  },
  "desk:human-wait": {
    name: "Human Wait Desk",
    description: "Pause automation and wait for human-mediated continuation.",
  },
  "desk:observer": {
    name: "Observer Desk",
    description: "Observe and annotate workflow state without mutating execution flow.",
  },
};

export function coordinationAvailableActions(): PublicEngineAction[] {
  return DESK_KINDS_V1.map((kind) => {
    const meta = DESK_KIND_META[kind];
    return {
      kind,
      name: meta?.name ?? kind,
      description: meta?.description,
      edges: { allowAdd: true },
    };
  });
}

export function toWorkflowKitWorkflow(workflow: CoordinationWorkflowV1): Workflow {
  const sourceEdge = {
    from: "$source",
    to: workflow.entryDeskId,
  };

  return {
    name: workflow.name,
    description: workflow.description,
    metadata: {
      workflowId: workflow.workflowId,
      version: workflow.version,
      entryDeskId: workflow.entryDeskId,
      observabilityProfile: workflow.observabilityProfile,
    },
    actions: workflow.desks.map((desk) => ({
      id: desk.deskId,
      kind: desk.kind,
      name: desk.name,
      description: desk.responsibility,
    })),
    edges: [
      sourceEdge,
      ...workflow.handoffs.map((handoff) => ({
        from: handoff.fromDeskId,
        to: handoff.toDeskId,
      })),
    ],
  };
}

export function fromWorkflowKitWorkflow(input: {
  workflow: Workflow;
  baseWorkflow: CoordinationWorkflowV1;
}): CoordinationWorkflowV1 {
  const { workflow, baseWorkflow } = input;
  const existing = new Map(baseWorkflow.desks.map((desk) => [desk.deskId, desk]));

  const desks = (workflow.actions ?? []).map((action, index) => {
    const prior = existing.get(action.id);
    if (prior) {
      return {
        ...prior,
        kind: action.kind || prior.kind,
        name: action.name || prior.name,
        responsibility: action.description || prior.responsibility,
      };
    }

    const name = action.name || `Desk ${index + 1}`;
    return starterDeskDefinition(action.id, (action.kind || "desk:analysis") as DeskKindV1, name, action.description);
  });

  const handoffs = (workflow.edges ?? [])
    .filter((edge) => edge.from !== "$source" && edge.from !== "$blank" && edge.to !== "$blank")
    .map((edge, index) => ({
      handoffId: `handoff-${edge.from}-${edge.to}-${index + 1}`,
      fromDeskId: edge.from,
      toDeskId: edge.to,
    }));

  const sourceEntry = (workflow.edges ?? []).find((edge) => edge.from === "$source")?.to;
  const fallbackEntry = desks[0]?.deskId ?? baseWorkflow.entryDeskId;

  return {
    ...baseWorkflow,
    name: workflow.name || baseWorkflow.name,
    description: workflow.description || baseWorkflow.description,
    entryDeskId: sourceEntry || fallbackEntry,
    desks,
    handoffs,
  };
}

function starterDeskDefinition(
  deskId: string,
  kind: DeskKindV1,
  name: string,
  responsibility?: string,
): DeskDefinitionV1 {
  return {
    deskId,
    kind,
    name,
    responsibility: responsibility || `Own ${name}`,
    domain: "coordination",
    inputSchema: DEFAULT_OBJECT_SCHEMA,
    outputSchema: DEFAULT_OBJECT_SCHEMA,
    memoryScope: { persist: true, namespace: deskId },
  };
}
