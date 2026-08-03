import type {
  HyperresearchRunLedger,
  HyperresearchStepDefinition,
} from "../../../../model/entities";

export function createSyntheticRunLedger(input: {
  canonicalQuery: string;
  tier: "light" | "full";
  vaultRoot: string;
  artifactRoot: string;
  steps: HyperresearchStepDefinition[];
  runId: string;
  now: string;
}): HyperresearchRunLedger {
  return {
    version: 1,
    runId: input.runId,
    canonicalQuery: input.canonicalQuery,
    tier: input.tier,
    vaultRoot: input.vaultRoot,
    artifactRoot: input.artifactRoot,
    currentStepId: input.steps[0]?.id,
    completed: false,
    createdAt: input.now,
    updatedAt: input.now,
    steps: input.steps.map((step) => ({
      id: step.id,
      title: step.title,
      status: "pending",
      requiredArtifacts: [...step.requiredArtifacts],
      artifacts: [],
    })),
    cliCalls: [],
    resumes: [],
    failures: [],
  };
}

export function appendSyntheticResumeEvent(input: {
  ledger: HyperresearchRunLedger;
  reason: string;
  at: string;
  updatedAt: string;
}): void {
  input.ledger.resumes.push({
    at: input.at,
    reason: input.reason,
    nextStepId: input.ledger.currentStepId,
  });
  input.ledger.updatedAt = input.updatedAt;
}

export function nextSyntheticPendingStep(ledger: HyperresearchRunLedger) {
  return ledger.steps.find((step) => step.status !== "complete");
}
