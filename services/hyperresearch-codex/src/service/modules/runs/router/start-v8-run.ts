/**
 * @fileoverview Authors V8 run creation, bootstrap writes, and resume inspection.
 *
 * The leaf owns external capabilities; model policy owns route selection,
 * ledger construction, bootstrap content, and integrity classification.
 */
import type { HyperresearchCliOperation, HyperresearchRunLedger } from "../../../model/entities";
import { recordHyperresearchCliCall } from "../../../model/policy";
import type { HyperresearchCliBackend, HyperresearchCodexIO } from "../../../model/ports";
import type { HyperresearchV8RunLedger } from "../model/entities";
import type { HyperresearchRunIntegrityObservations } from "../model/policy";
import {
  assertV8LedgerMatches,
  canonicalBootstrapWrites,
  claimTraceReportPaths,
  createV8HyperresearchRunLedger,
  ensureV8LedgerState,
  makeResult,
  resolveRequestedTier,
  slugifyQuery,
  v8StepsForTier,
  validateHyperresearchRunIntegrity,
} from "../model/policy";
import { module } from "../module";

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

async function writeVaultText(input: {
  ledger: Pick<HyperresearchV8RunLedger, "vaultRoot">;
  relativePath: string;
  content: string;
  io: HyperresearchCodexIO;
}) {
  await input.io.writeTextFile(
    input.io.join(input.ledger.vaultRoot, input.relativePath),
    input.content
  );
}

async function writeHyperresearchRunLedger(input: {
  ledgerPath: string;
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
}): Promise<void> {
  input.ledger.updatedAt = input.io.now();
  await input.io.writeJsonFile(input.ledgerPath, input.ledger);
}

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

async function makeObservedResult(input: {
  ledgerPath: string;
  ledger: HyperresearchV8RunLedger;
  io: HyperresearchCodexIO;
}) {
  const observations = await observeHyperresearchRunIntegrity(input);
  const integrity = validateHyperresearchRunIntegrity({ ledger: input.ledger, observations });
  return makeResult({ ledgerPath: input.ledgerPath, ledger: input.ledger, integrity });
}

export const startV8Run = module.startV8Run.handler(async ({ context, input }) => {
  const { io, cli } = context;
  const { tier, tierSource } = resolveRequestedTier(input);
  const vaultTag = input.vaultTag ?? slugifyQuery(input.canonicalQuery);
  const ledgerPath =
    input.ledgerPath ??
    io.join(input.vaultRoot, "research", "temp", "hyperresearch-codex-run.json");
  const queryFilePath = io.join(input.vaultRoot, `research/query-${vaultTag}.md`);
  const steps = v8StepsForTier(tier);

  await io.ensureDir(input.vaultRoot);
  await io.ensureDir(io.join(input.vaultRoot, "research", "temp"));
  await io.ensureDir(io.join(input.vaultRoot, "research", "notes"));
  await io.ensureDir(io.join(input.vaultRoot, "research", "raw"));
  await io.ensureDir(io.dirname(ledgerPath));

  const existing = await io.readJsonFile<HyperresearchV8RunLedger>(ledgerPath);
  if (existing) {
    ensureV8LedgerState(existing);
    assertV8LedgerMatches({
      ledger: existing,
      canonicalQuery: input.canonicalQuery,
      tier,
      vaultRoot: input.vaultRoot,
      stepsRoot: input.stepsRoot,
    });
    return await makeObservedResult({ ledgerPath, ledger: existing, io });
  }

  const now = io.now();
  const runId = io.randomId("hpr-v8");
  const ledger = createV8HyperresearchRunLedger({
    canonicalQuery: input.canonicalQuery,
    tier,
    tierSource,
    vaultTag,
    vaultRoot: input.vaultRoot,
    artifactRoot: input.vaultRoot,
    stepsRoot: input.stepsRoot,
    queryFilePath,
    wrapperRequirements: input.wrapperRequirements,
    steps,
    now,
    runId,
  });
  ensureV8LedgerState(ledger);

  await runHyperresearchCli({
    operation: "init",
    args: ["--json"],
    cwd: input.vaultRoot,
    io,
    cli,
    ledger,
    throwOnFailure: true,
  });
  for (const write of canonicalBootstrapWrites({
    ledger,
    wrapperRequirements: input.wrapperRequirements ?? [],
  })) {
    await writeVaultText({ ledger, ...write, io });
  }
  await writeHyperresearchRunLedger({ ledgerPath, ledger, io });
  return await makeObservedResult({ ledgerPath, ledger, io });
});
