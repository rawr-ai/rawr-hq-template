import { createWorkflowRouterBuilder } from "@rawr/hq-sdk/workflows";
import type { SupportExampleClient } from "./context";
import { supportExampleWorkflowContract } from "./contract";
import type { SupportExampleWorkflowContext } from "./context";
import {
  SUPPORT_EXAMPLE_CAPABILITY,
  SUPPORT_EXAMPLE_EVENT_NAME,
  createQueuedSupportExampleRun,
  createSupportExampleRunId,
  normalizeSupportExampleQueueId,
  normalizeSupportExampleRunId,
} from "./models";
import { getSupportExampleRun, saveSupportExampleRun } from "./run-store";

const os = createWorkflowRouterBuilder<typeof supportExampleWorkflowContract, SupportExampleWorkflowContext>(
  supportExampleWorkflowContract,
);

export function createSupportExampleWorkflowRouter(
  resolveSupportExampleClient: (repoRoot: string) => SupportExampleClient,
) {
  return os.router({
    supportExample: {
      triage: {
        triggerRun: os.supportExample.triage.triggerRun.handler(async ({ context, input, errors }) => {
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
          const supportExample = resolveSupportExampleClient(context.repoRoot);
          const { workItem } = await supportExample.triage.items.request({
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
        }),
        getStatus: os.supportExample.triage.getStatus.handler(async ({ input, errors }) => {
          if (!input.runId) {
            return {
              capability: SUPPORT_EXAMPLE_CAPABILITY,
              healthy: true,
              run: null,
            };
          }

          const runId = normalizeSupportExampleRunId(input.runId);
          if (!runId) {
            throw errors.INVALID_SUPPORT_EXAMPLE_RUN_ID({
              message: "runId must be a valid identifier",
              data: { runId: input.runId },
            });
          }

          const run = getSupportExampleRun(runId);
          if (!run) {
            throw errors.SUPPORT_EXAMPLE_RUN_NOT_FOUND({
              message: "support triage run not found",
              data: { runId },
            });
          }

          return {
            capability: SUPPORT_EXAMPLE_CAPABILITY,
            healthy: true,
            run,
          };
        }),
      },
    },
  });
}

export type SupportExampleWorkflowRouter = ReturnType<typeof createSupportExampleWorkflowRouter>;
