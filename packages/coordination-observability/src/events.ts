import type { DeskRunEventTypeV1, DeskRunEventV1, RunTraceLinkV1 } from "@rawr/coordination";

function eventId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

export function createDeskEvent(input: {
  runId: string;
  workflowId: string;
  type: DeskRunEventTypeV1;
  status: DeskRunEventV1["status"];
  deskId?: string;
  detail?: string;
  payload?: DeskRunEventV1["output"];
}): DeskRunEventV1 {
  return {
    eventId: eventId("evt"),
    runId: input.runId,
    workflowId: input.workflowId,
    type: input.type,
    deskId: input.deskId,
    ts: new Date().toISOString(),
    status: input.status,
    detail: input.detail,
    output: input.payload,
  };
}

type TraceLinkOptions = Readonly<{
  inngestBaseUrl?: string;
  inngestRunId?: string;
  inngestEventId?: string;
}>;

function trimUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function resolveInngestTraceUrl(runId: string, options?: TraceLinkOptions): string {
  const base = trimUrl(options?.inngestBaseUrl ?? process.env.INNGEST_BASE_URL ?? "http://localhost:8288");

  if (options?.inngestRunId) {
    return `${base}/runs/${encodeURIComponent(options.inngestRunId)}`;
  }

  if (options?.inngestEventId) {
    return `${base}/events/${encodeURIComponent(options.inngestEventId)}`;
  }

  return `${base}/runs/${encodeURIComponent(runId)}`;
}

export function defaultTraceLinks(baseUrl: string, runId: string, options?: TraceLinkOptions): RunTraceLinkV1[] {
  const trimmed = trimUrl(baseUrl);
  return [
    {
      provider: "rawr",
      label: "RAWR Run Timeline",
      url: `${trimmed}/api/orpc/coordination/runs/${runId}/timeline`,
    },
    {
      provider: "inngest",
      label: options?.inngestRunId ? `Inngest Trace (${options.inngestRunId})` : "Inngest Trace",
      url: resolveInngestTraceUrl(runId, options),
    },
  ];
}
