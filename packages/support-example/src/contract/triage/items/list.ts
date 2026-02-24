import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema, TriageWorkItemStatusSchema } from "../../../domain";
import { supportExampleContractErrorMap } from "../../errors";

export const listItemsContract = oc
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
  .errors(supportExampleContractErrorMap);
