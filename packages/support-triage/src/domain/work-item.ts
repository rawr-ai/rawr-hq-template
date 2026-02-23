import { Type, type Static } from "typebox";
import { TriageWorkItemStatusSchema } from "./status";

export const TriageWorkItemSourceSchema = Type.Union(
  [
    Type.Literal("manual", { description: "Requested directly by a person or operator action." }),
    Type.Literal("workflow", { description: "Requested by an automated workflow trigger." }),
    Type.Literal("escalation", { description: "Requested by an escalation policy path." }),
  ],
  {
    description: "Source channel that initiated the triage work item.",
  },
);

export type TriageWorkItemSource = Static<typeof TriageWorkItemSourceSchema>;

export const TriageWorkItemSchema = Type.Object(
  {
    workItemId: Type.String({
      minLength: 1,
      description: "Stable identifier for the triage work item lifecycle record.",
    }),
    queueId: Type.String({
      minLength: 1,
      description: "Stable identifier for the queue this work item belongs to.",
    }),
    requestedBy: Type.String({
      minLength: 1,
      description: "Principal identifier that requested the triage work item.",
    }),
    source: TriageWorkItemSourceSchema,
    status: TriageWorkItemStatusSchema,
    createdAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the work item was initially created.",
    }),
    updatedAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the work item state was last updated.",
    }),
    startedAt: Type.Optional(
      Type.String({
        format: "date-time",
        description: "ISO timestamp when work item processing started.",
      }),
    ),
    completedAt: Type.Optional(
      Type.String({
        format: "date-time",
        description: "ISO timestamp when the work item reached successful completion.",
      }),
    ),
    triagedTicketCount: Type.Optional(
      Type.Integer({
        minimum: 0,
        description: "Number of tickets triaged by the completion payload.",
      }),
    ),
    escalatedTicketCount: Type.Optional(
      Type.Integer({
        minimum: 0,
        description: "Number of triaged tickets escalated onward during completion.",
      }),
    ),
    failedAt: Type.Optional(
      Type.String({
        format: "date-time",
        description: "ISO timestamp when the work item transitioned to failed.",
      }),
    ),
    failureReason: Type.Optional(
      Type.String({
        minLength: 1,
        description: "Human-readable reason for failure.",
      }),
    ),
    failureCode: Type.Optional(
      Type.String({
        minLength: 1,
        description: "Machine-readable failure classification code.",
      }),
    ),
  },
  {
    additionalProperties: false,
    description:
      "Canonical triage work item lifecycle record (queue-scoped).",
  },
);

export type TriageWorkItem = Static<typeof TriageWorkItemSchema>;
