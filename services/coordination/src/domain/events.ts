import type { DeskRunEventTypeV1, DeskRunEventV1 } from "./types";

export const REQUIRED_RUN_LIFECYCLE_EVENT_TYPES = ["run.started", "run.completed", "run.failed"] as const;

type RequiredRunLifecycleEventType = (typeof REQUIRED_RUN_LIFECYCLE_EVENT_TYPES)[number];

type RunLifecycleStatusContract = Readonly<Record<RequiredRunLifecycleEventType, readonly DeskRunEventV1["status"][]>>;

export const REQUIRED_RUN_LIFECYCLE_STATUS_BY_EVENT = {
  "run.started": ["queued", "running"],
  "run.completed": ["completed"],
  "run.failed": ["failed"],
} as const satisfies RunLifecycleStatusContract;

type CommonDeskEventDraft = Readonly<{
  runId: string;
  workflowId: string;
  deskId?: string;
  detail?: string;
  payload?: DeskRunEventV1["output"];
}>;

type RunStartedEventDraft = CommonDeskEventDraft & {
  type: "run.started";
  status: "queued" | "running";
};

type RunCompletedEventDraft = CommonDeskEventDraft & {
  type: "run.completed";
  status: "completed";
};

type RunFailedEventDraft = CommonDeskEventDraft & {
  type: "run.failed";
  status: "failed";
};

type NonRunLifecycleEventDraft = CommonDeskEventDraft & {
  type: Exclude<DeskRunEventTypeV1, RequiredRunLifecycleEventType>;
  status: DeskRunEventV1["status"];
};

export type CreateDeskEventDraft =
  | RunStartedEventDraft
  | RunCompletedEventDraft
  | RunFailedEventDraft
  | NonRunLifecycleEventDraft;

export type CreateDeskEventInput = CreateDeskEventDraft & Readonly<{
  eventId: string;
  ts: string;
}>;

function createEventId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

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
    eventId: input.eventId,
    runId: input.runId,
    workflowId: input.workflowId,
    type: input.type,
    deskId: input.deskId,
    ts: input.ts,
    status: input.status,
    detail: input.detail,
    output: input.payload,
  };
}

export function createStampedDeskEvent(input: CreateDeskEventDraft): DeskRunEventV1 {
  return createDeskEvent({
    ...input,
    eventId: createEventId("evt"),
    ts: new Date().toISOString(),
  });
}
