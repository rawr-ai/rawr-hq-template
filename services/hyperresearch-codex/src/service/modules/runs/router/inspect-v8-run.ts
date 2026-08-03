import type { HyperresearchRunLedger, HyperresearchV8RunLedger } from "../../../model/entities";
import type { HyperresearchCodexIO } from "../../../model/ports";
import type { HyperresearchRunIntegrityObservations } from "../model/policy";
import {
  claimTraceReportPaths,
  ensureV8LedgerState,
  makeResult,
  validateHyperresearchRunIntegrity,
} from "../model/policy";
import { module } from "../module";

async function readV8HyperresearchRunLedger(input: {
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

/** Observes every file needed to classify the inspected ledger without mutating it. */
async function observeHyperresearchRunIntegrity(input: {
  ledger: HyperresearchV8RunLedger;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchRunIntegrityObservations> {
  const requiredArtifacts: HyperresearchRunIntegrityObservations["requiredArtifacts"][number][] =
    [];
  for (const step of input.ledger.steps) {
    if (step.status !== "complete") continue;
    for (const artifact of step.requiredArtifacts) {
      requiredArtifacts.push({
        stepId: step.id,
        artifact,
        exists: await input.io.pathExists(input.io.join(input.ledger.artifactRoot, artifact)),
      });
    }
  }

  const acceptedAgentOutputs: HyperresearchRunIntegrityObservations["acceptedAgentOutputs"][number][] =
    [];
  for (const job of input.ledger.agentJobs) {
    if (job.status !== "complete" || !job.acceptedOutputPath || !job.acceptedOutputSha256) {
      continue;
    }
    const text = await input.io.readTextFile(
      input.io.join(input.ledger.vaultRoot, job.acceptedOutputPath)
    );
    acceptedAgentOutputs.push({
      jobId: job.id,
      path: job.acceptedOutputPath,
      text,
      sha256: text === null ? undefined : input.io.sha256(text),
    });
  }

  let claimTraceText: string | null | undefined;
  const claimReports: HyperresearchRunIntegrityObservations["claimReports"][number][] = [];
  if (input.ledger.completed) {
    claimTraceText = await input.io.readTextFile(
      input.io.join(input.ledger.vaultRoot, "research/claim-trace.json")
    );
    for (const report of claimTraceReportPaths(claimTraceText)) {
      claimReports.push({
        ...report,
        text: await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, report.path)),
      });
    }
  }

  let patch: HyperresearchRunIntegrityObservations["patch"];
  const patchGuard = input.ledger.patchGuard;
  if (patchGuard.snapshotPath && patchGuard.snapshotSha256) {
    const currentReport = await input.io.readTextFile(
      input.io.join(input.ledger.vaultRoot, patchGuard.snapshotPath)
    );
    patch = { currentReport };
    if (currentReport) {
      patch.currentSha256 = input.io.sha256(currentReport);
      if (patch.currentSha256 !== patchGuard.snapshotSha256) {
        const snapshot = [...input.ledger.reportSnapshots]
          .reverse()
          .find((item) => item.sha256 === patchGuard.snapshotSha256);
        patch.snapshotText = snapshot
          ? await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, snapshot.path))
          : null;
        patch.patchLogText = await input.io.readTextFile(
          input.io.join(input.ledger.vaultRoot, "research", "patch-log.json")
        );
      }
    }
  }

  return { requiredArtifacts, acceptedAgentOutputs, claimTraceText, claimReports, patch };
}

export const inspectV8Run = module.inspectV8Run.handler(async ({ context, input }) => {
  const ledger = await readV8HyperresearchRunLedger({
    ledgerPath: input.ledgerPath,
    io: context.io,
  });
  const observations = await observeHyperresearchRunIntegrity({ ledger, io: context.io });
  const integrity = validateHyperresearchRunIntegrity({ ledger, observations });
  return makeResult({ ledgerPath: input.ledgerPath, ledger, integrity });
});
