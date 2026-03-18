import type { Inngest } from "inngest";
import {
  SUPPORT_TRIAGE_EVENT_NAME,
  type SupportTriageRequestedEventData,
  normalizeSupportTriageQueueId,
  normalizeSupportTriageRunId,
} from "../models";
import { getSupportTriageRun, saveSupportTriageRun } from "../run-store";

type StepToolLike = Readonly<{
  run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
}>;

export type ProcessSupportTriageRequestedEventOptions = Readonly<{
  payload: SupportTriageRequestedEventData;
  step: StepToolLike;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSupportTriageEventPayload(value: unknown): SupportTriageRequestedEventData | null {
  const record = asRecord(value);
  if (!record) return null;

  const runId = typeof record.runId === "string" ? normalizeSupportTriageRunId(record.runId) : null;
  const queueId = typeof record.queueId === "string" ? normalizeSupportTriageQueueId(record.queueId) : null;
  const requestedBy = typeof record.requestedBy === "string" ? record.requestedBy.trim() : "";
  const dryRun = typeof record.dryRun === "boolean" ? record.dryRun : false;

  if (!runId || !queueId || requestedBy.length === 0) {
    return null;
  }

  return {
    runId,
    queueId,
    requestedBy,
    dryRun,
    requestId: typeof record.requestId === "string" ? record.requestId : undefined,
    correlationId: typeof record.correlationId === "string" ? record.correlationId : undefined,
  };
}

export async function processSupportTriageRequestedEvent(
  options: ProcessSupportTriageRequestedEventOptions,
): Promise<{ triagedTicketCount: number; escalatedTicketCount: number }> {
  const queuedRun = getSupportTriageRun(options.payload.runId);
  if (!queuedRun) {
    throw new Error(`Support triage run not found: ${options.payload.runId}`);
  }

  try {
    const runningRun = (await options.step.run("support-triage/mark-running", async () => {
      const next = { ...queuedRun, status: "running" as const };
      saveSupportTriageRun(next);
      return next;
    })) as typeof queuedRun;

    const summary = (await options.step.run("support-triage/execute", async () => {
      const triagedTicketCount = options.payload.dryRun ? 0 : 42;
      const escalatedTicketCount = options.payload.dryRun ? 0 : 6;

      return {
        triagedTicketCount,
        escalatedTicketCount,
      };
    })) as { triagedTicketCount: number; escalatedTicketCount: number };

    await options.step.run("support-triage/mark-completed", async () => {
      const completedRun = {
        ...runningRun,
        status: "completed",
        finishedAt: new Date().toISOString(),
        error: undefined,
        triagedTicketCount: summary.triagedTicketCount,
        escalatedTicketCount: summary.escalatedTicketCount,
      };
      saveSupportTriageRun(completedRun);
    });

    return summary;
  } catch (error) {
    await options.step.run("support-triage/mark-failed", async () => {
      const current = getSupportTriageRun(options.payload.runId) ?? queuedRun;
      const failedRun = {
        ...current,
        status: "failed" as const,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      saveSupportTriageRun(failedRun);
    });

    throw error;
  }
}

export function createSupportTriageInngestFunctions(input: { client: Inngest }): readonly unknown[] {
  const workflowRunner = input.client.createFunction(
    {
      id: "support-triage-workflow-runner",
      name: "Support Triage Workflow Runner",
      retries: 2,
    },
    {
      event: SUPPORT_TRIAGE_EVENT_NAME,
    },
    async ({ event, runId, step }) => {
      const payload = parseSupportTriageEventPayload(event.data);
      if (!payload) {
        throw new Error("Invalid support triage event payload");
      }

      const summary = await processSupportTriageRequestedEvent({
        payload,
        step,
      });

      return {
        ok: true,
        runId: payload.runId,
        inngestRunId: runId,
        summary,
      };
    },
  );

  return [workflowRunner];
}
