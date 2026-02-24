import { ORPCError } from "@orpc/server";
import { SUPPORT_EXAMPLE_CAPABILITY, normalizeSupportExampleRunId } from "../models";
import { getSupportExampleRun } from "../run-store";
import { os } from "../orpc";

export const getStatus = os.supportExample.triage.getStatus.handler(async ({ input }) => {
  if (!input.runId) {
    return {
      capability: SUPPORT_EXAMPLE_CAPABILITY,
      healthy: true,
      run: null,
    };
  }

  const runId = normalizeSupportExampleRunId(input.runId);
  if (!runId) {
    throw new ORPCError("INVALID_SUPPORT_EXAMPLE_RUN_ID", {
      status: 400,
      message: "runId must be a valid identifier",
      data: { runId: input.runId },
    });
  }

  const run = getSupportExampleRun(runId);
  if (!run) {
    throw new ORPCError("SUPPORT_EXAMPLE_RUN_NOT_FOUND", {
      status: 404,
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
