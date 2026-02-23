import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageJobSchema } from "../domain";
import type { SupportTriageProcedureContext } from "../context";
import { getSupportTriageJob } from "../service/lifecycle";
import { throwSupportTriageDomainErrorAsOrpc } from "./boundary-errors";

const o = os.$context<SupportTriageProcedureContext>();

export const getJobProcedure = o
  .input(
    schema(
      Type.Object(
        {
          jobId: Type.String({
            minLength: 1,
            description: "Stable identifier of the support triage job to fetch.",
          }),
        },
        {
          additionalProperties: false,
          description: "Route parameters for fetching one support triage job.",
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
          description: "Response envelope containing the requested support triage job lifecycle record.",
        },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await getSupportTriageJob(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsOrpc(error);
    }
  });
