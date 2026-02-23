import { Type, type Static } from "typebox";
import { TriageJobStatusSchema } from "./status";

export const TriageJobSourceSchema = Type.Union(
  [
    Type.Literal("manual", { description: "Requested directly by a person or operator action." }),
    Type.Literal("workflow", { description: "Requested by an automated workflow trigger." }),
    Type.Literal("escalation", { description: "Requested by an escalation policy path." }),
  ],
  {
    description: "Source channel that initiated the triage job.",
  },
);

export type TriageJobSource = Static<typeof TriageJobSourceSchema>;

export const TriageJobSchema = Type.Object(
  {
    jobId: Type.String({
      minLength: 1,
      description: "Stable identifier for the API triage job lifecycle record.",
    }),
    queueId: Type.String({
      minLength: 1,
      description: "Stable identifier for the queue this job processes.",
    }),
    requestedBy: Type.String({
      minLength: 1,
      description: "Principal identifier that requested the triage job.",
    }),
    source: TriageJobSourceSchema,
    status: TriageJobStatusSchema,
    createdAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the job was initially created.",
    }),
    updatedAt: Type.String({
      format: "date-time",
      description: "ISO timestamp when the job state was last updated.",
    }),
    startedAt: Type.Optional(
      Type.String({
        format: "date-time",
        description: "ISO timestamp when job processing started.",
      }),
    ),
    completedAt: Type.Optional(
      Type.String({
        format: "date-time",
        description: "ISO timestamp when the job reached successful completion.",
      }),
    ),
    triagedTicketCount: Type.Optional(
      Type.Integer({
        minimum: 0,
        description: "Number of tickets triaged by the job run compatible completion payload.",
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
        description: "ISO timestamp when the job transitioned to failed.",
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
      "Canonical API TriageJob lifecycle record (queue scoped). Workflow TriageRun lifecycle is a separate runtime concern.",
  },
);

export type TriageJob = Static<typeof TriageJobSchema>;
