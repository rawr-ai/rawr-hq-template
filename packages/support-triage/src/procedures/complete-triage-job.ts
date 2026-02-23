import { os } from "@orpc/server";
import { Type } from "typebox";
import { schema } from "../../../orpc-standards";
import type { SupportTriageProcedureContext } from "../context";
import { TriageJobSchema } from "../domain";
import { completeSupportTriageJob } from "../service";
import { throwSupportTriageDomainErrorAsBoundary } from "../errors";

const o = os.$context<SupportTriageProcedureContext>();

export const completeTriageJobProcedure = o
  .input(
    schema(
      Type.Object(
        {
          jobId: Type.String({ minLength: 1, description: "Running triage job identifier." }),
          succeeded: Type.Boolean({ description: "Whether triage finished successfully." }),
          triagedTicketCount: Type.Optional(
            Type.Integer({
              minimum: 0,
              description: "Number of tickets triaged by this completion transition.",
            }),
          ),
          escalatedTicketCount: Type.Optional(
            Type.Integer({
              minimum: 0,
              description: "Number of triaged tickets escalated during completion.",
            }),
          ),
          failureReason: Type.Optional(Type.String({ minLength: 1, description: "Failure reason required when succeeded=false." })),
          failureCode: Type.Optional(Type.String({ minLength: 1, description: "Optional machine-readable failure code." })),
        },
        { additionalProperties: false, description: "Completion payload for terminal triage transitions." },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          job: TriageJobSchema,
        },
        { additionalProperties: false, description: "Terminal triage job envelope." },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await completeSupportTriageJob(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsBoundary(error);
    }
  });
