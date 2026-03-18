import { os } from "@orpc/server";
import { Type } from "typebox";
import { schema } from "../../../orpc-standards";
import type { SupportTriageProcedureContext } from "../context";
import { TriageJobSchema, TriageJobSourceSchema } from "../domain";
import { requestSupportTriageJob } from "../service";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

const o = os.$context<SupportTriageProcedureContext>();

export const requestTriageJobProcedure = o
  .input(
    schema(
      Type.Object(
        {
          queueId: Type.String({ minLength: 1, description: "Support queue identifier to triage." }),
          requestedBy: Type.String({ minLength: 1, description: "Principal requesting triage." }),
          source: Type.Optional(TriageJobSourceSchema),
        },
        { additionalProperties: false, description: "Input payload for queueing a triage job." },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          job: TriageJobSchema,
        },
        { additionalProperties: false, description: "Queued triage job envelope." },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await requestSupportTriageJob(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  });
