import type { DeskRunEventTypeV1, DeskRunEventV1, RunTraceLinkV1 } from "@rawr/coordination";

function eventId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

export const REQUIRED_RUN_LIFECYCLE_EVENT_TYPES = ["run.started", "run.completed", "run.failed"] as const;

type RequiredRunLifecycleEventType = (typeof REQUIRED_RUN_LIFECYCLE_EVENT_TYPES)[number];

type RunLifecycleStatusContract = Readonly<Record<RequiredRunLifecycleEventType, readonly DeskRunEventV1["status"][]>>;

export const REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT = {
  "run.started": ["queued", "running"],
  "run.completed": ["completed"],
  "run.failed": ["failed"],
} as const satisfies RunLifecycleStatusContract;

type CommonDeskEventInput = Readonly<{
  runId: string;
  workflowId: string;
  deskId?: string;
  detail?: string;
  payload?: DeskRunEventV1["output"];
}>;

type RunStartedEventInput = CommonDeskEventInput & {
  type: "run.started";
  status: "queued" | "running";
};

type RunCompletedEventInput = CommonDeskEventInput & {
  type: "run.completed";
  status: "completed";
};

type RunFailedEventInput = CommonDeskEventInput & {
  type: "run.failed";
  status: "failed";
};

type NonRunLifecycleEventInput = CommonDeskEventInput & {
  type: Exclude<DeskRunEventTypeV1, RequiredRunLifecycleEventType>;
  status: DeskRunEventV1["status"];
};

export type CreateDeskEventInput =
  | RunStartedEventInput
  | RunCompletedEventInput
  | RunFailedEventInput
  | NonRunLifecycleEventInput;

function isRequiredRunLifecycleEventType(type: DeskRunEventTypeV1): type is RequiredRunLifecycleEventType {
  return REQUIRED_RUN_LIFECYCLE_EVENT_TYPES.includes(type as RequiredRunLifecycleEventType);
}

function assertRunLifecycleStatusContract(type: DeskRunEventTypeV1, status: DeskRunEventV1["status"]): void {
  if (!isRequiredRunLifecycleEventType(type)) return;
  const allowedStatuses: readonly DeskRunEventV1["status"][] = REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT[type];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`invalid lifecycle status '${status}' for event '${type}'`);
  }
}

export function createDeskEvent(input: CreateDeskEventInput): DeskRunEventV1 {
  assertRunLifecycleStatusContract(input.type, input.status);
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
      url: `${trimmed}/api/orpc/coordination/runs/${runId}/timeline`,
    },
    {
      provider: "inngest",
      label: options?.inngestRunId ? `Inngest Trace (${options.inngestRunId})` : "Inngest Trace",
      url: resolveInngestTraceUrl(runId, options),
    },
  ];
}
