import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { supportExampleWorkflowErrorMap } from "../errors";
import { SupportExampleRunSchema, type SupportExampleRun } from "./trigger-run";

const supportExampleTag = ["support-example"] as const;

export const getStatusContract = oc
  .route({
    method: "GET",
    path: "/support-example/triage/status",
    tags: supportExampleTag,
    summary: "Get support triage capability status and optional run status",
    description: "Returns capability health plus optional status details for a specific support triage run.",
    operationId: "supportExampleGetStatus",
  })
  .input(
    schema(
      Type.Object(
        {
          runId: Type.Optional(
            Type.String({
              minLength: 1,
              description: "Optional run identifier used to fetch status for one support triage run.",
            }),
          ),
        },
        {
          additionalProperties: false,
          description: "Optional query input for retrieving a specific run status projection.",
        },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          capability: Type.Literal("support-example", {
            description: "Capability identifier for the workflow surface.",
          }),
          healthy: Type.Boolean({
            description: "Health indicator for workflow trigger/status surface availability.",
          }),
          run: Type.Union([SupportExampleRunSchema, Type.Null()], {
            description: "Run projection when runId is provided and found; otherwise null.",
          }),
        },
        {
          additionalProperties: false,
          description: "Capability status response with optional run details.",
        },
      ),
    ),
  )
  .errors(supportExampleWorkflowErrorMap);

export type GetStatusInput = {
  runId?: string;
};

export type GetStatusOutput = {
  capability: "support-example";
  healthy: boolean;
  run: SupportExampleRun | null;
};
