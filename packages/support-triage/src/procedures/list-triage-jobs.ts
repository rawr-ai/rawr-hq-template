import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageJobSchema, TriageJobStatusSchema } from "../domain";
import type { SupportTriageProcedureContext } from "../context";
import { listSupportTriageJobs } from "../service/lifecycle";
import { throwSupportTriageDomainErrorAsOrpc } from "./boundary-errors";

const o = os.$context<SupportTriageProcedureContext>();

export const listTriageJobsProcedure = o
  .input(
    schema(
      Type.Object(
        {
          status: Type.Optional(TriageJobStatusSchema),
        },
        {
          additionalProperties: false,
          description: "Optional filter input for listing support triage jobs by lifecycle status.",
        },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          jobs: Type.Array(TriageJobSchema, {
            description: "Support triage job lifecycle records matching the provided listing filter.",
          }),
        },
        {
          additionalProperties: false,
          description: "Response envelope containing matching support triage job lifecycle records.",
        },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await listSupportTriageJobs(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsOrpc(error);
    }
  });
