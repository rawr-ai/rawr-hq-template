import { oc } from "@orpc/contract";
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { supportExampleWorkflowErrorMap } from "./errors";
import { SupportExampleRunSchema } from "./models";

const workflowContractProcedure = oc.errors(supportExampleWorkflowErrorMap);

const triggerRunInputSchema = schema(
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
);

const triggerRunOutputSchema = schema(
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
);

const getStatusInputSchema = schema(
  Type.Object(
    {
      runId: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Optional run identifier used to fetch status for one support triage run.",
        }),
      ),
    },
    {
      additionalProperties: false,
      description: "Optional query input for retrieving a specific run status projection.",
    },
  ),
);

const getStatusOutputSchema = schema(
  Type.Object(
    {
      capability: Type.Literal("support-example", {
        description: "Capability identifier for the workflow surface.",
      }),
      healthy: Type.Boolean({
        description: "Health indicator for workflow trigger/status surface availability.",
      }),
      run: Type.Union([SupportExampleRunSchema, Type.Null()], {
        description: "Run projection when runId is provided and found; otherwise null.",
      }),
    },
    {
      additionalProperties: false,
      description: "Capability status response with optional run details.",
    },
  ),
);

export const supportExampleWorkflowContract = {
  supportExample: {
    triage: {
      triggerRun: workflowContractProcedure
        .route({
          method: "POST",
          path: "/support-example/triage/runs",
          tags: ["support-example"],
          summary: "Trigger a support triage run",
          description: "Queues a durable support triage run and dispatches the corresponding Inngest event.",
          operationId: "supportExampleTriggerRun",
        })
        .input(triggerRunInputSchema)
        .output(triggerRunOutputSchema),
      getStatus: workflowContractProcedure
        .route({
          method: "GET",
          path: "/support-example/triage/status",
          tags: ["support-example"],
          summary: "Get support triage capability status and optional run status",
          description: "Returns capability health plus optional status details for a specific support triage run.",
          operationId: "supportExampleGetStatus",
        })
        .input(getStatusInputSchema)
        .output(getStatusOutputSchema),
    },
  },
} as const;

export type SupportExampleWorkflowContract = typeof supportExampleWorkflowContract;
