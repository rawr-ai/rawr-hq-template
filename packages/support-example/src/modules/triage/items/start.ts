import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema, canTransitionTriageWorkItemStatus, type TriageWorkItem, type TriageWorkItemStatus } from "../../../domain";
import { normalizeSupportExampleId } from "../../../domain/ids";
import type { SupportExampleServiceContext } from "../context";
import { supportExampleTriageErrorMap } from "../errors";

const triageItemProcedure = os.$context<SupportExampleServiceContext>().errors(supportExampleTriageErrorMap);

export const startItemProcedure = triageItemProcedure
  .route({
    method: "POST",
    path: "/support-example/triage/work-items/{workItemId}/start",
  })
  .input(
    schema(
      Type.Object(
        {
          workItemId: Type.String({
            minLength: 1,
            description: "Stable identifier of the queued support triage work item to start.",
          }),
        },
        {
          additionalProperties: false,
          description: "Route parameters required to start a support triage work item.",
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
          description: "Response envelope containing the running support triage work item.",
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

    const current = await context.deps.store.get(workItemId);
    if (!current) {
      throw errors.WORK_ITEM_NOT_FOUND({
        message: `Support triage work item not found: ${workItemId}`,
        data: { workItemId },
      });
    }

    const nextStatus: TriageWorkItemStatus = "running";
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

    const startedAt = context.deps.now();
    const workItem: TriageWorkItem = {
      ...current,
      status: nextStatus,
      updatedAt: startedAt,
      startedAt,
      completedAt: undefined,
      triagedTicketCount: undefined,
      escalatedTicketCount: undefined,
      failedAt: undefined,
      failureReason: undefined,
      failureCode: undefined,
    };

    await context.deps.store.save(workItem);
    return { workItem };
  });
