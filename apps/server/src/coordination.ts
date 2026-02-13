import {
  appendRunTimelineEvent,
  coordinationFailure,
  coordinationSuccess,
  ensureCoordinationStorage,
  getRunStatus,
  getRunTimeline,
  getWorkflow,
  isSafeCoordinationId,
  listWorkflows,
  readDeskMemory,
  saveRunStatus,
  saveWorkflow,
  validateWorkflow,
  validationFailure,
  writeDeskMemory,
  type CoordinationWorkflowV1,
  type JsonValue,
  type RunStatusV1,
} from "@rawr/coordination/node";
import {
  queueCoordinationRunWithInngest,
  type CoordinationRuntimeAdapter,
} from "@rawr/coordination-inngest";
import { createDeskEvent, defaultTraceLinks } from "@rawr/coordination-observability";
import type { Inngest } from "inngest";
import type { AnyElysia } from "./plugins";

type CoordinationRoutesOptions = {
  repoRoot: string;
  baseUrl: string;
  inngestClient: Inngest;
  runtime: CoordinationRuntimeAdapter;
};

type RequestWithWorkflow = {
  workflow?: CoordinationWorkflowV1;
  input?: JsonValue;
  runId?: string;
};

type ParsedRunId =
  | {
      ok: true;
      runId: string;
    }
  | {
      ok: false;
      message: string;
      value: unknown;
    };

async function tryReadJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = (await request.json()) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function asWorkflow(payload: Record<string, unknown>): CoordinationWorkflowV1 | null {
  const workflow = payload.workflow as CoordinationWorkflowV1 | undefined;
  if (!workflow || typeof workflow !== "object") return null;
  return workflow;
}

function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function failureResponse(
  status: number,
  input: {
    code: string;
    message: string;
    retriable?: boolean;
    details?: JsonValue;
  },
): Response {
  return new Response(
    JSON.stringify(
      coordinationFailure({
        code: input.code,
        message: input.message,
        retriable: input.retriable ?? false,
        details: input.details,
      }),
    ),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );
}

function badRequest(input: { code: string; message: string; details?: JsonValue }): Response {
  return failureResponse(400, { ...input, retriable: false });
}

function notFound(input: { code: string; message: string; details?: JsonValue }): Response {
  return failureResponse(404, { ...input, retriable: false });
}

function internalError(input: {
  code: string;
  message: string;
  details?: JsonValue;
  retriable?: boolean;
}): Response {
  return failureResponse(500, { ...input, retriable: input.retriable ?? true });
}

function parseWorkflowId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return isSafeCoordinationId(trimmed) ? trimmed : null;
}

function parseRunId(value: unknown): ParsedRunId {
  if (value === undefined || value === null) return { ok: true, runId: generateRunId() };
  if (typeof value !== "string") {
    return { ok: false, message: "runId must be a string when provided", value };
  }
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, runId: generateRunId() };
  if (!isSafeCoordinationId(trimmed)) {
    return { ok: false, message: `Invalid runId format: ${trimmed}`, value: trimmed };
  }
  return { ok: true, runId: trimmed };
}

export function createCoordinationRuntimeAdapter(input: {
  repoRoot: string;
  inngestBaseUrl?: string;
}): CoordinationRuntimeAdapter {
  return {
    readMemory: async (workflow, deskId) => {
      const record = await readDeskMemory(input.repoRoot, workflow.workflowId, workflow.version, deskId);
      return record?.data ?? null;
    },
    writeMemory: async (workflow, desk, value) => {
      await writeDeskMemory(
        input.repoRoot,
        workflow.workflowId,
        workflow.version,
        desk.deskId,
        "default",
        value,
        desk.memoryScope.ttlSeconds,
      );
    },
    getRunStatus: async (runId) => getRunStatus(input.repoRoot, runId),
    saveRunStatus: async (run) => {
      await saveRunStatus(input.repoRoot, run);
    },
    appendTimeline: async (runId, event) => {
      await appendRunTimelineEvent(input.repoRoot, runId, event);
    },
    inngestBaseUrl: input.inngestBaseUrl,
  };
}

export function registerCoordinationRoutes<TApp extends AnyElysia>(app: TApp, opts: CoordinationRoutesOptions): TApp {
  app.get("/rawr/coordination/workflows", async () => {
    await ensureCoordinationStorage(opts.repoRoot);
    const workflows = await listWorkflows(opts.repoRoot);
    return coordinationSuccess({ workflows });
  });

  app.post("/rawr/coordination/workflows", async ({ request }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const payload = await tryReadJson(request);
    const workflow = asWorkflow(payload);

    if (!workflow) {
      return badRequest({
        code: "MISSING_WORKFLOW_PAYLOAD",
        message: "Missing workflow payload",
      });
    }

    const validation = validateWorkflow(workflow);
    if (!validation.ok) {
      return new Response(JSON.stringify(validationFailure(validation)), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await saveWorkflow(opts.repoRoot, workflow);
    return coordinationSuccess({ workflow });
  });

  app.get("/rawr/coordination/workflows/:id", async ({ params }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const rawWorkflowId = (params as { id?: unknown }).id;
    const workflowId = parseWorkflowId(rawWorkflowId);
    if (!workflowId) {
      return badRequest({
        code: "INVALID_WORKFLOW_ID",
        message: "Invalid workflowId format",
        details: { workflowId: typeof rawWorkflowId === "string" ? rawWorkflowId : null },
      });
    }

    const workflow = await getWorkflow(opts.repoRoot, workflowId);
    if (!workflow) {
      return notFound({
        code: "WORKFLOW_NOT_FOUND",
        message: "workflow not found",
        details: { workflowId },
      });
    }

    return coordinationSuccess({ workflow });
  });

  app.post("/rawr/coordination/workflows/:id/validate", async ({ params }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const rawWorkflowId = (params as { id?: unknown }).id;
    const workflowId = parseWorkflowId(rawWorkflowId);
    if (!workflowId) {
      return badRequest({
        code: "INVALID_WORKFLOW_ID",
        message: "Invalid workflowId format",
        details: { workflowId: typeof rawWorkflowId === "string" ? rawWorkflowId : null },
      });
    }

    const workflow = await getWorkflow(opts.repoRoot, workflowId);
    if (!workflow) {
      return notFound({
        code: "WORKFLOW_NOT_FOUND",
        message: "workflow not found",
        details: { workflowId },
      });
    }

    return coordinationSuccess({
      workflowId,
      validation: validateWorkflow(workflow),
    });
  });

  app.post("/rawr/coordination/workflows/:id/run", async ({ params, request }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const rawWorkflowId = (params as { id?: unknown }).id;
    const workflowId = parseWorkflowId(rawWorkflowId);
    if (!workflowId) {
      return badRequest({
        code: "INVALID_WORKFLOW_ID",
        message: "Invalid workflowId format",
        details: { workflowId: typeof rawWorkflowId === "string" ? rawWorkflowId : null },
      });
    }

    const payload = (await tryReadJson(request)) as RequestWithWorkflow;
    const workflow = await getWorkflow(opts.repoRoot, workflowId);
    if (!workflow) {
      return notFound({
        code: "WORKFLOW_NOT_FOUND",
        message: "workflow not found",
        details: { workflowId },
      });
    }

    const parsedRunId = parseRunId(payload.runId);
    if (!parsedRunId.ok) {
      return badRequest({
        code: "INVALID_RUN_ID",
        message: parsedRunId.message,
        details: { runId: typeof parsedRunId.value === "string" ? parsedRunId.value : null },
      });
    }
    const runId = parsedRunId.runId;

    try {
      const result = await queueCoordinationRunWithInngest({
        client: opts.inngestClient,
        runtime: opts.runtime,
        workflow,
        runId,
        input: toJsonValue(payload.input ?? {}),
        baseUrl: opts.baseUrl,
      });

      return coordinationSuccess({
        run: result.run,
        eventIds: result.eventIds,
      });
    } catch (err) {
      const failedAt = new Date().toISOString();
      const failedRun: RunStatusV1 = {
        runId,
        workflowId,
        workflowVersion: workflow.version,
        status: "failed",
        startedAt: failedAt,
        finishedAt: failedAt,
        input: toJsonValue(payload.input ?? {}),
        error: err instanceof Error ? err.message : String(err),
        traceLinks: defaultTraceLinks(opts.baseUrl, runId, {
          inngestBaseUrl: opts.runtime.inngestBaseUrl,
        }),
      };

      try {
        await opts.runtime.saveRunStatus(failedRun);
        await opts.runtime.appendTimeline(
          runId,
          createDeskEvent({
            runId,
            workflowId,
            type: "run.failed",
            status: "failed",
            detail: failedRun.error,
            payload: failedRun.input,
          }),
        );
      } catch {
        // Preserve original queue failure response even if failure persistence fails.
      }

      return internalError({
        code: "RUN_QUEUE_FAILED",
        message: failedRun.error ?? "Workflow run failed",
        retriable: true,
        details: toJsonValue({ run: failedRun }),
      });
    }
  });

  app.get("/rawr/coordination/runs/:runId", async ({ params }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const rawRunId = (params as { runId?: unknown }).runId;
    const runId = parseWorkflowId(rawRunId);
    if (!runId) {
      return badRequest({
        code: "INVALID_RUN_ID",
        message: "Invalid runId format",
        details: { runId: typeof rawRunId === "string" ? rawRunId : null },
      });
    }

    const run = await getRunStatus(opts.repoRoot, runId);
    if (!run) {
      return notFound({
        code: "RUN_NOT_FOUND",
        message: "run not found",
        details: { runId },
      });
    }

    return coordinationSuccess({ run });
  });

  app.get("/rawr/coordination/runs/:runId/timeline", async ({ params }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const rawRunId = (params as { runId?: unknown }).runId;
    const runId = parseWorkflowId(rawRunId);
    if (!runId) {
      return badRequest({
        code: "INVALID_RUN_ID",
        message: "Invalid runId format",
        details: { runId: typeof rawRunId === "string" ? rawRunId : null },
      });
    }

    const run = await getRunStatus(opts.repoRoot, runId);
    if (!run) {
      return notFound({
        code: "RUN_NOT_FOUND",
        message: "run not found",
        details: { runId },
      });
    }

    const timeline = await getRunTimeline(opts.repoRoot, runId);
    return coordinationSuccess({ runId, timeline });
  });

  return app;
}
