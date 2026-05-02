import type {
  HyperresearchIntegrityFinding,
  HyperresearchRunLedger,
} from "../entities";
import type { HyperresearchCodexIO } from "../../../shared/resources";

export async function validateHyperresearchRunIntegrity(input: {
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchIntegrityFinding[]> {
  const findings: HyperresearchIntegrityFinding[] = [];

  for (const step of input.ledger.steps) {
    if (step.status === "complete" && !step.loaded) {
      findings.push({
        severity: "blocking",
        code: "missing-step-load",
        stepId: step.id,
        message: `Step ${step.id} completed without a recorded fresh step load`,
      });
    }

    if (step.status === "failed" || step.status === "blocked") {
      findings.push({
        severity: "blocking",
        code: "failed-step",
        stepId: step.id,
        message: step.failure ?? `Step ${step.id} failed`,
      });
    }

    if (step.status === "complete") {
      for (const artifact of step.requiredArtifacts) {
        const artifactPath = input.io.join(input.ledger.artifactRoot, artifact);
        if (!(await input.io.pathExists(artifactPath))) {
          findings.push({
            severity: "blocking",
            code: "missing-required-artifact",
            stepId: step.id,
            artifact,
            message: `Required artifact missing for ${step.id}: ${artifact}`,
          });
        }
      }
    }
  }

  for (const call of input.ledger.cliCalls) {
    if (call.exitCode !== 0) {
      findings.push({
        severity: "blocking",
        code: "failed-cli-call",
        message: `Hyperresearch CLI call failed: ${call.operation}`,
      });
    }
  }

  for (const job of input.ledger.agentJobs ?? []) {
    if (job.status === "pending") {
      findings.push({
        severity: "warning",
        code: "awaiting-agent-output",
        stepId: job.stepId,
        message: `Agent job is awaiting output: ${job.id}`,
      });
    }
    if (job.status === "failed") {
      findings.push({
        severity: "blocking",
        code: "failed-agent-job",
        stepId: job.stepId,
        message: job.failure ?? `Agent job failed: ${job.id}`,
      });
    }
  }

  for (const disposition of input.ledger.reviewDispositions ?? []) {
    if (disposition.severity === "blocking" && disposition.status === "open") {
      findings.push({
        severity: "blocking",
        code: "open-review-finding",
        message: `Open blocking review finding: ${disposition.id}`,
      });
    }
  }

  for (const violation of input.ledger.patchGuard?.violations ?? []) {
    findings.push({
      severity: "blocking",
      code: "patch-only-violation",
      message: violation,
    });
  }

  if (!input.ledger.completed) {
    findings.push({
      severity: "warning",
      code: "incomplete-run",
      message: "Hyperresearch Codex run has not completed all steps",
    });
  }

  return findings;
}
