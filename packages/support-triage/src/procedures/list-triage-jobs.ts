import { os } from "@orpc/server";
import { Type } from "typebox";
import { schema } from "../../../orpc-standards";
import type { SupportTriageProcedureContext } from "../context";
import { TriageJobSchema, TriageJobStatusSchema } from "../domain";
import { listSupportTriageJobs } from "../service";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

const o = os.$context<SupportTriageProcedureContext>();

export const listTriageJobsProcedure = o
  .input(
    schema(
      Type.Object(
        {
          status: Type.Optional(TriageJobStatusSchema),
        },
        { additionalProperties: false, description: "Optional status filter for triage job listing." },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          jobs: Type.Array(TriageJobSchema),
        },
        { additionalProperties: false, description: "List envelope for triage jobs." },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await listSupportTriageJobs(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  });
