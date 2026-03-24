import {
  createWorkflowRouterBuilder,
  createWorkflowTraceForwardingOptions,
} from "@rawr/hq-sdk/workflows";
import {
  RUN_FINALIZATION_CONTRACT_V1,
  type DeskRunEventV1,
  normalizeCoordinationId,
  type RunStatusV1,
} from "@rawr/coordination";
import { createStampedDeskEvent } from "@rawr/coordination/events";
import { getRunTimeline } from "@rawr/coordination/node";
import { coordinationWorkflowContract } from "./contract";
import {
  createCoordinationWorkflowAuthoringClient,
  type CoordinationWorkflowContext,
} from "./context";
import { defaultTraceLinks } from "./trace-links";
import { queueCoordinationRunWithInngest } from "./inngest";

const os = createWorkflowRouterBuilder<typeof coordinationWorkflowContract, CoordinationWorkflowContext>(
  coordinationWorkflowContract,
);

export function createCoordinationWorkflowRouter() {
  return os.router({
    coordination: {
      queueRun: os.coordination.queueRun.handler(async ({ context, input, errors }) => {
        const workflowId = normalizeCoordinationId(input.workflowId);
        if (!workflowId) {
          throw errors.INVALID_WORKFLOW_ID({
            message: "Invalid workflowId format",
            data: {
              workflowId: typeof input.workflowId === "string" ? input.workflowId : null,
            },
          });
        }

        const workflow = await createCoordinationWorkflowAuthoringClient(context)
          .getWorkflow(
            { workflowId },
            createWorkflowTraceForwardingOptions(context),
          )
          .then((result) => result.workflow);

        const parsedRunId = parseRunId(input.runId);
        if (!parsedRunId.ok) {
          throw errors.INVALID_RUN_ID({
            message: parsedRunId.message,
            data: {
              runId: typeof parsedRunId.value === "string" ? parsedRunId.value : null,
            },
          });
        }

        const runId = parsedRunId.runId;
        const normalizedInput = toJsonValue(input.input ?? {});

        try {
          return await queueCoordinationRunWithInngest({
            client: context.inngestClient,
            runtime: context.runtime,
            workflow,
            runId,
            input: normalizedInput,
            baseUrl: context.baseUrl,
          });
        } catch (err) {
          const failedRun = createQueueFailureRun({
            runId,
            workflowId,
            workflowVersion: workflow.version,
            input: normalizedInput,
            error: err instanceof Error ? err.message : String(err),
            baseUrl: context.baseUrl,
            inngestBaseUrl: context.runtime.inngestBaseUrl,
          });

          try {
            await persistQueueFailure(context, {
              run: failedRun,
              event: createStampedDeskEvent({
                runId,
                workflowId,
                type: "run.failed",
                status: "failed",
                detail: failedRun.error,
                payload: failedRun.input,
              }),
            });
          } catch {
            // Preserve the original queue failure even if persistence also fails.
          }

          throw errors.RUN_QUEUE_FAILED({
            message: failedRun.error ?? "Workflow run failed",
            data: { run: failedRun },
          });
        }
      }),
      getRunStatus: os.coordination.getRunStatus.handler(async ({ context, input, errors }) => {
        const runId = normalizeCoordinationId(input.runId);
        if (!runId) {
          throw errors.INVALID_RUN_ID({
            message: "Invalid runId format",
            data: {
              runId: typeof input.runId === "string" ? input.runId : null,
            },
          });
        }

        const run = await context.runtime.getRunStatus(runId);
        if (!run) {
          throw errors.RUN_NOT_FOUND({
            message: "run not found",
            data: { runId },
          });
        }

        return { run };
      }),
      getRunTimeline: os.coordination.getRunTimeline.handler(async ({ context, input, errors }) => {
        const runId = normalizeCoordinationId(input.runId);
        if (!runId) {
          throw errors.INVALID_RUN_ID({
            message: "Invalid runId format",
            data: {
              runId: typeof input.runId === "string" ? input.runId : null,
            },
          });
        }

        const run = await context.runtime.getRunStatus(runId);
        if (!run) {
          throw errors.RUN_NOT_FOUND({
            message: "run not found",
            data: { runId },
          });
        }

        return {
          runId,
          timeline: await getRunTimeline(context.repoRoot, runId),
        };
      }),
    },
  });
}

export type CoordinationWorkflowRouter = ReturnType<typeof createCoordinationWorkflowRouter>;

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

function toJsonValue(value: unknown) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value)) as RunStatusV1["input"];
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

function createQueueFailureRun(input: {
  runId: string;
  workflowId: string;
  workflowVersion: number;
  input: RunStatusV1["input"];
  error: string;
  baseUrl: string;
  inngestBaseUrl?: string;
}): RunStatusV1 {
  const failedAt = new Date().toISOString();
  return {
    runId: input.runId,
    workflowId: input.workflowId,
    workflowVersion: input.workflowVersion,
    status: "failed",
    startedAt: failedAt,
    finishedAt: failedAt,
    input: input.input,
    error: input.error,
    traceLinks: defaultTraceLinks(input.baseUrl, input.runId, {
      inngestBaseUrl: input.inngestBaseUrl,
    }),
    finalization: {
      contract: RUN_FINALIZATION_CONTRACT_V1,
    },
  };
}

async function persistQueueFailure(
  context: CoordinationWorkflowContext,
  input: {
    run: RunStatusV1;
    event: DeskRunEventV1;
  },
) {
  await context.runtime.saveRunStatus(input.run);
  await context.runtime.appendTimeline(input.run.runId, input.event);
}
