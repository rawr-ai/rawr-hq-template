import { oc } from "@orpc/contract";
import { Type } from "typebox";
import { TriageJobSchema, TriageJobSourceSchema, TriageJobStatusSchema } from "../../../../packages/support-triage";
import { schema } from "../../../../packages/orpc-standards";

const supportTriageTag = ["support-triage"] as const;

export const supportTriageApiContract = oc.router({
  supportTriage: oc.router({
    requestTriageJob: oc
      .route({
        method: "POST",
        path: "/support-triage/jobs",
        tags: supportTriageTag,
        summary: "Queue triage job",
        description: "Creates a queue-scoped API TriageJob lifecycle record in queued state.",
        operationId: "supportTriageRequestTriageJob",
      })
      .input(
        schema(
          Type.Object(
            {
              queueId: Type.String({
                minLength: 1,
                description: "Stable identifier of the support queue to process.",
              }),
              requestedBy: Type.String({
                minLength: 1,
                description: "Principal identifier of the caller requesting triage.",
              }),
              source: Type.Optional(TriageJobSourceSchema),
            },
            {
              additionalProperties: false,
              description: "Request payload for queueing an API TriageJob.",
            },
          ),
        ),
      )
      .output(
        schema(
          Type.Object(
            {
              job: TriageJobSchema,
            },
            {
              additionalProperties: false,
              description: "Response envelope containing the newly queued API TriageJob.",
            },
          ),
        ),
      ),

    listTriageJobs: oc
      .route({
        method: "GET",
        path: "/support-triage/jobs",
        tags: supportTriageTag,
        summary: "List triage jobs",
        description: "Returns queue-scoped API TriageJob records, optionally filtered by lifecycle status.",
        operationId: "supportTriageListTriageJobs",
      })
      .input(
        schema(
          Type.Object(
            {
              status: Type.Optional(TriageJobStatusSchema),
            },
            {
              additionalProperties: false,
              description: "Optional query filter for listing API TriageJob records by lifecycle status.",
            },
          ),
        ),
      )
      .output(
        schema(
          Type.Object(
            {
              jobs: Type.Array(TriageJobSchema, {
                description: "API TriageJob records matching the provided listing filter.",
              }),
            },
            {
              additionalProperties: false,
              description: "Response envelope containing matching API TriageJob records.",
            },
          ),
        ),
      ),

    getTriageJob: oc
      .route({
        method: "GET",
        path: "/support-triage/jobs/{jobId}",
        tags: supportTriageTag,
        summary: "Get triage job",
        description: "Fetches one API TriageJob lifecycle record by stable job identifier.",
        operationId: "supportTriageGetTriageJob",
      })
      .input(
        schema(
          Type.Object(
            {
              jobId: Type.String({
                minLength: 1,
                description: "Stable identifier of the API TriageJob to fetch.",
              }),
            },
            {
              additionalProperties: false,
              description: "Route parameters for fetching one API TriageJob.",
            },
          ),
        ),
      )
      .output(
        schema(
          Type.Object(
            {
              job: TriageJobSchema,
            },
            {
              additionalProperties: false,
              description: "Response envelope containing the requested API TriageJob.",
            },
          ),
        ),
      ),

    startTriageJob: oc
      .route({
        method: "POST",
        path: "/support-triage/jobs/{jobId}/start",
        tags: supportTriageTag,
        summary: "Start triage job",
        description: "Transitions a queued API TriageJob into running state.",
        operationId: "supportTriageStartTriageJob",
      })
      .input(
        schema(
          Type.Object(
            {
              jobId: Type.String({
                minLength: 1,
                description: "Stable identifier of the queued API TriageJob to start.",
              }),
            },
            {
              additionalProperties: false,
              description: "Route parameters required to start an API TriageJob.",
            },
          ),
        ),
      )
      .output(
        schema(
          Type.Object(
            {
              job: TriageJobSchema,
            },
            {
              additionalProperties: false,
              description: "Response envelope containing the running API TriageJob.",
            },
          ),
        ),
      ),

    completeTriageJob: oc
      .route({
        method: "POST",
        path: "/support-triage/jobs/{jobId}/complete",
        tags: supportTriageTag,
        summary: "Complete triage job",
        description:
          "Finalizes a running API TriageJob with run-compatible triage metrics. Workflow TriageRun state is tracked separately.",
        operationId: "supportTriageCompleteTriageJob",
      })
      .input(
        schema(
          Type.Object(
            {
              jobId: Type.String({
                minLength: 1,
                description: "Stable identifier of the API TriageJob being finalized.",
              }),
              succeeded: Type.Boolean({
                description: "Whether triage completed successfully.",
              }),
              triagedTicketCount: Type.Optional(
                Type.Integer({
                  minimum: 0,
                  description: "Count of tickets triaged during this job completion transition.",
                }),
              ),
              escalatedTicketCount: Type.Optional(
                Type.Integer({
                  minimum: 0,
                  description: "Count of triaged tickets escalated onward.",
                }),
              ),
              failureReason: Type.Optional(
                Type.String({
                  minLength: 1,
                  description: "Failure reason required when triage does not succeed.",
                }),
              ),
              failureCode: Type.Optional(
                Type.String({
                  minLength: 1,
                  description: "Optional machine-readable failure code.",
                }),
              ),
            },
            {
              additionalProperties: false,
              description: "Completion payload for transitioning an API TriageJob to terminal state.",
            },
          ),
        ),
      )
      .output(
        schema(
          Type.Object(
            {
              job: TriageJobSchema,
            },
            {
              additionalProperties: false,
              description: "Response envelope containing the finalized API TriageJob.",
            },
          ),
        ),
      ),
  }),
});

export type SupportTriageApiContract = typeof supportTriageApiContract;
