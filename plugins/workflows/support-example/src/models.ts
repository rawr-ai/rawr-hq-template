import { Type, type Static } from "typebox";

export const SUPPORT_EXAMPLE_CAPABILITY = "support-example" as const;
export const SUPPORT_EXAMPLE_EVENT_NAME = "support-example/run.requested" as const;

const SUPPORT_EXAMPLE_ID_PATTERN_SOURCE = "[A-Za-z0-9][A-Za-z0-9._:-]{0,127}";
const SUPPORT_EXAMPLE_ID_PATTERN = new RegExp(`^${SUPPORT_EXAMPLE_ID_PATTERN_SOURCE}$`, "u");

function normalizeSupportExampleId(value: string): string | null {
  const normalized = value.trim();
  return SUPPORT_EXAMPLE_ID_PATTERN.test(normalized) ? normalized : null;
}

export const SupportExampleRunStatusSchema = Type.Union(
  [
    Type.Literal("queued", { description: "Run is accepted and queued for durable execution." }),
    Type.Literal("running", { description: "Run is actively executing workflow steps." }),
    Type.Literal("completed", { description: "Run completed successfully." }),
    Type.Literal("failed", { description: "Run failed and may require follow-up or retry." }),
  ],
  {
    description: "Lifecycle status for support-example workflow runs.",
  },
);

export const SupportExampleRunSchema = Type.Object(
  {
    runId: Type.String({
      minLength: 1,
      description: "Stable workflow run identifier for the support triage execution.",
    }),
    workItemId: Type.String({
      minLength: 1,
      description: "Stable triage work item identifier linked to this workflow run.",
    }),
    queueId: Type.String({
      minLength: 1,
      description: "Stable identifier of the support queue associated with this workflow run.",
    }),
    requestedBy: Type.String({
      minLength: 1,
      description: "Principal identifier that initiated the run request.",
    }),
    dryRun: Type.Boolean({
      description: "Whether the run was executed as a dry-run without persisting workflow-side effects.",
    }),
    status: SupportExampleRunStatusSchema,
    startedAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when this run was first created.",
    }),
    finishedAt: Type.Optional(
      Type.String({
        format: "date-time",
        description: "ISO timestamp when the run entered a terminal state.",
      }),
    ),
    triagedTicketCount: Type.Optional(
      Type.Integer({
        minimum: 0,
        description: "Number of support tickets triaged during execution.",
      }),
    ),
    escalatedTicketCount: Type.Optional(
      Type.Integer({
        minimum: 0,
        description: "Number of triaged tickets escalated onward during execution.",
      }),
    ),
    error: Type.Optional(
      Type.String({
        minLength: 1,
        description: "Failure message captured when the run does not complete successfully.",
      }),
    ),
  },
  {
    additionalProperties: false,
    description: "Workflow run projection exposed by the caller-facing support-example workflow boundary.",
  },
);

export type SupportExampleRun = Static<typeof SupportExampleRunSchema>;

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
