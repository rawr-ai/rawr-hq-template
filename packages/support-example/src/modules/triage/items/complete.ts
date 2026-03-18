import { os } from "@orpc/server";
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import {
  TriageWorkItemSchema,
  canTransitionTriageWorkItemStatus,
  isTerminalTriageWorkItemStatus,
  type TriageWorkItem,
  type TriageWorkItemStatus,
} from "../../../domain";
import { normalizeSupportExampleId } from "../../../domain/ids";
import type { SupportExampleServiceContext } from "../context";
import { supportExampleTriageErrorMap } from "../errors";

const triageItemProcedure = os.$context<SupportExampleServiceContext>().errors(supportExampleTriageErrorMap);

function normalizeCount(
  value: number | undefined,
  label: "triagedTicketCount" | "escalatedTicketCount",
  onInvalid: (message: string) => never,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value) || value < 0) {
    return onInvalid(`${label} must be a non-negative number`);
  }

  return Math.floor(value);
}

export const completeItemProcedure = triageItemProcedure
  .route({
    method: "POST",
    path: "/support-example/triage/work-items/{workItemId}/complete",
  })
  .input(
    schema(
      Type.Object(
        {
          workItemId: Type.String({
            minLength: 1,
            description: "Stable identifier of the support triage work item being finalized.",
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
          description: "Completion payload for transitioning a support triage work item to terminal state.",
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
          description: "Response envelope containing the finalized support triage work item.",
        },
      ),
    ),
  )
  .handler(async ({ context, input, errors }) => {
    const workItemId = normalizeSupportExampleId(input.workItemId);
    if (!workItemId) {
      throw errors.INVALID_WORK_ITEM_ID({
        message: "Invalid workItemId",
        data: { workItemId: input.workItemId },
      });
    }

    const failInvalidCompletionInput = (message: string): never => {
      throw errors.INVALID_COMPLETION_INPUT({
        message,
        data: { workItemId },
      });
    };

    const triagedTicketCount = normalizeCount(input.triagedTicketCount, "triagedTicketCount", failInvalidCompletionInput);
    const escalatedTicketCount = normalizeCount(
      input.escalatedTicketCount,
      "escalatedTicketCount",
      failInvalidCompletionInput,
    );

    if (input.succeeded && triagedTicketCount === undefined) {
      failInvalidCompletionInput("triagedTicketCount is required when succeeded=true");
    }

    if (!input.succeeded && (!input.failureReason || input.failureReason.trim() === "")) {
      failInvalidCompletionInput("failureReason is required when succeeded=false");
    }

    if (
      triagedTicketCount !== undefined &&
      escalatedTicketCount !== undefined &&
      escalatedTicketCount > triagedTicketCount
    ) {
      failInvalidCompletionInput("escalatedTicketCount cannot exceed triagedTicketCount");
    }

    const current = await context.deps.store.get(workItemId);
    if (!current) {
      throw errors.WORK_ITEM_NOT_FOUND({
        message: `Support triage work item not found: ${workItemId}`,
        data: { workItemId },
      });
    }

    const nextStatus: TriageWorkItemStatus = input.succeeded ? "completed" : "failed";
    if (!canTransitionTriageWorkItemStatus(current.status, nextStatus)) {
      throw errors.INVALID_STATUS_TRANSITION({
        message: `Cannot transition ${current.status} -> ${nextStatus}`,
        data: {
          workItemId: current.workItemId,
          from: current.status,
          to: nextStatus,
        },
      });
    }

    if (isTerminalTriageWorkItemStatus(current.status)) {
      throw errors.INVALID_STATUS_TRANSITION({
        message: `Work item ${current.workItemId} is already terminal`,
        data: {
          workItemId: current.workItemId,
          from: current.status,
          to: current.status,
        },
      });
    }

    const terminalAt = context.deps.now();
    const workItem: TriageWorkItem = input.succeeded
      ? {
          ...current,
          status: "completed",
          updatedAt: terminalAt,
          completedAt: terminalAt,
          triagedTicketCount,
          escalatedTicketCount: escalatedTicketCount ?? 0,
          failedAt: undefined,
          failureReason: undefined,
          failureCode: undefined,
        }
      : {
          ...current,
          status: "failed",
          updatedAt: terminalAt,
          completedAt: undefined,
          triagedTicketCount,
          escalatedTicketCount,
          failedAt: terminalAt,
          failureReason: input.failureReason?.trim(),
          failureCode: input.failureCode?.trim(),
        };

    await context.deps.store.save(workItem);
    return { workItem };
  });
