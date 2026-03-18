import { normalizeSupportTriageId } from "@rawr/support-triage";
import type { SupportTriageRun } from "./contract";

export const SUPPORT_TRIAGE_CAPABILITY = "support-triage" as const;
export const SUPPORT_TRIAGE_EVENT_NAME = "support-triage/run.requested" as const;

export type SupportTriageRequestedEventData = {
  runId: string;
  queueId: string;
  requestedBy: string;
  dryRun: boolean;
  requestId?: string;
  correlationId?: string;
};

export function normalizeSupportTriageRunId(value: string): string | null {
  return normalizeSupportTriageId(value);
}

export function normalizeSupportTriageQueueId(value: string): string | null {
  return normalizeSupportTriageId(value);
}

export function createSupportTriageRunId(now = Date.now()): string {
  return `support-triage-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createQueuedSupportTriageRun(input: Readonly<{
  runId: string;
  queueId: string;
  requestedBy: string;
  dryRun: boolean;
}>): SupportTriageRun {
  return {
    runId: input.runId,
    status: "queued",
    startedAt: new Date().toISOString(),
    queueId: input.queueId,
    requestedBy: input.requestedBy,
    dryRun: input.dryRun,
    finishedAt: undefined,
    triagedTicketCount: undefined,
    escalatedTicketCount: undefined,
    error: undefined,
  };
}

export function assertNever(value: never): never {
  return value;
}
