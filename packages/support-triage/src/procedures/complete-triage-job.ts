import { os } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageJobSchema } from "../domain";
import type { SupportTriageProcedureContext } from "../context";
import { completeSupportTriageJob } from "../service/lifecycle";
import { throwSupportTriageDomainErrorAsOrpc } from "./boundary-errors";

const o = os.$context<SupportTriageProcedureContext>();

export const completeTriageJobProcedure = o
  .input(
    schema(
      Type.Object(
        {
          jobId: Type.String({
            minLength: 1,
            description: "Stable identifier of the support triage job being finalized.",
          }),
          succeeded: Type.Boolean({
            description: "Whether triage completed successfully.",
          }),
          triagedTicketCount: Type.Optional(
            Type.Integer({
              minimum: 0,
              description: "Count of tickets triaged during this job completion transition.",
            }),
          ),
          escalatedTicketCount: Type.Optional(
            Type.Integer({
              minimum: 0,
              description: "Count of triaged tickets escalated onward.",
            }),
          ),
          failureReason: Type.Optional(
            Type.String({
              minLength: 1,
              description: "Failure reason required when triage does not succeed.",
            }),
          ),
          failureCode: Type.Optional(
            Type.String({
              minLength: 1,
              description: "Optional machine-readable failure code.",
            }),
          ),
        },
        {
          additionalProperties: false,
          description: "Completion payload for transitioning a support triage job to terminal state.",
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
          description: "Response envelope containing the finalized support triage job lifecycle record.",
        },
      ),
    ),
  )
  .handler(async ({ context, input }) => {
    try {
      return await completeSupportTriageJob(context.deps, input);
    } catch (error) {
      throwSupportTriageDomainErrorAsOrpc(error);
    }
  });
