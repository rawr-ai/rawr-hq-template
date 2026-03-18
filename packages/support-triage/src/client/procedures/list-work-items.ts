import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema, TriageWorkItemStatusSchema } from "../../domain";
import type { SupportTriageClientContext } from "../context";
import { listSupportTriageWorkItems } from "../../service/lifecycle";
import { supportTriageClientErrorMap } from "../errors";
import { throwSupportTriageDomainErrorAsClientError } from "../errors";

const o = os.$context<SupportTriageClientContext>();

export const listWorkItemsProcedure = o
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
  .errors(supportTriageClientErrorMap)
  .handler(async ({ context, input, errors }) => {
    try {
      return await listSupportTriageWorkItems(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsClientError(error, errors);
    }
  });
