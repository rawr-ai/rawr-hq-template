import type { RunTraceLinkV1 } from "@rawr/coordination";

export type TraceLinkOptions = Readonly<{
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
      url: `${trimmed}/api/workflows/coordination/runs/${runId}/timeline`,
    },
    {
      provider: "inngest",
      label: options?.inngestRunId ? `Inngest Trace (${options.inngestRunId})` : "Inngest Trace",
      url: resolveInngestTraceUrl(runId, options),
    },
  ];
}
