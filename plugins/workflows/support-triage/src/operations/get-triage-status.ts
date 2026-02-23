import type { GetSupportTriageStatusInput, GetSupportTriageStatusOutput } from "../contract";
import { throwSupportTriageBoundaryError } from "../errors";
import type { SupportTriageWorkflowContext } from "../context";
import { SUPPORT_TRIAGE_CAPABILITY, normalizeSupportTriageRunId } from "../models";
import { getSupportTriageRun } from "../run-store";

export async function getSupportTriageStatus(
  args: Readonly<{ context: SupportTriageWorkflowContext; input: GetSupportTriageStatusInput }>,
): Promise<GetSupportTriageStatusOutput> {
  const { input } = args;
  if (!input.runId) {
    return {
      capability: SUPPORT_TRIAGE_CAPABILITY,
      healthy: true,
      run: null,
    };
  }

  const runId = normalizeSupportTriageRunId(input.runId);
  if (!runId) {
    throwSupportTriageBoundaryError({
      transportCode: "BAD_REQUEST",
      status: 400,
      domainCode: "INVALID_SUPPORT_TRIAGE_RUN_ID",
      message: "runId must be a valid identifier",
      data: { runId: input.runId },
    });
  }

  const run = getSupportTriageRun(runId);
  if (!run) {
    throwSupportTriageBoundaryError({
      transportCode: "NOT_FOUND",
      status: 404,
      domainCode: "SUPPORT_TRIAGE_RUN_NOT_FOUND",
      message: "support triage run not found",
      data: { runId },
    });
  }

  return {
    capability: SUPPORT_TRIAGE_CAPABILITY,
    healthy: true,
    run,
  };
}
