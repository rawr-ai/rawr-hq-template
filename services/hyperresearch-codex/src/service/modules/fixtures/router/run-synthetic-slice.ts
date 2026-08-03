/**
 * @fileoverview Synthetic fixture procedure implementation.
 *
 * The fixture module is intentionally separate from V8 runs: it proves the
 * reusable control-plane mechanics with a tiny route and fakeable CLI backend.
 */
import type { HyperresearchCliOperation, HyperresearchRunLedger } from "../../../model/entities";
import {
  type HyperresearchStepDefinition,
  recordHyperresearchCliCall,
} from "../../../model/policy";
import type { HyperresearchCliBackend, HyperresearchCodexIO } from "../../../model/ports";
import {
  appendSyntheticResumeEvent,
  createSyntheticRunLedger,
  definitionForSyntheticStep,
  nextSyntheticPendingStep,
  recordSyntheticArtifact,
  syntheticHyperresearchSteps,
  validateSyntheticRunIntegrity,
} from "../model/policy";
import { module } from "../module";

/** Executes fixture resources while leaving deterministic state decisions in model policy. */
async function runHyperresearchCli(input: {
  operation: HyperresearchCliOperation;
  args: string[];
  cwd: string;
  io: HyperresearchCodexIO;
  cli: HyperresearchCliBackend;
  ledger: HyperresearchRunLedger;
  throwOnFailure?: boolean;
}) {
  const startedAt = input.io.now();
  const result = await input.cli.run({
    operation: input.operation,
    args: input.args,
    cwd: input.cwd,
  });
  return recordHyperresearchCliCall({
    operation: input.operation,
    args: input.args,
    cwd: input.cwd,
    startedAt,
    completedAt: input.io.now(),
    result,
    ledger: input.ledger,
    throwOnFailure: input.throwOnFailure,
  });
}

async function readOrCreateSyntheticRunLedger(input: {
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
    appendSyntheticResumeEvent({
      ledger: existing,
      reason: input.resumeReason ?? "resume",
      at: input.io.now(),
      updatedAt: input.io.now(),
    });
    return existing;
  }

  const now = input.io.now();
  const runId = input.io.randomId("hpr-codex");
  return createSyntheticRunLedger({
    canonicalQuery: input.canonicalQuery,
    tier: input.tier,
    vaultRoot: input.vaultRoot,
    artifactRoot: input.artifactRoot,
    steps: input.steps,
    runId,
    now,
  });
}

async function writeSyntheticRunLedger(input: {
  ledgerPath: string;
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
}): Promise<void> {
  input.ledger.updatedAt = input.io.now();
  await input.io.writeJsonFile(input.ledgerPath, input.ledger);
}

async function loadSyntheticHyperresearchStep(input: {
  stepsRoot: string;
  definition: HyperresearchStepDefinition;
  io: HyperresearchCodexIO;
}) {
  const stepPath = input.io.join(input.stepsRoot, input.definition.fileName);
  const body = await input.io.readTextFile(stepPath);
  if (body === null) {
    throw new Error(`Hyperresearch step file not found: ${stepPath}`);
  }

  return {
    stepId: input.definition.id,
    title: input.definition.title,
    path: stepPath,
    sha256: input.io.sha256(body),
    loadedAt: input.io.now(),
    body,
  };
}

async function writeSyntheticArtifact(input: {
  step: HyperresearchRunLedger["steps"][number];
  artifactRoot: string;
  fileName: string;
  content: string;
  io: HyperresearchCodexIO;
}): Promise<void> {
  await input.io.writeTextFile(input.io.join(input.artifactRoot, input.fileName), input.content);
  recordSyntheticArtifact({ step: input.step, fileName: input.fileName });
}

async function validateObservedSyntheticRun(input: {
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
}) {
  const artifactObservations = [];
  for (const step of input.ledger.steps) {
    if (step.status !== "complete") continue;
    for (const artifact of step.requiredArtifacts) {
      artifactObservations.push({
        stepId: step.id,
        artifact,
        exists: await input.io.pathExists(input.io.join(input.ledger.artifactRoot, artifact)),
      });
    }
  }
  return validateSyntheticRunIntegrity({ ledger: input.ledger, artifactObservations });
}

export const runSyntheticSlice = module.runSyntheticSlice.handler(async ({ context, input }) => {
  const { io, cli } = context;
  const artifactRoot =
    input.artifactRoot ?? io.join(input.vaultRoot, "research", "temp", "codex-artifacts");
  const ledgerPath =
    input.ledgerPath ??
    io.join(input.vaultRoot, "research", "temp", "hyperresearch-codex-run.json");

  await io.ensureDir(input.vaultRoot);
  await io.ensureDir(artifactRoot);
  await io.ensureDir(io.dirname(ledgerPath));
  await io.ensureDir(io.join(input.vaultRoot, "research", "notes"));
  await io.ensureDir(io.join(input.vaultRoot, "research", "raw"));

  const ledger = await readOrCreateSyntheticRunLedger({
    ledgerPath,
    canonicalQuery: input.canonicalQuery,
    tier: input.tier,
    vaultRoot: input.vaultRoot,
    artifactRoot,
    steps: syntheticHyperresearchSteps,
    resumeReason: input.resumeReason,
    io,
  });

  let completedThisPass = 0;
  while (!ledger.completed && completedThisPass < (input.maxSteps ?? Number.POSITIVE_INFINITY)) {
    const step = nextSyntheticPendingStep(ledger);
    if (!step) {
      ledger.completed = true;
      ledger.currentStepId = undefined;
      break;
    }

    ledger.currentStepId = step.id;
    step.status = "running";
    step.startedAt = io.now();
    const definition = definitionForSyntheticStep(step.id);

    try {
      const loaded = await loadSyntheticHyperresearchStep({
        stepsRoot: input.stepsRoot,
        definition,
        io,
      });
      step.loaded = {
        stepId: loaded.stepId,
        title: loaded.title,
        path: loaded.path,
        sha256: loaded.sha256,
        loadedAt: loaded.loadedAt,
      };

      if (step.id === "01-canonical-query") {
        await runHyperresearchCli({
          operation: "init",
          args: ["--json"],
          cwd: input.vaultRoot,
          io,
          cli,
          ledger,
        });
        await writeSyntheticArtifact({
          step,
          artifactRoot,
          fileName: "canonical-query.json",
          content: `${JSON.stringify(
            {
              canonicalQuery: ledger.canonicalQuery,
              tier: ledger.tier,
              stepHash: loaded.sha256,
            },
            null,
            2
          )}\n`,
          io,
        });
      }

      if (step.id === "02-source-capture") {
        await runHyperresearchCli({
          operation: "note",
          args: ["new", "--json", "Synthetic Codex parity source"],
          cwd: input.vaultRoot,
          io,
          cli,
          ledger,
        });
        await writeSyntheticArtifact({
          step,
          artifactRoot,
          fileName: "source-note.json",
          content: `${JSON.stringify(
            {
              title: "Synthetic Codex parity source",
              provenance: {
                capturedBy: "hyperresearch-codex",
                suggestedBy: "synthetic-runtime-slice",
              },
              canonicalQuery: ledger.canonicalQuery,
            },
            null,
            2
          )}\n`,
          io,
        });
      }

      if (step.id === "03-final-artifact") {
        await runHyperresearchCli({
          operation: "lint",
          args: ["--json"],
          cwd: input.vaultRoot,
          io,
          cli,
          ledger,
        });
        await runHyperresearchCli({
          operation: "export",
          args: ["json", "--json"],
          cwd: input.vaultRoot,
          io,
          cli,
          ledger,
        });
        await writeSyntheticArtifact({
          step,
          artifactRoot,
          fileName: "final-report.md",
          content: [
            "# Hyperresearch Codex Synthetic Report",
            "",
            `Query: ${ledger.canonicalQuery}`,
            "",
            "This artifact proves the minimal Codex control-plane slice: fresh step loading, CLI-backed vault operation, resumeable ledger state, and final integrity validation.",
            "",
          ].join("\n"),
          io,
        });
      }

      step.status = "complete";
      step.completedAt = io.now();
      completedThisPass += 1;
      ledger.currentStepId = nextSyntheticPendingStep(ledger)?.id;
      ledger.completed = ledger.steps.every((item) => item.status === "complete");
      await writeSyntheticRunLedger({ ledgerPath, ledger, io });
    } catch (error) {
      step.status = "failed";
      step.failure = error instanceof Error ? error.message : String(error);
      step.completedAt = io.now();
      ledger.failures.push({
        at: io.now(),
        stepId: step.id,
        kind: "step",
        message: step.failure,
      });
      await writeSyntheticRunLedger({ ledgerPath, ledger, io });
      break;
    }
  }

  const integrity = await validateObservedSyntheticRun({ ledger, io });
  await writeSyntheticRunLedger({ ledgerPath, ledger, io });

  return {
    ledgerPath,
    ledger,
    integrity,
  };
});
