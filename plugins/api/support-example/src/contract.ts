import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import {
  TriageWorkItemSchema,
  TriageWorkItemSourceSchema,
  TriageWorkItemStatusSchema,
  supportExampleClientErrorMap,
} from "@rawr/support-example";

const supportExampleTag = ["support-example"] as const;

export const supportExampleApiContract = oc.router({
  supportExample: oc.router({
    triage: oc.router({
      items: oc.router({
        request: oc
          .route({
            method: "POST",
            path: "/support-example/triage/work-items",
            tags: supportExampleTag,
            summary: "Queue triage work item",
            description: "Creates a queue-scoped triage work item lifecycle record in queued state.",
            operationId: "supportExampleRequestWorkItem",
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
                  source: Type.Optional(TriageWorkItemSourceSchema),
                },
                {
                  additionalProperties: false,
                  description: "Request payload for queueing a triage work item.",
                },
              ),
            ),
          )
          .output(
            schema(
              Type.Object(
                {
                  workItem: TriageWorkItemSchema,
                },
                {
                  additionalProperties: false,
                  description: "Response envelope containing the newly queued triage work item.",
                },
              ),
            ),
          )
          .errors(supportExampleClientErrorMap),

        list: oc
          .route({
            method: "GET",
            path: "/support-example/triage/work-items",
            tags: supportExampleTag,
            summary: "List triage work items",
            description: "Returns queue-scoped triage work items, optionally filtered by lifecycle status.",
            operationId: "supportExampleListWorkItems",
          })
          .input(
            schema(
              Type.Object(
                {
                  status: Type.Optional(TriageWorkItemStatusSchema),
                },
                {
                  additionalProperties: false,
                  description: "Optional query filter for listing triage work items by lifecycle status.",
                },
              ),
            ),
          )
          .output(
            schema(
              Type.Object(
                {
                  workItems: Type.Array(TriageWorkItemSchema, {
                    description: "Triage work items matching the provided listing filter.",
                  }),
                },
                {
                  additionalProperties: false,
                  description: "Response envelope containing matching triage work items.",
                },
              ),
            ),
          )
          .errors(supportExampleClientErrorMap),

        get: oc
          .route({
            method: "GET",
            path: "/support-example/triage/work-items/{workItemId}",
            tags: supportExampleTag,
            summary: "Get triage work item",
            description: "Fetches one triage work item lifecycle record by stable identifier.",
            operationId: "supportExampleGetWorkItem",
          })
          .input(
            schema(
              Type.Object(
                {
                  workItemId: Type.String({
                    minLength: 1,
                    description: "Stable identifier of the triage work item to fetch.",
                  }),
                },
                {
                  additionalProperties: false,
                  description: "Route parameters for fetching one triage work item.",
                },
              ),
            ),
          )
          .output(
            schema(
              Type.Object(
                {
                  workItem: TriageWorkItemSchema,
                },
                {
                  additionalProperties: false,
                  description: "Response envelope containing the requested triage work item.",
                },
              ),
            ),
          )
          .errors(supportExampleClientErrorMap),

        start: oc
          .route({
            method: "POST",
            path: "/support-example/triage/work-items/{workItemId}/start",
            tags: supportExampleTag,
            summary: "Start triage work item",
            description: "Transitions a queued triage work item into running state.",
            operationId: "supportExampleStartWorkItem",
          })
          .input(
            schema(
              Type.Object(
                {
                  workItemId: Type.String({
                    minLength: 1,
                    description: "Stable identifier of the queued triage work item to start.",
                  }),
                },
                {
                  additionalProperties: false,
                  description: "Route parameters required to start a triage work item.",
                },
              ),
            ),
          )
          .output(
            schema(
              Type.Object(
                {
                  workItem: TriageWorkItemSchema,
                },
                {
                  additionalProperties: false,
                  description: "Response envelope containing the running triage work item.",
                },
              ),
            ),
          )
          .errors(supportExampleClientErrorMap),

        complete: oc
          .route({
            method: "POST",
            path: "/support-example/triage/work-items/{workItemId}/complete",
            tags: supportExampleTag,
            summary: "Complete triage work item",
            description: "Finalizes a running triage work item with triage metrics.",
            operationId: "supportExampleCompleteWorkItem",
          })
          .input(
            schema(
              Type.Object(
                {
                  workItemId: Type.String({
                    minLength: 1,
                    description: "Stable identifier of the triage work item being finalized.",
                  }),
                  succeeded: Type.Boolean({
                    description: "Whether triage completed successfully.",
                  }),
                  triagedTicketCount: Type.Optional(
                    Type.Integer({
                      minimum: 0,
                      description: "Count of tickets triaged during this completion transition.",
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
                  description: "Completion payload for transitioning a triage work item to terminal state.",
                },
              ),
            ),
          )
          .output(
            schema(
              Type.Object(
                {
                  workItem: TriageWorkItemSchema,
                },
                {
                  additionalProperties: false,
                  description: "Response envelope containing the finalized triage work item.",
                },
              ),
            ),
          )
          .errors(supportExampleClientErrorMap),
      }),
    }),
  }),
});

export type SupportExampleApiContract = typeof supportExampleApiContract;
