import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema, TriageWorkItemStatusSchema } from "../../../domain";
import type { SupportExampleServiceContext } from "../context";
import { supportExampleTriageErrorMap } from "../errors";

const triageItemProcedure = os.$context<SupportExampleServiceContext>().errors(supportExampleTriageErrorMap);

export const listItemsProcedure = triageItemProcedure
  .route({
    method: "GET",
    path: "/support-example/triage/work-items",
  })
  .input(
    schema(
      Type.Object(
        {
          status: Type.Optional(TriageWorkItemStatusSchema),
        },
        {
          additionalProperties: false,
          description: "Optional filter input for listing support triage work items by lifecycle status.",
        },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          workItems: Type.Array(TriageWorkItemSchema, {
            description: "Support triage work items matching the provided listing filter.",
          }),
        },
        {
          additionalProperties: false,
          description: "Response envelope containing matching support triage work items.",
        },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    const all = await context.deps.store.list();
    const filtered = input.status ? all.filter((workItem) => workItem.status === input.status) : all;

    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { workItems: filtered };
  });
