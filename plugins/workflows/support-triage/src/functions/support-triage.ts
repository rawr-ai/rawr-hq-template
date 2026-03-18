import type { Inngest } from "inngest";
import type { SupportTriageServiceDeps } from "@rawr/support-triage";
import { completeSupportTriageWorkItem, startSupportTriageWorkItem } from "@rawr/support-triage";
import {
  SUPPORT_TRIAGE_EVENT_NAME,
  type SupportTriageRequestedEventData,
  normalizeSupportTriageQueueId,
  normalizeSupportTriageRunId,
  normalizeSupportTriageWorkItemId,
} from "../models";
import { getSupportTriageRun, saveSupportTriageRun } from "../run-store";

type StepToolLike = Readonly<{
  run: (id: string, fn: () => Promise<unknown>) => Promise<unknown>;
}>;

export type ProcessSupportTriageRequestedEventOptions = Readonly<{
  payload: SupportTriageRequestedEventData;
  step: StepToolLike;
  deps: SupportTriageServiceDeps;
}>;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSupportTriageEventPayload(value: unknown): SupportTriageRequestedEventData | null {
  const record = asRecord(value);
  if (!record) return null;

  const runId = typeof record.runId === "string" ? normalizeSupportTriageRunId(record.runId) : null;
  const workItemId = typeof record.workItemId === "string" ? normalizeSupportTriageWorkItemId(record.workItemId) : null;
  const repoRoot = typeof record.repoRoot === "string" ? record.repoRoot.trim() : "";
  const queueId = typeof record.queueId === "string" ? normalizeSupportTriageQueueId(record.queueId) : null;
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
      await startSupportTriageWorkItem(options.deps, { workItemId: options.payload.workItemId });
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
        status: "completed" as const,
        finishedAt: new Date().toISOString(),
        error: undefined,
        triagedTicketCount: summary.triagedTicketCount,
        escalatedTicketCount: summary.escalatedTicketCount,
      };
      saveSupportTriageRun(completedRun);

      await completeSupportTriageWorkItem(options.deps, {
        workItemId: options.payload.workItemId,
        succeeded: true,
        triagedTicketCount: summary.triagedTicketCount,
        escalatedTicketCount: summary.escalatedTicketCount,
      });
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

      await completeSupportTriageWorkItem(options.deps, {
        workItemId: options.payload.workItemId,
        succeeded: false,
        failureReason: failedRun.error,
      });
    });

    throw error;
  }
}

export function createSupportTriageInngestFunctions(input: {
  client: Inngest;
  resolveSupportTriageDeps: (repoRoot: string) => SupportTriageServiceDeps;
}): readonly unknown[] {
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

      const deps = input.resolveSupportTriageDeps(payload.repoRoot);
      const summary = await processSupportTriageRequestedEvent({
        payload,
        step,
        deps,
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
