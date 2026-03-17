import { os } from "@orpc/server";
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { TriageWorkItemSchema } from "../../../domain";
import { normalizeSupportExampleId } from "../../../domain/ids";
import type { SupportExampleServiceContext } from "../context";
import { supportExampleTriageErrorMap } from "../errors";

const triageItemProcedure = os.$context<SupportExampleServiceContext>().errors(supportExampleTriageErrorMap);

export const getItemProcedure = triageItemProcedure
  .route({
    method: "GET",
    path: "/support-example/triage/work-items/{workItemId}",
  })
  .input(
    schema(
      Type.Object(
        {
          workItemId: Type.String({
            minLength: 1,
            description: "Stable identifier of the support triage work item to fetch.",
          }),
        },
        {
          additionalProperties: false,
          description: "Route parameters for fetching one support triage work item.",
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
          description: "Response envelope containing the requested support triage work item.",
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

    const workItem = await context.deps.store.get(workItemId);
    if (!workItem) {
      throw errors.WORK_ITEM_NOT_FOUND({
        message: `Support triage work item not found: ${workItemId}`,
        data: { workItemId },
      });
    }

    return { workItem };
  });
