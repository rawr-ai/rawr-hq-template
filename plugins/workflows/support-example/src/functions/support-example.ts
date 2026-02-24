import type { SupportExampleClient } from "@rawr/support-example/client";
import type { Inngest } from "inngest";
import {
  SUPPORT_EXAMPLE_EVENT_NAME,
  type SupportExampleRequestedEventData,
  normalizeSupportExampleQueueId,
  normalizeSupportExampleRunId,
  normalizeSupportExampleWorkItemId,
} from "../models";
import { getSupportExampleRun, saveSupportExampleRun } from "../run-store";

type StepToolLike = Readonly<{
  run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
}>;

export type ProcessSupportExampleRequestedEventOptions = Readonly<{
  payload: SupportExampleRequestedEventData;
  step: StepToolLike;
  supportClient: SupportExampleClient;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSupportExampleEventPayload(value: unknown): SupportExampleRequestedEventData | null {
  const record = asRecord(value);
  if (!record) return null;

  const runId = typeof record.runId === "string" ? normalizeSupportExampleRunId(record.runId) : null;
  const workItemId = typeof record.workItemId === "string" ? normalizeSupportExampleWorkItemId(record.workItemId) : null;
  const repoRoot = typeof record.repoRoot === "string" ? record.repoRoot.trim() : "";
  const queueId = typeof record.queueId === "string" ? normalizeSupportExampleQueueId(record.queueId) : null;
  const requestedBy = typeof record.requestedBy === "string" ? record.requestedBy.trim() : "";
  const dryRun = typeof record.dryRun === "boolean" ? record.dryRun : false;

  if (!runId || !workItemId || repoRoot.length === 0 || !queueId || requestedBy.length === 0) {
    return null;
  }

  return {
    runId,
    workItemId,
    repoRoot,
    queueId,
    requestedBy,
    dryRun,
    requestId: typeof record.requestId === "string" ? record.requestId : undefined,
    correlationId: typeof record.correlationId === "string" ? record.correlationId : undefined,
  };
}

export async function processSupportExampleRequestedEvent(
  options: ProcessSupportExampleRequestedEventOptions,
): Promise<{ triagedTicketCount: number; escalatedTicketCount: number }> {
  const queuedRun = getSupportExampleRun(options.payload.runId);
  if (!queuedRun) {
    throw new Error(`Support triage run not found: ${options.payload.runId}`);
  }

  try {
    const runningRun = (await options.step.run("support-example/mark-running", async () => {
      const next = { ...queuedRun, status: "running" as const };
      saveSupportExampleRun(next);
      await options.supportClient.triage.items.start({ workItemId: options.payload.workItemId });
      return next;
    })) as typeof queuedRun;

    const summary = (await options.step.run("support-example/execute", async () => {
      const triagedTicketCount = options.payload.dryRun ? 0 : 42;
      const escalatedTicketCount = options.payload.dryRun ? 0 : 6;

      return {
        triagedTicketCount,
        escalatedTicketCount,
      };
    })) as { triagedTicketCount: number; escalatedTicketCount: number };

    await options.step.run("support-example/mark-completed", async () => {
      const completedRun = {
        ...runningRun,
        status: "completed" as const,
        finishedAt: new Date().toISOString(),
        error: undefined,
        triagedTicketCount: summary.triagedTicketCount,
        escalatedTicketCount: summary.escalatedTicketCount,
      };
      saveSupportExampleRun(completedRun);

      await options.supportClient.triage.items.complete({
        workItemId: options.payload.workItemId,
        succeeded: true,
        triagedTicketCount: summary.triagedTicketCount,
        escalatedTicketCount: summary.escalatedTicketCount,
      });
    });

    return summary;
  } catch (error) {
    await options.step.run("support-example/mark-failed", async () => {
      const current = getSupportExampleRun(options.payload.runId) ?? queuedRun;
      const failedRun = {
        ...current,
        status: "failed" as const,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      saveSupportExampleRun(failedRun);

      await options.supportClient.triage.items.complete({
        workItemId: options.payload.workItemId,
        succeeded: false,
        failureReason: failedRun.error,
      });
    });

    throw error;
  }
}

export function createSupportExampleInngestFunctions(input: {
  client: Inngest;
  resolveSupportExampleClient: (repoRoot: string) => SupportExampleClient;
}): readonly unknown[] {
  const workflowRunner = input.client.createFunction(
    {
      id: "support-example-workflow-runner",
      name: "Support Triage Workflow Runner",
      retries: 2,
    },
    {
      event: SUPPORT_EXAMPLE_EVENT_NAME,
    },
    async ({ event, runId, step }) => {
      const payload = parseSupportExampleEventPayload(event.data);
      if (!payload) {
        throw new Error("Invalid support triage event payload");
      }

      const supportClient = input.resolveSupportExampleClient(payload.repoRoot);
      const summary = await processSupportExampleRequestedEvent({
        payload,
        step,
        supportClient,
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
