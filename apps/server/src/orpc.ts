import {
  appendRunTimelineEvent,
  ensureCoordinationStorage,
  getRunStatus,
  getRunTimeline,
  getWorkflow,
  isSafeCoordinationId,
  listWorkflows,
  saveRunStatus,
  saveWorkflow,
  validateWorkflow,
  type JsonValue,
  type RunStatusV1,
} from "@rawr/coordination/node";
import { queueCoordinationRunWithInngest } from "@rawr/coordination-inngest";
import { createDeskEvent, defaultTraceLinks } from "@rawr/coordination-observability";
import { hqContract } from "@rawr/core/orpc";
import { getRepoState } from "@rawr/state";
import { OpenAPIGenerator, type ConditionalSchemaConverter, type JSONSchema } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { implement } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import type { AnyElysia } from "./plugins";
import {
  createRequestScopedBoundaryContext,
  type RawrBoundaryContext,
  type RawrBoundaryContextDeps,
} from "./workflows/context";

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

type RawrOrpcContext = RawrBoundaryContext;

export type RegisterOrpcRoutesOptions = RawrBoundaryContextDeps & {
  contextFactory?: (request: Request, deps: RawrBoundaryContextDeps) => RawrOrpcContext;
  onContextCreated?: (context: RawrOrpcContext) => void;
};

function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function parseCoordinationId(value: unknown): string | null {
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

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function badRequest(code: string, message: string, data?: unknown): never {
  throw new ORPCError(code, {
    status: 400,
    message,
    data,
  });
}

function notFound(code: string, message: string, data?: unknown): never {
  throw new ORPCError(code, {
    status: 404,
    message,
    data,
  });
}

function internalError(code: string, message: string, data?: unknown): never {
  throw new ORPCError(code, {
    status: 500,
    message,
    data,
  });
}

export function createOrpcRouter() {
  const os = implement<typeof hqContract, RawrOrpcContext>(hqContract);

  return os.router({
    coordination: os.coordination.router({
      listWorkflows: os.coordination.listWorkflows.handler(async ({ context }) => {
        await ensureCoordinationStorage(context.repoRoot);
        const workflows = await listWorkflows(context.repoRoot);
        return { workflows };
      }),

      saveWorkflow: os.coordination.saveWorkflow.handler(async ({ context, input }) => {
        await ensureCoordinationStorage(context.repoRoot);
        const validation = validateWorkflow(input.workflow);
        if (!validation.ok) {
          badRequest("WORKFLOW_VALIDATION_FAILED", "Workflow validation failed", validation);
        }

        await saveWorkflow(context.repoRoot, input.workflow);
        return { workflow: input.workflow };
      }),

      getWorkflow: os.coordination.getWorkflow.handler(async ({ context, input }) => {
        await ensureCoordinationStorage(context.repoRoot);
        const workflowId = parseCoordinationId(input.workflowId);
        if (!workflowId) {
          badRequest("INVALID_WORKFLOW_ID", "Invalid workflowId format", {
            workflowId: typeof input.workflowId === "string" ? input.workflowId : null,
          });
        }

        const workflow = await getWorkflow(context.repoRoot, workflowId);
        if (!workflow) {
          notFound("WORKFLOW_NOT_FOUND", "workflow not found", { workflowId });
        }

        return { workflow };
      }),

      validateWorkflow: os.coordination.validateWorkflow.handler(async ({ context, input }) => {
        await ensureCoordinationStorage(context.repoRoot);
        const workflowId = parseCoordinationId(input.workflowId);
        if (!workflowId) {
          badRequest("INVALID_WORKFLOW_ID", "Invalid workflowId format", {
            workflowId: typeof input.workflowId === "string" ? input.workflowId : null,
          });
        }

        const workflow = await getWorkflow(context.repoRoot, workflowId);
        if (!workflow) {
          notFound("WORKFLOW_NOT_FOUND", "workflow not found", { workflowId });
        }

        return {
          workflowId,
          validation: validateWorkflow(workflow),
        };
      }),

      queueRun: os.coordination.queueRun.handler(async ({ context, input }) => {
        await ensureCoordinationStorage(context.repoRoot);
        const workflowId = parseCoordinationId(input.workflowId);
        if (!workflowId) {
          badRequest("INVALID_WORKFLOW_ID", "Invalid workflowId format", {
            workflowId: typeof input.workflowId === "string" ? input.workflowId : null,
          });
        }

        const workflow = await getWorkflow(context.repoRoot, workflowId);
        if (!workflow) {
          notFound("WORKFLOW_NOT_FOUND", "workflow not found", { workflowId });
        }

        const parsedRunId = parseRunId(input.runId);
        if (!parsedRunId.ok) {
          badRequest("INVALID_RUN_ID", parsedRunId.message, {
            runId: typeof parsedRunId.value === "string" ? parsedRunId.value : null,
          });
        }

        const runId = parsedRunId.runId;

        try {
          const result = await queueCoordinationRunWithInngest({
            client: context.inngestClient,
            runtime: context.runtime,
            workflow,
            runId,
            input: toJsonValue(input.input ?? {}),
            baseUrl: context.baseUrl,
          });

          return {
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
            input: toJsonValue(input.input ?? {}),
            error: err instanceof Error ? err.message : String(err),
            traceLinks: defaultTraceLinks(context.baseUrl, runId, {
              inngestBaseUrl: context.runtime.inngestBaseUrl,
            }),
          };

          try {
            await context.runtime.saveRunStatus(failedRun);
            await context.runtime.appendTimeline(
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
            // Preserve original queue failure even if failure persistence fails.
          }

          internalError("RUN_QUEUE_FAILED", failedRun.error ?? "Workflow run failed", { run: failedRun });
        }
      }),

      getRunStatus: os.coordination.getRunStatus.handler(async ({ context, input }) => {
        await ensureCoordinationStorage(context.repoRoot);
        const runId = parseCoordinationId(input.runId);
        if (!runId) {
          badRequest("INVALID_RUN_ID", "Invalid runId format", {
            runId: typeof input.runId === "string" ? input.runId : null,
          });
        }

        const run = await getRunStatus(context.repoRoot, runId);
        if (!run) {
          notFound("RUN_NOT_FOUND", "run not found", { runId });
        }

        return { run };
      }),

      getRunTimeline: os.coordination.getRunTimeline.handler(async ({ context, input }) => {
        await ensureCoordinationStorage(context.repoRoot);
        const runId = parseCoordinationId(input.runId);
        if (!runId) {
          badRequest("INVALID_RUN_ID", "Invalid runId format", {
            runId: typeof input.runId === "string" ? input.runId : null,
          });
        }

        const run = await getRunStatus(context.repoRoot, runId);
        if (!run) {
          notFound("RUN_NOT_FOUND", "run not found", { runId });
        }

        const timeline = await getRunTimeline(context.repoRoot, runId);
        return { runId, timeline };
      }),
    }),

    state: os.state.router({
      getRuntimeState: os.state.getRuntimeState.handler(async ({ context }) => {
        const state = await getRepoState(context.repoRoot);
        return { state };
      }),
    }),
  });
}

async function createOpenApiSpec(router: ReturnType<typeof createOrpcRouter>, baseUrl: string) {
  const typeBoxSchemaConverter: ConditionalSchemaConverter = {
    condition: (schema) => Boolean(schema && typeof schema === "object" && "__typebox" in schema),
    convert: (schema) => {
      const rawSchema = (schema as { __typebox?: unknown }).__typebox;
      if (!rawSchema || typeof rawSchema !== "object") {
        return [false, {}];
      }
      return [true, JSON.parse(JSON.stringify(rawSchema)) as JSONSchema];
    },
  };

  const generator = new OpenAPIGenerator({
    schemaConverters: [typeBoxSchemaConverter],
  });
  return generator.generate(router, {
    info: {
      title: "RAWR HQ ORPC API",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
  });
}

export async function generateOrpcOpenApiSpec(baseUrl: string) {
  return createOpenApiSpec(createOrpcRouter(), baseUrl);
}

export function registerOrpcRoutes<TApp extends AnyElysia>(app: TApp, options: RegisterOrpcRoutesOptions): TApp {
  const router = createOrpcRouter();
  const rpcHandler = new RPCHandler<RawrOrpcContext>(router);
  const openapiHandler = new OpenAPIHandler<RawrOrpcContext>(router);
  const contextDeps: RawrBoundaryContextDeps = {
    repoRoot: options.repoRoot,
    baseUrl: options.baseUrl,
    runtime: options.runtime,
    inngestClient: options.inngestClient,
  };
  const contextFactory = options.contextFactory ?? createRequestScopedBoundaryContext;

  let openapiSpecPromise: Promise<unknown> | undefined;
  const getOpenApiSpec = () => {
    if (!openapiSpecPromise) {
      openapiSpecPromise = createOpenApiSpec(router, options.baseUrl);
    }
    return openapiSpecPromise;
  };

  app.get("/api/orpc/openapi.json", async () => {
    const spec = await getOpenApiSpec();
    return new Response(JSON.stringify(spec), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  });

  app.all(
    "/rpc",
    async (ctx) => {
      const request = ctx.request as Request;
      const context = contextFactory(request, contextDeps);
      options.onContextCreated?.(context);
      const result = await rpcHandler.handle(request, { prefix: "/rpc", context });
      return result.matched ? result.response : new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  app.all(
    "/rpc/*",
    async (ctx) => {
      const request = ctx.request as Request;
      const context = contextFactory(request, contextDeps);
      options.onContextCreated?.(context);
      const result = await rpcHandler.handle(request, { prefix: "/rpc", context });
      return result.matched ? result.response : new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  app.all(
    "/api/orpc",
    async (ctx) => {
      const request = ctx.request as Request;
      const context = contextFactory(request, contextDeps);
      options.onContextCreated?.(context);
      const result = await openapiHandler.handle(request, { prefix: "/api/orpc", context });
      return result.matched ? result.response : new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  app.all(
    "/api/orpc/*",
    async (ctx) => {
      const request = ctx.request as Request;
      const context = contextFactory(request, contextDeps);
      options.onContextCreated?.(context);
      const result = await openapiHandler.handle(request, { prefix: "/api/orpc", context });
      return result.matched ? result.response : new Response("not found", { status: 404 });
    },
    { parse: "none" },
  );

  return app;
}

export type { RawrOrpcContext };
