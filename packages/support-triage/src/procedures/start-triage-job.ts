import { os } from "@orpc/server";
import { Type } from "typebox";
import { schema } from "../../../orpc-standards";
import type { SupportTriageProcedureContext } from "../context";
import { TriageJobSchema } from "../domain";
import { startSupportTriageJob } from "../service";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

const o = os.$context<SupportTriageProcedureContext>();

export const startTriageJobProcedure = o
  .input(
    schema(
      Type.Object(
        {
          jobId: Type.String({ minLength: 1, description: "Queued triage job identifier." }),
        },
        { additionalProperties: false, description: "Input required to transition a job to running." },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          job: TriageJobSchema,
        },
        { additionalProperties: false, description: "Running triage job envelope." },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await startSupportTriageJob(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  });
