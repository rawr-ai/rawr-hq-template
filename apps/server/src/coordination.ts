import {
  appendRunTimelineEvent,
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

function badRequest(error: string): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status: 400,
    headers: { "content-type": "application/json" },
  });
}

function parseWorkflowId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return isSafeCoordinationId(trimmed) ? trimmed : null;
}

function parseRunId(value: unknown): { runId?: string; error?: string } {
  if (value === undefined || value === null) return { runId: generateRunId() };
  if (typeof value !== "string") return { error: "runId must be a string when provided" };
  const trimmed = value.trim();
  if (trimmed === "") return { runId: generateRunId() };
  if (!isSafeCoordinationId(trimmed)) {
    return { error: `Invalid runId format: ${trimmed}` };
  }
  return { runId: trimmed };
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
    return { ok: true, workflows };
  });

  app.post("/rawr/coordination/workflows", async ({ request }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const payload = await tryReadJson(request);
    const workflow = asWorkflow(payload);

    if (!workflow) {
      return new Response(JSON.stringify({ ok: false, error: "Missing workflow payload" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const validation = validateWorkflow(workflow);
    if (!validation.ok) {
      return new Response(JSON.stringify({ ok: false, validation }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await saveWorkflow(opts.repoRoot, workflow);
    return { ok: true, workflow };
  });

  app.get("/rawr/coordination/workflows/:id", async ({ params }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const workflowId = parseWorkflowId((params as any).id);
    if (!workflowId) {
      return badRequest("Invalid workflowId format");
    }
    const workflow = await getWorkflow(opts.repoRoot, workflowId);

    if (!workflow) {
      return new Response(JSON.stringify({ ok: false, error: "workflow not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    return { ok: true, workflow };
  });

  app.post("/rawr/coordination/workflows/:id/validate", async ({ params }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const workflowId = parseWorkflowId((params as any).id);
    if (!workflowId) {
      return badRequest("Invalid workflowId format");
    }
    const workflow = await getWorkflow(opts.repoRoot, workflowId);

    if (!workflow) {
      return new Response(JSON.stringify({ ok: false, error: "workflow not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    return {
      ok: true,
      validation: validateWorkflow(workflow),
      workflowId,
    };
  });

  app.post("/rawr/coordination/workflows/:id/run", async ({ params, request }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const workflowId = parseWorkflowId((params as any).id);
    if (!workflowId) {
      return badRequest("Invalid workflowId format");
    }
    const payload = (await tryReadJson(request)) as RequestWithWorkflow;

    const workflow = await getWorkflow(opts.repoRoot, workflowId);
    if (!workflow) {
      return new Response(JSON.stringify({ ok: false, error: "workflow not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const parsedRunId = parseRunId(payload.runId);
    if (!parsedRunId.runId) {
      return badRequest(parsedRunId.error ?? "Invalid runId");
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

      return {
        ok: true,
        run: result.run,
        eventIds: result.eventIds,
      };
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

      return new Response(JSON.stringify({ ok: false, error: failedRun.error, run: failedRun }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  });

  app.get("/rawr/coordination/runs/:runId", async ({ params }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const runId = parseWorkflowId((params as any).runId);
    if (!runId) {
      return badRequest("Invalid runId format");
    }
    const run = await getRunStatus(opts.repoRoot, runId);

    if (!run) {
      return new Response(JSON.stringify({ ok: false, error: "run not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    return { ok: true, run };
  });

  app.get("/rawr/coordination/runs/:runId/timeline", async ({ params }) => {
    await ensureCoordinationStorage(opts.repoRoot);
    const runId = parseWorkflowId((params as any).runId);
    if (!runId) {
      return badRequest("Invalid runId format");
    }
    const run = await getRunStatus(opts.repoRoot, runId);
    if (!run) {
      return new Response(JSON.stringify({ ok: false, error: "run not found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    const timeline = await getRunTimeline(opts.repoRoot, runId);
    return { ok: true, runId, timeline };
  });

  return app;
}
