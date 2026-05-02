import { runHyperresearchCli } from "./helpers/cli";
import { validateHyperresearchRunIntegrity } from "./helpers/integrity";
import {
  nextPendingStep,
  readOrCreateHyperresearchRunLedger,
  writeHyperresearchRunLedger,
} from "./helpers/ledger";
import { loadHyperresearchStep, syntheticHyperresearchSteps } from "./helpers/steps";
import type {
  HyperresearchStepRecord,
} from "./entities";
import type { HyperresearchCodexIO } from "../../shared/resources";
import type { HyperresearchCliBackend } from "../../shared/resources";
import type {
  HyperresearchRunnerResult,
  RunSyntheticSliceInput,
} from "./contract";

type HyperresearchRuntimeDependencies = {
  io: HyperresearchCodexIO;
  cli: HyperresearchCliBackend;
};

function definitionFor(stepId: string) {
  const definition = syntheticHyperresearchSteps.find((step) => step.id === stepId);
  if (!definition) throw new Error(`Unknown Hyperresearch Codex step: ${stepId}`);
  return definition;
}

async function writeArtifact(input: {
  step: HyperresearchStepRecord;
  artifactRoot: string;
  fileName: string;
  content: string;
  io: HyperresearchCodexIO;
}) {
  const artifactPath = input.io.join(input.artifactRoot, input.fileName);
  await input.io.writeTextFile(artifactPath, input.content);
  if (!input.step.artifacts.includes(input.fileName)) input.step.artifacts.push(input.fileName);
}

export async function runSyntheticHyperresearchCodexSlice(
  input: RunSyntheticSliceInput,
  dependencies: HyperresearchRuntimeDependencies,
): Promise<HyperresearchRunnerResult> {
  const { io, cli } = dependencies;
  const artifactRoot = input.artifactRoot ?? io.join(input.vaultRoot, "research", "temp", "codex-artifacts");
  const ledgerPath = input.ledgerPath ?? io.join(input.vaultRoot, "research", "temp", "hyperresearch-codex-run.json");

  await io.ensureDir(input.vaultRoot);
  await io.ensureDir(artifactRoot);
  await io.ensureDir(io.dirname(ledgerPath));
  await io.ensureDir(io.join(input.vaultRoot, "research", "notes"));
  await io.ensureDir(io.join(input.vaultRoot, "research", "raw"));

  const ledger = await readOrCreateHyperresearchRunLedger({
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
    const step = nextPendingStep(ledger);
    if (!step) {
      ledger.completed = true;
      ledger.currentStepId = undefined;
      break;
    }

    ledger.currentStepId = step.id;
    step.status = "running";
    step.startedAt = io.now();
    const definition = definitionFor(step.id);

    try {
      const loaded = await loadHyperresearchStep({
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
        await writeArtifact({
          step,
          artifactRoot,
          fileName: "canonical-query.json",
          content: `${JSON.stringify({
            canonicalQuery: ledger.canonicalQuery,
            tier: ledger.tier,
            stepHash: loaded.sha256,
          }, null, 2)}\n`,
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
        await writeArtifact({
          step,
          artifactRoot,
          fileName: "source-note.json",
          content: `${JSON.stringify({
            title: "Synthetic Codex parity source",
            provenance: {
              capturedBy: "hyperresearch-codex",
              suggestedBy: "synthetic-runtime-slice",
            },
            canonicalQuery: ledger.canonicalQuery,
          }, null, 2)}\n`,
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
        await writeArtifact({
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
      ledger.currentStepId = nextPendingStep(ledger)?.id;
      ledger.completed = ledger.steps.every((item) => item.status === "complete");
      await writeHyperresearchRunLedger({ ledgerPath, ledger, io });
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
      await writeHyperresearchRunLedger({ ledgerPath, ledger, io });
      break;
    }
  }

  const integrity = await validateHyperresearchRunIntegrity({ ledger, io });
  await writeHyperresearchRunLedger({ ledgerPath, ledger, io });

  return {
    ledgerPath,
    ledger,
    integrity,
  };
}
