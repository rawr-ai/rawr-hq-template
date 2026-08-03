/**
 * @fileoverview Authors the durable V8 advance operation and its resource flow.
 *
 * Model policy supplies deterministic packets, transitions, artifact plans,
 * source decisions, and integrity calculations. This leaf performs every CLI,
 * clock, hash, and filesystem observation needed to apply those decisions.
 */
import type {
  HyperresearchAgentJob,
  HyperresearchAgentOutput,
  HyperresearchCliOperation,
  HyperresearchRunLedger,
  HyperresearchStepDefinition,
  HyperresearchStepRecord,
  HyperresearchV8RunLedger,
} from "../../../model/entities";
import { recordHyperresearchCliCall } from "../../../model/policy";
import type { HyperresearchCliBackend, HyperresearchCodexIO } from "../../../model/ports";
import type { HyperresearchRunIntegrityObservations } from "../model/policy";
import {
  acceptAgentOutput,
  acceptFixtureAgentOutput,
  agentRolesForStep,
  alreadyCaptured,
  appendV8ResumeEvent,
  assertRequiredAgentArtifactsDeclared,
  assertSafeAgentArtifactPath,
  blockV8Step,
  claimTraceReportPaths,
  cliArgsForStepOperation,
  completeV8Step,
  createAgentJobPlan,
  createFixtureAgentOutput,
  definitionForV8Step,
  ensureSourceCapture,
  ensureV8LedgerState,
  failAgentJob,
  finalReportPath,
  fixtureStepArtifactWrites,
  jsonContent,
  makeResult,
  nextPendingStep,
  parseAgentOutput,
  pendingAgentJobsForStep,
  recordFetchCall,
  recordFinalReportSnapshot,
  recordStepArtifact,
  recordValidatedAgentArtifactWrite,
  sourceSuggestionsFromAgentOutputs,
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

async function readVaultText(input: {
  ledger: Pick<HyperresearchV8RunLedger, "vaultRoot">;
  relativePath: string;
  io: HyperresearchCodexIO;
}) {
  return await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, input.relativePath));
}

async function writeHyperresearchRunLedger(input: {
  ledgerPath: string;
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
}): Promise<void> {
  input.ledger.updatedAt = input.io.now();
  await input.io.writeJsonFile(input.ledgerPath, input.ledger);
}

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
  const integrity = validateHyperresearchRunIntegrity({
    ledger: input.ledger,
    observations,
  });
  return makeResult({ ledgerPath: input.ledgerPath, ledger: input.ledger, integrity });
}

async function loadHyperresearchStep(input: {
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

async function createAgentJobs(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  io: HyperresearchCodexIO;
}) {
  const roles = agentRolesForStep(input.definition, input.ledger);
  if (roles.length === 0) return [];
  const existing = input.ledger.agentJobs.filter((job) => job.stepId === input.step.id);
  if (existing.length > 0) return existing;

  const jobs: HyperresearchAgentJob[] = [];
  await input.io.ensureDir(
    input.io.join(input.ledger.vaultRoot, "research", "temp", "codex-agent-results")
  );
  for (const [index, role] of roles.entries()) {
    const plan = createAgentJobPlan({
      ledger: input.ledger,
      step: input.step,
      definition: input.definition,
      role,
      ordinal: index + 1,
      roleCount: roles.length,
      attemptCreatedAt: input.io.now(),
      jobCreatedAt: input.io.now(),
    });
    await writeVaultText({
      ledger: input.ledger,
      relativePath: plan.job.packetPath,
      content: plan.packetContent,
      io: input.io,
    });
    input.ledger.agentJobs.push(plan.job);
    jobs.push(plan.job);
  }
  return jobs;
}

async function writeFixtureAgentOutputs(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchAgentOutput[]> {
  const outputs: HyperresearchAgentOutput[] = [];
  for (const job of pendingAgentJobsForStep(input.ledger, input.step.id)) {
    const output = createFixtureAgentOutput({ step: input.step, job });
    const content = jsonContent(output);
    await writeVaultText({
      ledger: input.ledger,
      relativePath: job.expectedOutputPath,
      content,
      io: input.io,
    });
    acceptFixtureAgentOutput({
      job,
      outputSha256: input.io.sha256(content),
      acceptedAt: input.io.now(),
    });
    outputs.push(output);
  }
  return outputs;
}

/** Reads and accepts every declared child output as one terminal fan-in. */
async function validateAgentOutputs(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchAgentOutput[] | null> {
  const jobs = input.ledger.agentJobs.filter((job) => job.stepId === input.step.id);
  const fail = (job: HyperresearchAgentJob, message: string) =>
    failAgentJob({
      ledger: input.ledger,
      step: input.step,
      job,
      message,
      jobCompletedAt: input.io.now(),
      stepCompletedAt: input.io.now(),
      failureAt: input.io.now(),
    });

  if (jobs.some((job) => job.status === "failed")) {
    input.step.status = "blocked";
    input.step.failure = `Agent job failed for step ${input.step.id}`;
    return null;
  }

  for (const job of jobs) {
    const outputPath = job.outputPath ?? job.expectedOutputPath;
    if (!(await input.io.pathExists(input.io.join(input.ledger.vaultRoot, outputPath)))) {
      return null;
    }
  }

  const outputs: Array<{ job: HyperresearchAgentJob; output: HyperresearchAgentOutput }> = [];
  for (const job of jobs) {
    const outputPath = job.outputPath ?? job.expectedOutputPath;
    const outputText = await readVaultText({
      ledger: input.ledger,
      relativePath: outputPath,
      io: input.io,
    });
    let output: HyperresearchAgentOutput;
    try {
      output = parseAgentOutput({ job, output: outputText });
    } catch (error) {
      fail(job, error instanceof Error ? error.message : String(error));
      return null;
    }
    if (output.status === "failed") {
      fail(job, output.failure ?? `Agent job reported failure: ${job.id}`);
      return null;
    }
    outputs.push({ job, output });
  }

  for (const { job, output } of outputs) {
    const outputPath = job.outputPath ?? job.expectedOutputPath;
    const outputText = await readVaultText({
      ledger: input.ledger,
      relativePath: outputPath,
      io: input.io,
    });
    if (outputText === null) {
      fail(job, `Agent output disappeared before acceptance: ${outputPath}`);
      return null;
    }
    acceptAgentOutput({
      job,
      output,
      outputPath,
      attemptOutputSha256: input.io.sha256(outputText),
      attemptCompletedAt: input.io.now(),
      acceptedOutputSha256: input.io.sha256(outputText),
      acceptedAt: input.io.now(),
    });
  }
  return outputs.map((item) => item.output);
}

/** Executes the CLI audit sequence chosen by source-capture policy. */
async function runRequiredCliForStep(input: {
  definition: HyperresearchStepDefinition;
  ledger: HyperresearchV8RunLedger;
  io: HyperresearchCodexIO;
  cli: HyperresearchCliBackend;
  agentOutputs?: HyperresearchAgentOutput[];
}) {
  const sourceSuggestions = sourceSuggestionsFromAgentOutputs(input.agentOutputs ?? []);
  const sourceUrls = sourceSuggestions.map((suggestion) => suggestion.url);
  for (const operation of input.definition.requiredCliOperations ?? []) {
    const args = cliArgsForStepOperation({
      operation,
      definition: input.definition,
      ledger: input.ledger,
      sourceUrls,
    });
    if (operation === "fetch") {
      for (const suggestion of sourceSuggestions) {
        const existing = input.ledger.sourceCaptures.find((item) => item.url === suggestion.url);
        const capture = ensureSourceCapture({
          ledger: input.ledger,
          stepId: input.definition.id,
          suggestion,
          capturedAt: existing?.capturedAt ?? input.io.now(),
        });
        if (alreadyCaptured(capture)) continue;
        const callIndex = input.ledger.cliCalls.length;
        const call = await runHyperresearchCli({
          operation,
          args: [suggestion.url, "--json"],
          cwd: input.ledger.vaultRoot,
          io: input.io,
          cli: input.cli,
          ledger: input.ledger,
          throwOnFailure: true,
        });
        recordFetchCall({ capture, callIndex, stdout: call.stdout });
      }
      continue;
    }

    if (operation === "fetch-batch") {
      const uncaptured = sourceSuggestions
        .map((suggestion) => {
          const existing = input.ledger.sourceCaptures.find((item) => item.url === suggestion.url);
          return {
            suggestion,
            capture: ensureSourceCapture({
              ledger: input.ledger,
              stepId: input.definition.id,
              suggestion,
              capturedAt: existing?.capturedAt ?? input.io.now(),
            }),
          };
        })
        .filter(({ capture }) => !alreadyCaptured(capture));
      if (uncaptured.length === 0) continue;
      const callIndex = input.ledger.cliCalls.length;
      const call = await runHyperresearchCli({
        operation,
        args: [...uncaptured.map(({ suggestion }) => suggestion.url), "--json"],
        cwd: input.ledger.vaultRoot,
        io: input.io,
        cli: input.cli,
        ledger: input.ledger,
        throwOnFailure: true,
      });
      for (const { capture } of uncaptured) {
        recordFetchCall({ capture, callIndex, stdout: call.stdout });
      }
      continue;
    }

    await runHyperresearchCli({
      operation,
      args: args ?? ["--json"],
      cwd: input.ledger.vaultRoot,
      io: input.io,
      cli: input.cli,
      ledger: input.ledger,
      throwOnFailure: true,
    });
  }
}

async function snapshotFinalReport(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  io: HyperresearchCodexIO;
}) {
  const reportPath = finalReportPath(input.ledger);
  const report = await readVaultText({
    ledger: input.ledger,
    relativePath: reportPath,
    io: input.io,
  });
  if (!report) return;

  const sha256 = input.io.sha256(report);
  const snapshotPath = `research/temp/report-snapshots/${input.step.id}-${sha256}.md`;
  await writeVaultText({
    ledger: input.ledger,
    relativePath: snapshotPath,
    content: report,
    io: input.io,
  });
  recordFinalReportSnapshot({
    ledger: input.ledger,
    step: input.step,
    reportPath,
    snapshotPath,
    sha256,
    createdAt: input.io.now(),
  });
}

async function writeStepArtifacts(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  io: HyperresearchCodexIO;
}) {
  for (const write of fixtureStepArtifactWrites(input)) {
    if (
      write.preserveExisting &&
      (await input.io.pathExists(input.io.join(input.ledger.vaultRoot, write.relativePath)))
    ) {
      recordStepArtifact({ step: input.step, relativePath: write.relativePath });
      continue;
    }
    await writeVaultText({ ledger: input.ledger, ...write, io: input.io });
    recordStepArtifact({ step: input.step, relativePath: write.relativePath });
  }
  if (input.definition.snapshotFinalReport) {
    await snapshotFinalReport({ ledger: input.ledger, step: input.step, io: input.io });
  }
}

async function finishStep(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  agentOutputs?: HyperresearchAgentOutput[];
  io: HyperresearchCodexIO;
}) {
  if (input.agentOutputs) {
    const writtenPaths = new Set<string>();
    for (const write of input.agentOutputs.flatMap((output) => output.artifactWrites ?? [])) {
      assertSafeAgentArtifactPath(write.path);
      const artifactText = await input.io.readTextFile(
        input.io.join(input.ledger.vaultRoot, write.path)
      );
      recordValidatedAgentArtifactWrite({
        step: input.step,
        write,
        artifactText,
        actualSha256: artifactText === null ? undefined : input.io.sha256(artifactText),
      });
      writtenPaths.add(write.path);
    }
    assertRequiredAgentArtifactsDeclared({
      ledger: input.ledger,
      step: input.step,
      definition: input.definition,
      writtenPaths,
    });
    if (input.definition.snapshotFinalReport) {
      await snapshotFinalReport({ ledger: input.ledger, step: input.step, io: input.io });
    }
  } else {
    await writeStepArtifacts(input);
  }
  completeV8Step({ ledger: input.ledger, step: input.step, completedAt: input.io.now() });
}

export const advanceV8Run = module.advanceV8Run.handler(async ({ context, input }) => {
  const { io, cli } = context;
  const agentMode = input.agentMode ?? "packets";
  const ledger = await readV8HyperresearchRunLedger({ ledgerPath: input.ledgerPath, io });
  if (input.resumeReason) {
    appendV8ResumeEvent({
      ledger,
      reason: input.resumeReason,
      at: io.now(),
      updatedAt: io.now(),
    });
    await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
  }

  let completedThisPass = 0;
  while (!ledger.completed && completedThisPass < (input.maxSteps ?? Number.POSITIVE_INFINITY)) {
    const step = nextPendingStep(ledger);
    if (!step) {
      ledger.completed = true;
      ledger.currentStepId = undefined;
      break;
    }

    if (step.status === "blocked" || step.status === "failed") {
      await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
      return await makeObservedResult({ ledgerPath: input.ledgerPath, ledger, io });
    }

    const definition = definitionForV8Step(step.id, ledger.tier);
    if (step.status === "awaiting_agents") {
      try {
        const agentOutputs = await validateAgentOutputs({ ledger, step, io });
        if (!agentOutputs) {
          await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
          return await makeObservedResult({ ledgerPath: input.ledgerPath, ledger, io });
        }
        await runRequiredCliForStep({ definition, ledger, io, cli, agentOutputs });
        await finishStep({ ledger, step, definition, agentOutputs, io });
        completedThisPass += 1;
      } catch (error) {
        blockV8Step({
          ledger,
          stepId: step.id,
          message: error instanceof Error ? error.message : String(error),
          stepCompletedAt: io.now(),
          failureAt: io.now(),
        });
        await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
        return await makeObservedResult({ ledgerPath: input.ledgerPath, ledger, io });
      }
      await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
      continue;
    }

    ledger.currentStepId = step.id;
    step.status = "running";
    step.startedAt = io.now();
    try {
      const loaded = await loadHyperresearchStep({
        stepsRoot: ledger.stepsRoot,
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

      const jobs = await createAgentJobs({ ledger, step, definition, io });
      if (jobs.length > 0 && agentMode === "packets") {
        step.status = "awaiting_agents";
        await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
        return await makeObservedResult({ ledgerPath: input.ledgerPath, ledger, io });
      }

      const agentOutputs =
        jobs.length > 0 ? await writeFixtureAgentOutputs({ ledger, step, io }) : [];
      if (agentMode === "synthesize") {
        await runRequiredCliForStep({ definition, ledger, io, cli, agentOutputs });
      }

      await finishStep({ ledger, step, definition, io });
      completedThisPass += 1;
      await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
    } catch (error) {
      blockV8Step({
        ledger,
        stepId: step.id,
        message: error instanceof Error ? error.message : String(error),
        stepCompletedAt: io.now(),
        failureAt: io.now(),
      });
      await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
      break;
    }
  }

  return await makeObservedResult({ ledgerPath: input.ledgerPath, ledger, io });
});
