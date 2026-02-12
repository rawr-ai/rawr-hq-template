import {
  coordinationFailure,
  isCoordinationFailure,
  type CoordinationEnvelope,
  type CoordinationFailure,
  type CoordinationWorkflowV1,
  type JsonValue,
  type RunStatusV1,
  type ValidationResultV1,
  type DeskRunEventV1,
} from "@rawr/coordination";

function toJsonValue(value: unknown): JsonValue {
  try {
    return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
  } catch {
    return null;
  }
}

function unexpectedFailure(input: {
  code: string;
  message: string;
  status: number;
  statusText: string;
  path: string;
  raw: string;
}): CoordinationFailure {
  return coordinationFailure({
    code: input.code,
    message: input.message,
    retriable: input.status >= 500,
    details: toJsonValue({
      path: input.path,
      status: input.status,
      statusText: input.statusText,
      raw: input.raw.slice(0, 500),
    }),
  });
}

async function coordinationRequest<TPayload extends Record<string, unknown>>(input: {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
}): Promise<CoordinationEnvelope<TPayload>> {
  const response = await fetch(input.path, {
    method: input.method ?? "GET",
    headers: input.body ? { "content-type": "application/json" } : undefined,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw.trim() !== "") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (parsed && typeof parsed === "object" && "ok" in parsed) {
    const envelope = parsed as { ok?: unknown };
    if (envelope.ok === true) {
      return parsed as CoordinationEnvelope<TPayload>;
    }
    if (envelope.ok === false && isCoordinationFailure(parsed)) {
      return parsed;
    }
  }

  return unexpectedFailure({
    code: "INTERNAL_ERROR",
    message: `Unexpected coordination API response (${response.status} ${response.statusText})`,
    status: response.status,
    statusText: response.statusText,
    path: input.path,
    raw,
  });
}

export function listWorkflows() {
  return coordinationRequest<{ workflows: CoordinationWorkflowV1[] }>({
    path: "/rawr/coordination/workflows",
  });
}

export function saveWorkflow(workflow: CoordinationWorkflowV1) {
  return coordinationRequest<{ workflow: CoordinationWorkflowV1 }>({
    path: "/rawr/coordination/workflows",
    method: "POST",
    body: { workflow },
  });
}

export function validateWorkflowById(workflowId: string) {
  return coordinationRequest<{ workflowId: string; validation: ValidationResultV1 }>({
    path: `/rawr/coordination/workflows/${encodeURIComponent(workflowId)}/validate`,
    method: "POST",
  });
}

export function runWorkflowById(workflowId: string, input: JsonValue) {
  return coordinationRequest<{ run: RunStatusV1; eventIds: string[] }>({
    path: `/rawr/coordination/workflows/${encodeURIComponent(workflowId)}/run`,
    method: "POST",
    body: { input },
  });
}

export function getRunStatus(runId: string) {
  return coordinationRequest<{ run: RunStatusV1 }>({
    path: `/rawr/coordination/runs/${encodeURIComponent(runId)}`,
  });
}

export function getRunTimeline(runId: string) {
  return coordinationRequest<{ runId: string; timeline: DeskRunEventV1[] }>({
    path: `/rawr/coordination/runs/${encodeURIComponent(runId)}/timeline`,
  });
}
