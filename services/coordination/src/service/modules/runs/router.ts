import {
  appendRunTimelineEvent,
  ensureCoordinationStorage,
  getRunStatus as readRunStatus,
  getRunTimeline as readRunTimeline,
  getWorkflow as readWorkflow,
  saveRunStatus,
} from "../../../storage";
import { RUN_FINALIZATION_CONTRACT_V1, type RunStatusV1 } from "../../../domain/types";
import { impl } from "../../impl";
import { parseCoordinationId } from "../../shared/inputs";
import { parseRunId, toJsonValue } from "./inputs";

const queueRun = impl.queueRun.handler(async ({ context, input, errors }) => {
  const repoRoot = context.scope.repoRoot;
  await ensureCoordinationStorage(repoRoot);
  const workflowId = parseCoordinationId(input.workflowId);
  if (!workflowId) {
    throw errors.INVALID_WORKFLOW_ID({
      message: "Invalid workflowId format",
      data: {
        workflowId: typeof input.workflowId === "string" ? input.workflowId : null,
      },
    });
  }

  const workflow = await readWorkflow(repoRoot, workflowId);
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
    return await context.deps.queueRun({
      workflow,
      runId,
      input: normalizedInput,
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
      input: normalizedInput,
      error: err instanceof Error ? err.message : String(err),
      traceLinks: context.deps.createTraceLinks({ runId }),
      finalization: {
        contract: RUN_FINALIZATION_CONTRACT_V1,
      },
    };

    try {
      await saveRunStatus(repoRoot, failedRun);
      await appendRunTimelineEvent(
        repoRoot,
        runId,
        context.deps.createEvent({
          runId,
          workflowId,
          type: "run.failed",
          status: "failed",
          detail: failedRun.error,
          payload: failedRun.input,
        }),
      );
    } catch {
      // Preserve the original queue failure even if persistence also fails.
    }

    throw errors.RUN_QUEUE_FAILED({
      message: failedRun.error ?? "Workflow run failed",
      data: { run: failedRun },
    });
  }
});

const getRunStatus = impl.getRunStatus.handler(async ({ context, input, errors }) => {
  const repoRoot = context.scope.repoRoot;
  await ensureCoordinationStorage(repoRoot);
  const runId = parseCoordinationId(input.runId);
  if (!runId) {
    throw errors.INVALID_RUN_ID({
      message: "Invalid runId format",
      data: {
        runId: typeof input.runId === "string" ? input.runId : null,
      },
    });
  }

  const run = await readRunStatus(repoRoot, runId);
  if (!run) {
    throw errors.RUN_NOT_FOUND({
      message: "run not found",
      data: { runId },
    });
  }

  return { run };
});

const getRunTimeline = impl.getRunTimeline.handler(async ({ context, input, errors }) => {
  const repoRoot = context.scope.repoRoot;
  await ensureCoordinationStorage(repoRoot);
  const runId = parseCoordinationId(input.runId);
  if (!runId) {
    throw errors.INVALID_RUN_ID({
      message: "Invalid runId format",
      data: {
        runId: typeof input.runId === "string" ? input.runId : null,
      },
    });
  }

  const run = await readRunStatus(repoRoot, runId);
  if (!run) {
    throw errors.RUN_NOT_FOUND({
      message: "run not found",
      data: { runId },
    });
  }

  const timeline = await readRunTimeline(repoRoot, runId);
  return { runId, timeline };
});

export const router = {
  queueRun,
  getRunStatus,
  getRunTimeline,
};
