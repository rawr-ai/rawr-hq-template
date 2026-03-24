import {
  type DeskRunEventV1,
} from "../../../domain/types";
import { RUN_FINALIZATION_CONTRACT_V1, type RunStatusV1 } from "../../../domain/types";
import { parseCoordinationId } from "../../shared/inputs";
import { parseRunId, toJsonValue } from "./inputs";
import { module } from "./module";
import type { RunRepository } from "./repository";

const queueRun = module.queueRun.handler(async ({ context, input, errors }) => {
  const workflowId = parseCoordinationId(input.workflowId);
  if (!workflowId) {
    throw errors.INVALID_WORKFLOW_ID({
      message: "Invalid workflowId format",
      data: {
        workflowId: typeof input.workflowId === "string" ? input.workflowId : null,
      },
    });
  }

  const workflow = await context.repo.getWorkflow(workflowId);
  if (!workflow) {
    throw errors.WORKFLOW_NOT_FOUND({
      message: "workflow not found",
      data: { workflowId },
    });
  }

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
    return await context.queueRun({
      workflow,
      runId,
      input: normalizedInput,
    });
  } catch (err) {
    const failedRun = createQueueFailureRun({
      runId,
      workflowId,
      workflowVersion: workflow.version,
      input: normalizedInput,
      error: err instanceof Error ? err.message : String(err),
      createTraceLinks: context.createTraceLinks,
    });

    try {
      await persistQueueFailure(context.repo, {
        run: failedRun,
        event: context.createEvent({
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
});

const getRunStatus = module.getRunStatus.handler(async ({ context, input, errors }) => {
  const runId = parseCoordinationId(input.runId);
  if (!runId) {
    throw errors.INVALID_RUN_ID({
      message: "Invalid runId format",
      data: {
        runId: typeof input.runId === "string" ? input.runId : null,
      },
    });
  }

  const run = await context.repo.getRunStatus(runId);
  if (!run) {
    throw errors.RUN_NOT_FOUND({
      message: "run not found",
      data: { runId },
    });
  }

  return { run };
});

const getRunTimeline = module.getRunTimeline.handler(async ({ context, input, errors }) => {
  const runId = parseCoordinationId(input.runId);
  if (!runId) {
    throw errors.INVALID_RUN_ID({
      message: "Invalid runId format",
      data: {
        runId: typeof input.runId === "string" ? input.runId : null,
      },
    });
  }

  const run = await context.repo.getRunStatus(runId);
  if (!run) {
    throw errors.RUN_NOT_FOUND({
      message: "run not found",
      data: { runId },
    });
  }

  const timeline = await context.repo.getRunTimeline(runId);
  return { runId, timeline };
});

function createQueueFailureRun(input: {
  runId: string;
  workflowId: string;
  workflowVersion: number;
  input: RunStatusV1["input"];
  error: string;
  createTraceLinks: (args: { runId: string }) => RunStatusV1["traceLinks"];
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
    traceLinks: input.createTraceLinks({ runId: input.runId }),
    finalization: {
      contract: RUN_FINALIZATION_CONTRACT_V1,
    },
  };
}

async function persistQueueFailure(
  repo: RunRepository,
  input: {
    run: RunStatusV1;
    event: DeskRunEventV1;
  },
) {
  await repo.saveRunStatus(input.run);
  await repo.appendRunTimelineEvent(input.run.runId, input.event);
}

export const router = module.router({
  queueRun,
  getRunStatus,
  getRunTimeline,
});
