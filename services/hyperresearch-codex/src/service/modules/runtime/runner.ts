import { runHyperresearchCli } from "./helpers/cli";
import { validateHyperresearchRunIntegrity } from "./helpers/integrity";
import {
  nextPendingStep,
  readOrCreateHyperresearchRunLedger,
  writeHyperresearchRunLedger,
} from "./helpers/ledger";
import { loadHyperresearchStep, syntheticHyperresearchSteps } from "./helpers/steps";
import type {
  HyperresearchRunnerOptions,
  HyperresearchRunnerResult,
  HyperresearchStepRecord,
} from "./entities";
import type { HyperresearchCodexIO } from "../../shared/resources";

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
  options: HyperresearchRunnerOptions,
): Promise<HyperresearchRunnerResult> {
  if (!options.io) throw new Error("Hyperresearch Codex IO dependency is required");
  if (!options.cli) throw new Error("Hyperresearch CLI backend dependency is required");

  const io = options.io;
  const cli = options.cli;
  const artifactRoot = options.artifactRoot ?? io.join(options.vaultRoot, "research", "temp", "codex-artifacts");
  const ledgerPath = options.ledgerPath ?? io.join(options.vaultRoot, "research", "temp", "hyperresearch-codex-run.json");

  await io.ensureDir(options.vaultRoot);
  await io.ensureDir(artifactRoot);
  await io.ensureDir(io.dirname(ledgerPath));
  await io.ensureDir(io.join(options.vaultRoot, "research", "notes"));
  await io.ensureDir(io.join(options.vaultRoot, "research", "raw"));

  const ledger = await readOrCreateHyperresearchRunLedger({
    ledgerPath,
    canonicalQuery: options.canonicalQuery,
    tier: options.tier,
    vaultRoot: options.vaultRoot,
    artifactRoot,
    steps: syntheticHyperresearchSteps,
    resumeReason: options.resumeReason,
    io,
  });

  let completedThisPass = 0;
  while (!ledger.completed && completedThisPass < (options.maxSteps ?? Number.POSITIVE_INFINITY)) {
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
        stepsRoot: options.stepsRoot,
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
          cwd: options.vaultRoot,
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
          cwd: options.vaultRoot,
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
          cwd: options.vaultRoot,
          io,
          cli,
          ledger,
        });
        await runHyperresearchCli({
          operation: "export",
          args: ["json", "--json"],
          cwd: options.vaultRoot,
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
