import { normalizeSupportExampleId } from "@rawr/support-example/ids";
import type { SupportExampleRun } from "./contract";

export const SUPPORT_EXAMPLE_CAPABILITY = "support-example" as const;
export const SUPPORT_EXAMPLE_EVENT_NAME = "support-example/run.requested" as const;

export type SupportExampleRequestedEventData = {
  runId: string;
  workItemId: string;
  repoRoot: string;
  queueId: string;
  requestedBy: string;
  dryRun: boolean;
  requestId?: string;
  correlationId?: string;
};

export function normalizeSupportExampleRunId(value: string): string | null {
  return normalizeSupportExampleId(value);
}

export function normalizeSupportExampleQueueId(value: string): string | null {
  return normalizeSupportExampleId(value);
}

export function normalizeSupportExampleWorkItemId(value: string): string | null {
  return normalizeSupportExampleId(value);
}

export function createSupportExampleRunId(now = Date.now()): string {
  return `support-example-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createQueuedSupportExampleRun(input: Readonly<{
  runId: string;
  workItemId: string;
  queueId: string;
  requestedBy: string;
  dryRun: boolean;
}>): SupportExampleRun {
  return {
    runId: input.runId,
    workItemId: input.workItemId,
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
