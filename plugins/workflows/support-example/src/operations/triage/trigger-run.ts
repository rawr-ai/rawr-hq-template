import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import {
  SUPPORT_EXAMPLE_EVENT_NAME,
  SupportExampleRunSchema,
  createQueuedSupportExampleRun,
  createSupportExampleRunId,
  normalizeSupportExampleQueueId,
  normalizeSupportExampleRunId,
} from "../../models";
import { workflowProcedure } from "../../orpc";
import { getSupportExampleRun, saveSupportExampleRun } from "../../run-store";

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

export const triggerRun = workflowProcedure
  .route({
    method: "POST",
    path: "/support-example/triage/runs",
    tags: ["support-example"],
    summary: "Trigger a support triage run",
    description: "Queues a durable support triage run and dispatches the corresponding Inngest event.",
    operationId: "supportExampleTriggerRun",
  })
  .input(triggerRunInputSchema)
  .output(triggerRunOutputSchema)
  .handler(async ({ context, input, errors }) => {
    const queueId = normalizeSupportExampleQueueId(input.queueId);
    if (!queueId) {
      throw errors.INVALID_QUEUE_ID({
        message: "queueId must be a valid identifier",
        data: { queueId: input.queueId },
      });
    }

    const requestedBy = input.requestedBy.trim();
    if (requestedBy.length === 0) {
      throw errors.INVALID_REQUESTED_BY({
        message: "requestedBy must be a non-empty string",
        data: { requestedBy: input.requestedBy },
      });
    }

    const runId = input.runId ? normalizeSupportExampleRunId(input.runId) : createSupportExampleRunId();
    if (!runId) {
      throw errors.INVALID_SUPPORT_EXAMPLE_RUN_ID({
        message: "runId must be a valid identifier when provided",
        data: { runId: input.runId },
      });
    }

    const existingRun = getSupportExampleRun(runId);
    if (existingRun) {
      return {
        accepted: false,
        run: existingRun,
        eventIds: [],
      };
    }

    const dryRun = input.dryRun ?? false;

    const { workItem } = await context.supportExample.triage.items.request({
      queueId,
      requestedBy,
      source: "workflow",
    });

    const queuedRun = createQueuedSupportExampleRun({
      runId,
      workItemId: workItem.workItemId,
      queueId,
      requestedBy,
      dryRun,
    });

    saveSupportExampleRun(queuedRun);

    try {
      const dispatch = await context.inngestClient.send({
        name: SUPPORT_EXAMPLE_EVENT_NAME,
        data: {
          runId,
          workItemId: workItem.workItemId,
          repoRoot: context.repoRoot,
          queueId,
          requestedBy,
          dryRun,
          requestId: context.requestId,
          correlationId: context.correlationId,
        },
      });

      return {
        accepted: true,
        run: queuedRun,
        eventIds: dispatch.ids,
      };
    } catch (error) {
      const failedAt = new Date().toISOString();
      const failedRun = {
        ...queuedRun,
        status: "failed" as const,
        finishedAt: failedAt,
        error: error instanceof Error ? error.message : String(error),
      };

      saveSupportExampleRun(failedRun);

      throw errors.SUPPORT_EXAMPLE_TRIGGER_FAILED({
        message: failedRun.error,
        data: { runId },
      });
    }
  });
