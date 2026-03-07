import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { SUPPORT_EXAMPLE_CAPABILITY, SupportExampleRunSchema, normalizeSupportExampleRunId } from "../../models";
import { workflowProcedure } from "../../orpc";
import { getSupportExampleRun } from "../../run-store";

const getStatusInputSchema = schema(
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
);

const getStatusOutputSchema = schema(
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
);

export const getStatus = workflowProcedure
  .route({
    method: "GET",
    path: "/support-example/triage/status",
    tags: ["support-example"],
    summary: "Get support triage capability status and optional run status",
    description: "Returns capability health plus optional status details for a specific support triage run.",
    operationId: "supportExampleGetStatus",
  })
  .input(getStatusInputSchema)
  .output(getStatusOutputSchema)
  .handler(async ({ input, errors }) => {
    if (!input.runId) {
      return {
        capability: SUPPORT_EXAMPLE_CAPABILITY,
        healthy: true,
        run: null,
      };
    }

    const runId = normalizeSupportExampleRunId(input.runId);
    if (!runId) {
      throw errors.INVALID_SUPPORT_EXAMPLE_RUN_ID({
        message: "runId must be a valid identifier",
        data: { runId: input.runId },
      });
    }

    const run = getSupportExampleRun(runId);
    if (!run) {
      throw errors.SUPPORT_EXAMPLE_RUN_NOT_FOUND({
        message: "support triage run not found",
        data: { runId },
      });
    }

    return {
      capability: SUPPORT_EXAMPLE_CAPABILITY,
      healthy: true,
      run,
    };
  });
