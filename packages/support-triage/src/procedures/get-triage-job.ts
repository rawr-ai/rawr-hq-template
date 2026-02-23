import { os } from "@orpc/server";
import { Type } from "typebox";
import { schema } from "../../../orpc-standards";
import type { SupportTriageProcedureContext } from "../context";
import { TriageJobSchema } from "../domain";
import { getSupportTriageJob } from "../service";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

const o = os.$context<SupportTriageProcedureContext>();

export const getTriageJobProcedure = o
  .input(
    schema(
      Type.Object(
        {
          jobId: Type.String({ minLength: 1, description: "Triage job identifier." }),
        },
        { additionalProperties: false, description: "Lookup input for a triage job." },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          job: TriageJobSchema,
        },
        { additionalProperties: false, description: "Requested triage job envelope." },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await getSupportTriageJob(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  });
