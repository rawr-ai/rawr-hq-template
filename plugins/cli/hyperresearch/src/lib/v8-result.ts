import type {
  V8RunnerResult,
  V8ValidationResult,
} from "@rawr/hyperresearch-codex";

export function summarizeV8Result(result: V8RunnerResult) {
  return {
    ledgerPath: result.ledgerPath,
    runId: result.ledger.runId,
    status: result.status,
    completed: result.ledger.completed,
    currentStepId: result.ledger.currentStepId,
    tier: result.ledger.tier,
    vaultTag: result.ledger.vaultTag,
    completedSteps: result.ledger.steps
      .filter((step) => step.status === "complete")
      .map((step) => step.id),
    pendingAgentJobs: result.pendingAgentJobs.map((job) => ({
      id: job.id,
      role: job.role,
      packetPath: job.packetPath,
      expectedOutputPath: job.expectedOutputPath,
    })),
    cliCalls: result.ledger.cliCalls.map((call) => ({
      operation: call.operation,
      exitCode: call.exitCode,
    })),
    integrity: result.integrity,
  };
}

export function hasBlockingV8Findings(result: V8RunnerResult) {
  return result.integrity.some((finding) => finding.severity === "blocking");
}

export function summarizeV8ValidationResult(result: V8ValidationResult) {
  return {
    ledgerPath: result.ledgerPath,
    runId: result.ledger.runId,
    status: result.status,
    passed: result.passed,
    completed: result.ledger.completed,
    currentStepId: result.ledger.currentStepId,
    tier: result.ledger.tier,
    vaultTag: result.ledger.vaultTag,
    blockingFindings: result.blockingFindings,
    warningFindings: result.warningFindings,
  };
}
