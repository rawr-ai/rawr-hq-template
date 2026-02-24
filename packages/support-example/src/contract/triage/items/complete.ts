import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TriageWorkItemSchema } from "../../../domain";
import { supportExampleContractErrorMap } from "../../errors";

export const completeItemContract = oc
  .input(
    schema(
      Type.Object(
        {
          workItemId: Type.String({
            minLength: 1,
            description: "Stable identifier of the support triage work item being finalized.",
          }),
          succeeded: Type.Boolean({
            description: "Whether triage completed successfully.",
          }),
          triagedTicketCount: Type.Optional(
            Type.Integer({
              minimum: 0,
              description: "Count of tickets triaged during this completion transition.",
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
          description: "Completion payload for transitioning a support triage work item to terminal state.",
        },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          workItem: TriageWorkItemSchema,
        },
        {
          additionalProperties: false,
          description: "Response envelope containing the finalized support triage work item.",
        },
      ),
    ),
  )
  .errors(supportExampleContractErrorMap);
