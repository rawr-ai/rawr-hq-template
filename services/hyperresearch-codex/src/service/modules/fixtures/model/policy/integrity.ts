import type { HyperresearchIntegrityFinding } from "../../../../model/dto";
import type { HyperresearchRunLedger } from "../../../../model/entities";

export type SyntheticArtifactObservation = {
  stepId: string;
  artifact: string;
  exists: boolean;
};

export function validateSyntheticRunIntegrity(input: {
  ledger: HyperresearchRunLedger;
  artifactObservations: readonly SyntheticArtifactObservation[];
}): HyperresearchIntegrityFinding[] {
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
        const observation = input.artifactObservations.find(
          (item) => item.stepId === step.id && item.artifact === artifact
        );
        if (!observation?.exists) {
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

  if (!input.ledger.completed) {
    findings.push({
      severity: "warning",
      code: "incomplete-run",
      message: "Hyperresearch Codex run has not completed all steps",
    });
  }

  return findings;
}
