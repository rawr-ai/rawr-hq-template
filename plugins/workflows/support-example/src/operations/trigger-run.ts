import { ORPCError } from "@orpc/server";
import {
  SUPPORT_EXAMPLE_EVENT_NAME,
  createSupportExampleRunId,
  createQueuedSupportExampleRun,
  normalizeSupportExampleQueueId,
  normalizeSupportExampleRunId,
} from "../models";
import { getSupportExampleRun, saveSupportExampleRun } from "../run-store";
import { os } from "../orpc";

export const triggerRun = os.supportExample.triage.triggerRun.handler(async ({ context, input }) => {
  const queueId = normalizeSupportExampleQueueId(input.queueId);
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

  const runId = input.runId ? normalizeSupportExampleRunId(input.runId) : createSupportExampleRunId();
  if (!runId) {
    throw new ORPCError("INVALID_SUPPORT_EXAMPLE_RUN_ID", {
      status: 400,
      message: "runId must be a valid identifier when provided",
      data: { runId: input.runId },
    });
  }

  const existingRun = getSupportExampleRun(runId);
  if (existingRun) {
    return {
      accepted: false,
      run: existingRun,
      eventIds: [],
    };
  }

  const dryRun = input.dryRun ?? false;

  const { workItem } = await context.supportExample.triage.items.request({
    queueId,
    requestedBy,
    source: "workflow",
  });

  const queuedRun = createQueuedSupportExampleRun({
    runId,
    workItemId: workItem.workItemId,
    queueId,
    requestedBy,
    dryRun,
  });

  saveSupportExampleRun(queuedRun);

  try {
    const dispatch = await context.inngestClient.send({
      name: SUPPORT_EXAMPLE_EVENT_NAME,
      data: {
        runId,
        workItemId: workItem.workItemId,
        repoRoot: context.repoRoot,
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

    saveSupportExampleRun(failedRun);

    throw new ORPCError("SUPPORT_EXAMPLE_TRIGGER_FAILED", {
      status: 500,
      message: failedRun.error,
      data: { runId },
    });
  }
});
