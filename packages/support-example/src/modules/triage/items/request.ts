import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema, TriageWorkItemSourceSchema, type TriageWorkItem } from "../../../domain";
import { normalizeSupportExampleId } from "../../../domain/ids";
import type { SupportExampleServiceContext } from "../context";
import { supportExampleTriageErrorMap } from "../errors";

const triageItemProcedure = os.$context<SupportExampleServiceContext>().errors(supportExampleTriageErrorMap);

export const requestItemProcedure = triageItemProcedure
  .route({
    method: "POST",
    path: "/support-example/triage/work-items",
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
          description: "Request payload for queueing a support triage work item.",
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
          description: "Response envelope containing the newly queued support triage work item.",
        },
      ),
    ),
  )
  .handler(async ({ context, input, errors }) => {
    const queueId = normalizeSupportExampleId(input.queueId);
    if (!queueId) {
      throw errors.INVALID_QUEUE_ID({
        message: "Invalid queueId",
        data: { queueId: input.queueId },
      });
    }

    const requestedBy = normalizeSupportExampleId(input.requestedBy);
    if (!requestedBy) {
      throw errors.INVALID_REQUESTED_BY({
        message: "Invalid requestedBy",
        data: { requestedBy: input.requestedBy },
      });
    }

    const generatedWorkItemId = normalizeSupportExampleId(context.deps.generateWorkItemId());
    if (!generatedWorkItemId) {
      throw errors.INVALID_WORK_ITEM_ID({
        message: "Generated work item id is invalid",
        data: {},
      });
    }

    const now = context.deps.now();
    const workItem: TriageWorkItem = {
      workItemId: generatedWorkItemId,
      queueId,
      requestedBy,
      source: input.source ?? "manual",
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };

    await context.deps.store.save(workItem);
    return { workItem };
  });
