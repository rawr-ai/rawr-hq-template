import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageJobSchema } from "../domain";
import type { SupportTriageProcedureContext } from "../context";
import { startSupportTriageJob } from "../service/lifecycle";
import { throwSupportTriageDomainErrorAsOrpc } from "./boundary-errors";

const o = os.$context<SupportTriageProcedureContext>();

export const startTriageJobProcedure = o
  .input(
    schema(
      Type.Object(
        {
          jobId: Type.String({
            minLength: 1,
            description: "Stable identifier of the queued support triage job to start.",
          }),
        },
        {
          additionalProperties: false,
          description: "Route parameters required to start a support triage job.",
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
          description: "Response envelope containing the running support triage job lifecycle record.",
        },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await startSupportTriageJob(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsOrpc(error);
    }
  });
