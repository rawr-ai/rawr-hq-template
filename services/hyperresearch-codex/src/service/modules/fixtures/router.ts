/**
 * @fileoverview Synthetic fixture procedure implementation.
 *
 * The fixture module is intentionally separate from V8 runs: it proves the
 * reusable control-plane mechanics with a tiny route and fakeable CLI backend.
 */
import { runHyperresearchCli } from "../../common/adapters/hyperresearch-cli";
import { validateSyntheticRunIntegrity } from "./helpers/integrity";
import {
  nextSyntheticPendingStep,
  readOrCreateSyntheticRunLedger,
  writeSyntheticRunLedger,
} from "./helpers/ledger";
import {
  definitionForSyntheticStep,
  loadSyntheticHyperresearchStep,
  syntheticHyperresearchSteps,
} from "./helpers/steps";
import { writeSyntheticArtifact } from "./helpers/artifacts";
import { module } from "./module";

const runSyntheticSlice = module.runSyntheticSlice.handler(async ({ context, input }) => {
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

  const integrity = await validateSyntheticRunIntegrity({ ledger, io });
  await writeSyntheticRunLedger({ ledgerPath, ledger, io });

  return {
    ledgerPath,
    ledger,
    integrity,
  };
});

export const router = module.router({
  runSyntheticSlice,
});
