import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema } from "../domain";
import type { SupportTriageProcedureContext } from "../context";
import { getSupportTriageWorkItem } from "../service/lifecycle";
import { throwSupportTriageDomainErrorAsOrpc } from "./boundary-errors";

const o = os.$context<SupportTriageProcedureContext>();

export const getWorkItemProcedure = o
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
  .handler(async ({ context, input }) => {
    try {
      return await getSupportTriageWorkItem(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsOrpc(error);
    }
  });
