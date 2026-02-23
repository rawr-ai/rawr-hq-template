import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema, TriageWorkItemSourceSchema } from "../domain";
import type { SupportTriageProcedureContext } from "../context";
import { requestSupportTriageWorkItem } from "../service/lifecycle";
import { throwSupportTriageDomainErrorAsOrpc } from "./boundary-errors";

const o = os.$context<SupportTriageProcedureContext>();

export const requestWorkItemProcedure = o
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
  .handler(async ({ context, input }) => {
    try {
      return await requestSupportTriageWorkItem(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsOrpc(error);
    }
  });
