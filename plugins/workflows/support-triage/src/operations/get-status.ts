import { ORPCError } from "@orpc/server";
import { SUPPORT_TRIAGE_CAPABILITY, normalizeSupportTriageRunId } from "../models";
import { getSupportTriageRun } from "../run-store";
import { os } from "../orpc";

export const getStatus = os.getStatus.handler(async ({ input }) => {
  if (!input.runId) {
    return {
      capability: SUPPORT_TRIAGE_CAPABILITY,
      healthy: true,
      run: null,
    };
  }

  const runId = normalizeSupportTriageRunId(input.runId);
  if (!runId) {
    throw new ORPCError("INVALID_SUPPORT_TRIAGE_RUN_ID", {
      status: 400,
      message: "runId must be a valid identifier",
      data: { runId: input.runId },
    });
  }

  const run = getSupportTriageRun(runId);
  if (!run) {
    throw new ORPCError("SUPPORT_TRIAGE_RUN_NOT_FOUND", {
      status: 404,
      message: "support triage run not found",
      data: { runId },
    });
  }

  return {
    capability: SUPPORT_TRIAGE_CAPABILITY,
    healthy: true,
    run,
  };
});
