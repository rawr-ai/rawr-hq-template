import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type, type Static } from "typebox";
import { supportExampleWorkflowErrorMap } from "../errors";

const supportExampleTag = ["support-example"] as const;

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

export const triggerRunContract = oc
  .route({
    method: "POST",
    path: "/support-example/triage/runs",
    tags: supportExampleTag,
    summary: "Trigger a support triage run",
    description: "Queues a durable support triage run and dispatches the corresponding Inngest event.",
    operationId: "supportExampleTriggerRun",
  })
  .input(
    schema(
      Type.Object(
        {
          queueId: Type.String({
            minLength: 1,
            description: "Stable identifier of the support queue that should be triaged.",
          }),
          requestedBy: Type.String({
            minLength: 1,
            description: "Principal identifier of the caller requesting this run.",
          }),
          runId: Type.Optional(
            Type.String({
              minLength: 1,
              description: "Optional caller-supplied run identifier for idempotent retry semantics.",
            }),
          ),
          dryRun: Type.Optional(
            Type.Boolean({
              description: "When true, executes workflow steps without applying persistent triage side-effects.",
            }),
          ),
        },
        {
          additionalProperties: false,
          description: "Payload used to queue a support triage workflow run.",
        },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          accepted: Type.Boolean({
            description: "Whether a new run was accepted and dispatched in this request.",
          }),
          run: SupportExampleRunSchema,
          eventIds: Type.Array(
            Type.String({
              minLength: 1,
              description: "Identifier of an emitted Inngest event tied to this trigger call.",
            }),
            { description: "Inngest event identifiers produced during trigger dispatch." },
          ),
        },
        {
          additionalProperties: false,
          description: "Trigger response containing acceptance state, current run snapshot, and dispatch event ids.",
        },
      ),
    ),
  )
  .errors(supportExampleWorkflowErrorMap);

export type SupportExampleRun = Static<typeof SupportExampleRunSchema>;
export type TriggerRunInput = {
  queueId: string;
  requestedBy: string;
  runId?: string;
  dryRun?: boolean;
};
export type TriggerRunOutput = {
  accepted: boolean;
  run: SupportExampleRun;
  eventIds: string[];
};
