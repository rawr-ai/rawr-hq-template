import type {
  HyperresearchAgentJob,
  HyperresearchIntegrityFinding,
  HyperresearchV8RunLedger,
  V8RunStatus,
} from "@rawr/hyperresearch-codex/types";

type V8RunnerSummaryInput = {
  ledgerPath: string;
  status: V8RunStatus;
  ledger: HyperresearchV8RunLedger;
  pendingAgentJobs: HyperresearchAgentJob[];
  integrity: HyperresearchIntegrityFinding[];
};

type V8ValidationSummaryInput = {
  ledgerPath: string;
  status: V8RunStatus;
  passed: boolean;
  ledger: HyperresearchV8RunLedger;
  blockingFindings: HyperresearchIntegrityFinding[];
  warningFindings: HyperresearchIntegrityFinding[];
};

export function summarizeV8Result(result: V8RunnerSummaryInput) {
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

export function hasBlockingV8Findings(result: V8RunnerSummaryInput) {
  return result.integrity.some((finding) => finding.severity === "blocking");
}

export function summarizeV8ValidationResult(result: V8ValidationSummaryInput) {
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
