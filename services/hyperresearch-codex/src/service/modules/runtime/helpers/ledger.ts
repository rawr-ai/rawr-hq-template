import type {
  HyperresearchRunLedger,
  HyperresearchStepDefinition,
} from "../entities";
import type { HyperresearchCodexIO } from "../../../shared/resources";

export function createHyperresearchRunLedger(input: {
  canonicalQuery: string;
  tier: "light" | "full";
  vaultRoot: string;
  artifactRoot: string;
  steps: HyperresearchStepDefinition[];
  io: HyperresearchCodexIO;
}): HyperresearchRunLedger {
  const now = input.io.now();
  return {
    version: 1,
    runId: input.io.randomId("hpr-codex"),
    canonicalQuery: input.canonicalQuery,
    tier: input.tier,
    vaultRoot: input.vaultRoot,
    artifactRoot: input.artifactRoot,
    currentStepId: input.steps[0]?.id,
    completed: false,
    createdAt: now,
    updatedAt: now,
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

export async function readOrCreateHyperresearchRunLedger(input: {
  ledgerPath: string;
  canonicalQuery: string;
  tier: "light" | "full";
  vaultRoot: string;
  artifactRoot: string;
  steps: HyperresearchStepDefinition[];
  resumeReason?: string;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchRunLedger> {
  const existing = await input.io.readJsonFile<HyperresearchRunLedger>(input.ledgerPath);
  if (existing) {
    existing.resumes.push({
      at: input.io.now(),
      reason: input.resumeReason ?? "resume",
      nextStepId: existing.currentStepId,
    });
    existing.updatedAt = input.io.now();
    return existing;
  }

  return createHyperresearchRunLedger(input);
}

export async function writeHyperresearchRunLedger(input: {
  ledgerPath: string;
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
}): Promise<void> {
  input.ledger.updatedAt = input.io.now();
  await input.io.writeJsonFile(input.ledgerPath, input.ledger);
}

export function nextPendingStep(ledger: HyperresearchRunLedger) {
  return ledger.steps.find((step) => step.status !== "complete");
}
