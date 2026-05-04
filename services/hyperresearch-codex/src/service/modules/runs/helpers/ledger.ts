import type {
  HyperresearchTier,
  HyperresearchRunLedger,
  HyperresearchStepDefinition,
  HyperresearchV8RunLedger,
} from "../../../shared/entities";
import type { HyperresearchCodexIO } from "../../../shared/resources";

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

export function createV8HyperresearchRunLedger(input: {
  canonicalQuery: string;
  tier: HyperresearchTier;
  tierSource: "user" | "auto-default" | "decomposition" | "fixture";
  vaultTag: string;
  vaultRoot: string;
  artifactRoot: string;
  stepsRoot: string;
  queryFilePath: string;
  wrapperRequirements?: string[];
  steps: HyperresearchStepDefinition[];
  io: HyperresearchCodexIO;
}): HyperresearchRunLedger {
  const now = input.io.now();
  return {
    version: 2,
    runId: input.io.randomId("hpr-v8"),
    canonicalQuery: input.canonicalQuery,
    tier: input.tier,
    tierSource: input.tierSource,
    vaultTag: input.vaultTag,
    vaultRoot: input.vaultRoot,
    artifactRoot: input.artifactRoot,
    stepsRoot: input.stepsRoot,
    queryFilePath: input.queryFilePath,
    routeStepIds: input.steps.map((step) => step.id),
    wrapperRequirements: input.wrapperRequirements ?? [],
    currentStepId: input.steps[0]?.id,
    completed: false,
    createdAt: now,
    updatedAt: now,
    steps: input.steps.map((step) => ({
      id: step.id,
      title: step.title,
      status: "pending",
      tierGate: step.tierGate ?? "all",
      sourceFileName: step.fileName,
      requiredArtifacts: step.requiredArtifacts.map((artifact) => artifact.replaceAll("${vaultTag}", input.vaultTag)),
      artifacts: [],
    })),
    cliCalls: [],
    agentJobs: [],
    reviewDispositions: [],
    reportSnapshots: [],
    sourceCaptures: [],
    patchGuard: {
      violations: [],
    },
    resumes: [],
    failures: [],
  };
}

/**
 * Guards the persisted V8 ledger shape before any run procedure mutates it.
 *
 * This is not a migration shim; incompatible versions fail loudly so resume
 * never proceeds against ambiguous durable state.
 */
export function ensureV8LedgerState(ledger: HyperresearchRunLedger): asserts ledger is HyperresearchV8RunLedger {
  if (ledger.version !== 2) {
    throw new Error(`Expected Hyperresearch V8 ledger version 2, received ${ledger.version}`);
  }
  if (!ledger.tierSource) throw new Error("Hyperresearch V8 ledger is missing tierSource");
  if (!ledger.stepsRoot) throw new Error("Hyperresearch V8 ledger is missing stepsRoot");
  if (!ledger.vaultTag) throw new Error("Hyperresearch V8 ledger is missing vaultTag");
  if (!ledger.routeStepIds) throw new Error("Hyperresearch V8 ledger is missing routeStepIds");
  ledger.wrapperRequirements ??= [];
  ledger.agentJobs ??= [];
  for (const job of ledger.agentJobs) {
    job.logicalJobId ??= job.id;
    job.attemptId ??= `${job.id}-a1`;
    job.attemptNumber ??= 1;
    job.activeAttemptId ??= job.attemptId;
    if (job.status === "complete") job.acceptedAttemptId ??= job.attemptId;
    job.attempts ??= [{
      attemptId: job.attemptId,
      attemptNumber: job.attemptNumber,
      status: job.status === "complete" ? "accepted" : job.status === "failed" ? "failed" : "pending",
      classification: job.originalAttemptClassification ?? (job.status === "failed" ? job.failure : undefined),
      outputPath: job.acceptedOutputPath ?? job.outputPath,
      outputSha256: job.acceptedOutputSha256,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? job.acceptedAt,
    }];
  }
  ledger.reviewDispositions ??= [];
  ledger.reportSnapshots ??= [];
  ledger.sourceCaptures ??= [];
  ledger.patchGuard ??= { violations: [] };
}

export async function readV8HyperresearchRunLedger(input: {
  ledgerPath: string;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchV8RunLedger> {
  const existing = await input.io.readJsonFile<HyperresearchRunLedger>(input.ledgerPath);
  if (!existing) {
    throw new Error(`Hyperresearch V8 ledger not found or unreadable: ${input.ledgerPath}`);
  }
  ensureV8LedgerState(existing);
  return existing;
}

export function appendV8ResumeEvent(input: {
  ledger: HyperresearchRunLedger;
  reason: string;
  io: HyperresearchCodexIO;
}): void {
  input.ledger.resumes.push({
    at: input.io.now(),
    reason: input.reason,
    nextStepId: input.ledger.currentStepId,
  });
  input.ledger.updatedAt = input.io.now();
}

export function blockV8Step(input: {
  ledger: HyperresearchV8RunLedger;
  stepId: string;
  message: string;
  io: HyperresearchCodexIO;
}): void {
  const step = input.ledger.steps.find((item) => item.id === input.stepId);
  if (step) {
    step.status = "blocked";
    step.failure = input.message;
    step.completedAt = input.io.now();
  }
  input.ledger.failures.push({
    at: input.io.now(),
    stepId: input.stepId,
    kind: "step",
    message: input.message,
  });
}

export function assertV8LedgerMatches(input: {
  ledger: HyperresearchRunLedger;
  canonicalQuery?: string;
  tier?: HyperresearchTier;
  vaultRoot?: string;
  stepsRoot?: string;
}): void {
  const mismatch = (field: string, expected: string | undefined, actual: string | undefined) => {
    if (expected !== undefined && expected !== actual) {
      throw new Error(`Cannot resume Hyperresearch V8 run with mismatched ${field}: ledger has ${actual}, received ${expected}`);
    }
  };
  mismatch("canonicalQuery", input.canonicalQuery, input.ledger.canonicalQuery);
  mismatch("tier", input.tier, input.ledger.tier);
  mismatch("vaultRoot", input.vaultRoot, input.ledger.vaultRoot);
  mismatch("stepsRoot", input.stepsRoot, input.ledger.stepsRoot);
}
