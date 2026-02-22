import {
  RUN_FINALIZATION_CONTRACT_V1,
  ensureCoordinationStorage,
  getRunStatus,
  getRunTimeline,
  getWorkflow,
  listWorkflows,
  normalizeCoordinationId,
  saveWorkflow,
  validateWorkflow,
  type JsonValue,
  type RunStatusV1,
} from "@rawr/coordination/node";
import { queueCoordinationRunWithInngest, type CoordinationRuntimeAdapter } from "@rawr/coordination-inngest";
import { createDeskEvent, defaultTraceLinks } from "@rawr/coordination-observability";
import { getRepoState } from "@rawr/state";
import { ORPCError, implement } from "@orpc/server";
import type { Inngest } from "inngest";
import { hqContract, workflowTriggerContract } from "./hq-router";

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

export type RuntimeRouterContext = {
  repoRoot: string;
  baseUrl: string;
  runtime: CoordinationRuntimeAdapter;
  inngestClient: Inngest;
};

type CoordinationContractImplementation<Context extends RuntimeRouterContext> = ReturnType<
  typeof implement<typeof hqContract, Context>
>["coordination"];

function toJsonValue(value: unknown): JsonValue {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function parseCoordinationId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return normalizeCoordinationId(value);
}

function parseRunId(value: unknown): ParsedRunId {
  if (value === undefined || value === null) return { ok: true, runId: generateRunId() };
  if (typeof value !== "string") {
    return { ok: false, message: "runId must be a string when provided", value };
  }

  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, runId: generateRunId() };
  const normalized = normalizeCoordinationId(value);
  if (!normalized) {
    return { ok: false, message: `Invalid runId format: ${trimmed}`, value: trimmed };
  }
  return { ok: true, runId: normalized };
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

function createCoordinationProcedures<Context extends RuntimeRouterContext>(
  coordination: CoordinationContractImplementation<Context>,
) {
  return {
    listWorkflows: coordination.listWorkflows.handler(async ({ context }) => {
      await ensureCoordinationStorage(context.repoRoot);
      const workflows = await listWorkflows(context.repoRoot);
      return { workflows };
    }),

    saveWorkflow: coordination.saveWorkflow.handler(async ({ context, input }) => {
      await ensureCoordinationStorage(context.repoRoot);
      const validation = validateWorkflow(input.workflow);
      if (!validation.ok) {
        badRequest("WORKFLOW_VALIDATION_FAILED", "Workflow validation failed", validation);
      }

      await saveWorkflow(context.repoRoot, input.workflow);
      return { workflow: input.workflow };
    }),

    getWorkflow: coordination.getWorkflow.handler(async ({ context, input }) => {
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

    validateWorkflow: coordination.validateWorkflow.handler(async ({ context, input }) => {
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

    queueRun: coordination.queueRun.handler(async ({ context, input }) => {
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
          finalization: {
            contract: RUN_FINALIZATION_CONTRACT_V1,
          },
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

    getRunStatus: coordination.getRunStatus.handler(async ({ context, input }) => {
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

    getRunTimeline: coordination.getRunTimeline.handler(async ({ context, input }) => {
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
  };
}

export function createHqRuntimeRouter<Context extends RuntimeRouterContext = RuntimeRouterContext>() {
  const os = implement<typeof hqContract, Context>(hqContract);

  return os.router({
    coordination: os.coordination.router(createCoordinationProcedures(os.coordination)),

    state: os.state.router({
      getRuntimeState: os.state.getRuntimeState.handler(async ({ context }) => {
        const state = await getRepoState(context.repoRoot);
        return { state, authorityRepoRoot: context.repoRoot };
      }),
    }),
  });
}

export function createWorkflowTriggerRuntimeRouter<Context extends RuntimeRouterContext = RuntimeRouterContext>() {
  const os = implement<typeof workflowTriggerContract, Context>(workflowTriggerContract);

  return os.router({
    coordination: os.coordination.router(createCoordinationProcedures(os.coordination)),
  });
}
