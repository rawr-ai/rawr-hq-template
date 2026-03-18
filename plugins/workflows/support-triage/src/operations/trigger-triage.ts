import { throwSupportTriageBoundaryError } from "@rawr/support-triage";
import type { TriggerSupportTriageInput, TriggerSupportTriageOutput } from "../contract";
import type { SupportTriageWorkflowContext } from "../context";
import {
  SUPPORT_TRIAGE_EVENT_NAME,
  createSupportTriageRunId,
  createQueuedSupportTriageRun,
  normalizeSupportTriageQueueId,
  normalizeSupportTriageRunId,
} from "../models";
import { getSupportTriageRun, saveSupportTriageRun } from "../run-store";

export async function triggerSupportTriage(
  args: Readonly<{ context: SupportTriageWorkflowContext; input: TriggerSupportTriageInput }>,
): Promise<TriggerSupportTriageOutput> {
  const { context, input } = args;
  const queueId = normalizeSupportTriageQueueId(input.queueId);
  if (!queueId) {
    throwSupportTriageBoundaryError({
      transportCode: "BAD_REQUEST",
      status: 400,
      domainCode: "INVALID_QUEUE_ID",
      message: "queueId must be a valid identifier",
      data: { queueId: input.queueId },
    });
  }

  const requestedBy = input.requestedBy.trim();
  if (requestedBy.length === 0) {
    throwSupportTriageBoundaryError({
      transportCode: "BAD_REQUEST",
      status: 400,
      domainCode: "INVALID_REQUESTED_BY",
      message: "requestedBy must be a non-empty string",
      data: { requestedBy: input.requestedBy },
    });
  }

  const runId = input.runId ? normalizeSupportTriageRunId(input.runId) : createSupportTriageRunId();
  if (!runId) {
    throwSupportTriageBoundaryError({
      transportCode: "BAD_REQUEST",
      status: 400,
      domainCode: "INVALID_SUPPORT_TRIAGE_RUN_ID",
      message: "runId must be a valid identifier when provided",
      data: { runId: input.runId },
    });
  }

  const existingRun = getSupportTriageRun(runId);
  if (existingRun) {
    return {
      accepted: false,
      run: existingRun,
      eventIds: [],
    };
  }

  const dryRun = input.dryRun ?? false;

  const queuedRun = createQueuedSupportTriageRun({
    runId,
    queueId,
    requestedBy,
    dryRun,
  });

  saveSupportTriageRun(queuedRun);

  try {
    const dispatch = await context.inngestClient.send({
      name: SUPPORT_TRIAGE_EVENT_NAME,
      data: {
        runId,
        queueId,
        requestedBy,
        dryRun,
        requestId: context.requestId,
        correlationId: context.correlationId,
      },
    });

    return {
      accepted: true,
      run: queuedRun,
      eventIds: dispatch.ids,
    };
  } catch (error) {
    const failedAt = new Date().toISOString();
    const failedRun = {
      ...queuedRun,
      status: "failed" as const,
      finishedAt: failedAt,
      error: error instanceof Error ? error.message : String(error),
    };

    saveSupportTriageRun(failedRun);

    throwSupportTriageBoundaryError({
      transportCode: "INTERNAL_SERVER_ERROR",
      status: 500,
      domainCode: "SUPPORT_TRIAGE_TRIGGER_FAILED",
      message: failedRun.error,
      data: { runId },
    });
  }
}
