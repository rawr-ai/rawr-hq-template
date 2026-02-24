import { SUPPORT_EXAMPLE_CAPABILITY, normalizeSupportExampleRunId } from "../../models";
import { os } from "../../orpc";
import { getSupportExampleRun } from "../../run-store";

export const getStatus = os.supportExample.triage.getStatus.handler(async ({ input, errors }) => {
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
