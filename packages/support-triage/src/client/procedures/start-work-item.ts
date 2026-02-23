import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema } from "../../domain";
import type { SupportTriageClientContext } from "../context";
import { startSupportTriageWorkItem } from "../../service/lifecycle";
import { supportTriageClientErrorMap } from "../errors";
import { throwSupportTriageDomainErrorAsClientError } from "../errors";

const o = os.$context<SupportTriageClientContext>();

export const startWorkItemProcedure = o
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
  .errors(supportTriageClientErrorMap)
  .handler(async ({ context, input, errors }) => {
    try {
      return await startSupportTriageWorkItem(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsClientError(error, errors);
    }
  });
