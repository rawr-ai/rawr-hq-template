import { ORPCError } from "@orpc/server";
import {
  SUPPORT_TRIAGE_EVENT_NAME,
  createSupportTriageRunId,
  createQueuedSupportTriageRun,
  normalizeSupportTriageQueueId,
  normalizeSupportTriageRunId,
} from "../models";
import { getSupportTriageRun, saveSupportTriageRun } from "../run-store";
import { os } from "../orpc";

export const triggerSupportTriage = os.triggerSupportTriage.handler(async ({ context, input }) => {
  const queueId = normalizeSupportTriageQueueId(input.queueId);
  if (!queueId) {
    throw new ORPCError("INVALID_QUEUE_ID", {
      status: 400,
      message: "queueId must be a valid identifier",
      data: { queueId: input.queueId },
    });
  }

  const requestedBy = input.requestedBy.trim();
  if (requestedBy.length === 0) {
    throw new ORPCError("INVALID_REQUESTED_BY", {
      status: 400,
      message: "requestedBy must be a non-empty string",
      data: { requestedBy: input.requestedBy },
    });
  }

  const runId = input.runId ? normalizeSupportTriageRunId(input.runId) : createSupportTriageRunId();
  if (!runId) {
    throw new ORPCError("INVALID_SUPPORT_TRIAGE_RUN_ID", {
      status: 400,
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

    throw new ORPCError("SUPPORT_TRIAGE_TRIGGER_FAILED", {
      status: 500,
      message: failedRun.error,
      data: { runId },
    });
  }
});
