import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema } from "../../../domain";
import { supportExampleContractErrorMap } from "../../errors";

export const getItemContract = oc
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
  .errors(supportExampleContractErrorMap);
