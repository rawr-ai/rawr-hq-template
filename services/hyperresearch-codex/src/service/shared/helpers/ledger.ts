import type {
  HyperresearchTier,
  HyperresearchRunLedger,
  HyperresearchStepDefinition,
  HyperresearchV8RunLedger,
} from "../entities";
import type { HyperresearchCodexIO } from "../resources";

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
  ledger.reviewDispositions ??= [];
  ledger.reportSnapshots ??= [];
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
