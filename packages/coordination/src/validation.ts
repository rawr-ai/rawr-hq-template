import {
  DESK_KINDS_V1,
  type CoordinationWorkflowV1,
  type JsonSchemaV1,
  type ValidationErrorV1,
  type ValidationResultV1,
} from "./types";
import { deskMap, hasCycle, incomingAdjacency, reachableFromEntry } from "./graph";
import { isSafeCoordinationId } from "./ids";

function isSchemaAssignable(outputSchema: JsonSchemaV1, inputSchema: JsonSchemaV1): boolean {
  if (!inputSchema.type) return true;
  if (!outputSchema.type) return false;

  const outputType = outputSchema.type;
  const inputType = inputSchema.type;

  if (!(outputType === inputType || (outputType === "integer" && inputType === "number"))) {
    return false;
  }

  if (inputType === "object") {
    const inputRequired = inputSchema.required ?? [];
    const inputProperties = inputSchema.properties ?? {};
    const outputProperties = outputSchema.properties ?? {};

    for (const requiredKey of inputRequired) {
      const needed = inputProperties[requiredKey];
      const provided = outputProperties[requiredKey];
      if (!needed || !provided) return false;
      if (!isSchemaAssignable(provided, needed)) return false;
    }
  }

  if (inputType === "array" && inputSchema.items) {
    if (!outputSchema.items) return false;
    if (!isSchemaAssignable(outputSchema.items, inputSchema.items)) return false;
  }

  return true;
}

function add(errors: ValidationErrorV1[], error: ValidationErrorV1): void {
  errors.push(error);
}

export function validateWorkflow(workflow: CoordinationWorkflowV1): ValidationResultV1 {
  const errors: ValidationErrorV1[] = [];

  if (!workflow.workflowId || workflow.workflowId.trim() === "") {
    add(errors, {
      code: "MISSING_WORKFLOW_ID",
      message: "Workflow must include a non-empty workflowId",
    });
  } else if (!isSafeCoordinationId(workflow.workflowId)) {
    add(errors, {
      code: "INVALID_WORKFLOW_ID_FORMAT",
      message: `Workflow workflowId contains unsupported characters: ${workflow.workflowId}`,
    });
  }

  const desks = deskMap(workflow);
  if (!desks.has(workflow.entryDeskId)) {
    add(errors, {
      code: "MISSING_ENTRY_DESK",
      message: `Entry desk ${workflow.entryDeskId} is missing from desks[]`,
      deskId: workflow.entryDeskId,
    });
  }

  const seenDeskIds = new Set<string>();
  for (const desk of workflow.desks) {
    if (seenDeskIds.has(desk.deskId)) {
      add(errors, {
        code: "DUPLICATE_DESK_ID",
        message: `Duplicate deskId detected: ${desk.deskId}`,
        deskId: desk.deskId,
      });
    }
    seenDeskIds.add(desk.deskId);

    if (!isSafeCoordinationId(desk.deskId)) {
      add(errors, {
        code: "INVALID_DESK_ID_FORMAT",
        message: `Desk id contains unsupported characters: ${desk.deskId}`,
        deskId: desk.deskId,
      });
    }

    if (!desk.memoryScope || typeof desk.memoryScope.persist !== "boolean") {
      add(errors, {
        code: "INVALID_MEMORY_SCOPE",
        message: `Desk ${desk.deskId} has an invalid memoryScope (persist must be boolean)`,
        deskId: desk.deskId,
      });
    } else if (
      desk.memoryScope.ttlSeconds !== undefined
      && (!Number.isInteger(desk.memoryScope.ttlSeconds) || desk.memoryScope.ttlSeconds <= 0)
    ) {
      add(errors, {
        code: "INVALID_MEMORY_SCOPE",
        message: `Desk ${desk.deskId} has invalid ttlSeconds; expected positive integer`,
        deskId: desk.deskId,
      });
    }

    if (!DESK_KINDS_V1.includes(desk.kind as any)) {
      add(errors, {
        code: "UNKNOWN_DESK_KIND",
        message: `Unknown desk kind for ${desk.deskId}: ${desk.kind}`,
        deskId: desk.deskId,
      });
    }
  }

  for (const handoff of workflow.handoffs) {
    if (!isSafeCoordinationId(handoff.handoffId)) {
      add(errors, {
        code: "INVALID_HANDOFF_ID_FORMAT",
        message: `Handoff id contains unsupported characters: ${handoff.handoffId}`,
        handoffId: handoff.handoffId,
      });
    }

    if (!desks.has(handoff.fromDeskId)) {
      add(errors, {
        code: "EDGE_UNKNOWN_SOURCE",
        message: `Handoff ${handoff.handoffId} source desk does not exist: ${handoff.fromDeskId}`,
        handoffId: handoff.handoffId,
        deskId: handoff.fromDeskId,
      });
      continue;
    }

    if (!desks.has(handoff.toDeskId)) {
      add(errors, {
        code: "EDGE_UNKNOWN_TARGET",
        message: `Handoff ${handoff.handoffId} target desk does not exist: ${handoff.toDeskId}`,
        handoffId: handoff.handoffId,
        deskId: handoff.toDeskId,
      });
      continue;
    }

    const source = desks.get(handoff.fromDeskId)!;
    const target = desks.get(handoff.toDeskId)!;
    if (!isSchemaAssignable(source.outputSchema, target.inputSchema)) {
      add(errors, {
        code: "INCOMPATIBLE_HANDOFF",
        message: `Handoff ${handoff.handoffId} is incompatible: ${source.deskId} output does not satisfy ${target.deskId} input`,
        handoffId: handoff.handoffId,
      });
    }
  }

  const incoming = incomingAdjacency(workflow);
  for (const desk of workflow.desks) {
    const inboundCount = (incoming.get(desk.deskId) ?? []).length;
    if (inboundCount > 1 && desk.kind !== "desk:join") {
      add(errors, {
        code: "ILLEGAL_FAN_IN_WITHOUT_JOIN",
        message: `Desk ${desk.deskId} has ${inboundCount} inbound handoffs and must be kind desk:join`,
        deskId: desk.deskId,
      });
    }
  }

  if (hasCycle(workflow)) {
    add(errors, {
      code: "CYCLE_DETECTED",
      message: "Workflow graph contains a cycle",
    });
  }

  const reachable = reachableFromEntry(workflow);
  for (const desk of workflow.desks) {
    if (!reachable.has(desk.deskId)) {
      add(errors, {
        code: "DISCONNECTED_DESK",
        message: `Desk ${desk.deskId} is not reachable from entry desk ${workflow.entryDeskId}`,
        deskId: desk.deskId,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
