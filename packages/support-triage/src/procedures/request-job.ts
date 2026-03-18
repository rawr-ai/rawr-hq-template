import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageJobSchema, TriageJobSourceSchema } from "../domain";
import type { SupportTriageProcedureContext } from "../context";
import { requestSupportTriageJob } from "../service/lifecycle";
import { throwSupportTriageDomainErrorAsOrpc } from "./boundary-errors";

const o = os.$context<SupportTriageProcedureContext>();

export const requestJobProcedure = o
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
          source: Type.Optional(TriageJobSourceSchema),
        },
        {
          additionalProperties: false,
          description: "Request payload for queueing a support triage job.",
        },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          job: TriageJobSchema,
        },
        {
          additionalProperties: false,
          description: "Response envelope containing the newly queued support triage job.",
        },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await requestSupportTriageJob(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsOrpc(error);
    }
  });
