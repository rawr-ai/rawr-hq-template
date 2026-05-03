/**
 * @fileoverview Durable V8 run lifecycle procedure implementation.
 *
 * This module owns the callable run state machine. Module-local helpers handle
 * packet files, source capture, artifact writes, and result construction so
 * the oRPC procedure flow stays readable without becoming a pass-through
 * wrapper over another runner.
 */
import { runHyperresearchCli } from "../../shared/adapters/hyperresearch-cli";
import type { HyperresearchV8RunLedger } from "../../shared/entities";
import { validateHyperresearchRunIntegrity } from "./helpers/integrity";
import {
  assertV8LedgerMatches,
  appendV8ResumeEvent,
  blockV8Step,
  createV8HyperresearchRunLedger,
  ensureV8LedgerState,
  nextPendingStep,
  readV8HyperresearchRunLedger,
  writeHyperresearchRunLedger,
} from "./helpers/ledger";
import {
  definitionForV8Step,
  loadHyperresearchStep,
  v8StepsForTier,
} from "./helpers/steps";
import {
  resolveRequestedTier,
  slugifyQuery,
} from "./helpers/input";
import {
  finishStep,
  writeCanonicalBootstrap,
} from "./helpers/artifacts";
import {
  createAgentJobs,
  validateAgentOutputs,
  writeFixtureAgentOutputs,
} from "./helpers/agent-packets";
import { runRequiredCliForStep } from "./helpers/source-capture";
import {
  makeResult,
  resultStatus,
} from "./helpers/result";
import { module } from "./module";

const startV8Run = module.startV8Run.handler(async ({ context, input }) => {
  const { io, cli } = context;
  const { tier, tierSource } = resolveRequestedTier(input);
  const vaultTag = input.vaultTag ?? slugifyQuery(input.canonicalQuery);
  const ledgerPath = input.ledgerPath ?? io.join(input.vaultRoot, "research", "temp", "hyperresearch-codex-run.json");
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
    return await makeResult({ ledgerPath, ledger: existing, io });
  }

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
    io,
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
  await writeCanonicalBootstrap({
    ledger,
    wrapperRequirements: input.wrapperRequirements ?? [],
    io,
  });
  await writeHyperresearchRunLedger({ ledgerPath, ledger, io });
  return await makeResult({ ledgerPath, ledger, io });
});

const advanceV8Run = module.advanceV8Run.handler(async ({ context, input }) => {
  const { io, cli } = context;
  const agentMode = input.agentMode ?? "packets";
  const ledger = await readV8HyperresearchRunLedger({
    ledgerPath: input.ledgerPath,
    io,
  });
  if (input.resumeReason) {
    appendV8ResumeEvent({
      ledger,
      reason: input.resumeReason,
      io,
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
      return await makeResult({ ledgerPath: input.ledgerPath, ledger, io });
    }

    const definition = definitionForV8Step(step.id, ledger.tier);

    if (step.status === "awaiting_agents") {
      try {
        const agentOutputs = await validateAgentOutputs({ ledger, step, io });
        if (!agentOutputs) {
          await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
          return await makeResult({ ledgerPath: input.ledgerPath, ledger, io });
        }
        await runRequiredCliForStep({
          definition,
          ledger,
          io,
          cli,
          agentOutputs,
        });
        await finishStep({ ledger, step, definition, agentOutputs, io });
        completedThisPass += 1;
      } catch (error) {
        blockV8Step({
          ledger,
          stepId: step.id,
          message: error instanceof Error ? error.message : String(error),
          io,
        });
        await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
        return await makeResult({ ledgerPath: input.ledgerPath, ledger, io });
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
        return await makeResult({ ledgerPath: input.ledgerPath, ledger, io });
      }

      const agentOutputs = jobs.length > 0
        ? await writeFixtureAgentOutputs({ ledger, step, io })
        : [];

      if (agentMode === "synthesize") {
        await runRequiredCliForStep({
          definition,
          ledger,
          io,
          cli,
          agentOutputs,
        });
      }

      await finishStep({ ledger, step, definition, io });
      completedThisPass += 1;
      await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
    } catch (error) {
      blockV8Step({
        ledger,
        stepId: step.id,
        message: error instanceof Error ? error.message : String(error),
        io,
      });
      await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
      break;
    }
  }

  return await makeResult({ ledgerPath: input.ledgerPath, ledger, io });
});

const inspectV8Run = module.inspectV8Run.handler(async ({ context, input }) => {
  const ledger = await readV8HyperresearchRunLedger({
    ledgerPath: input.ledgerPath,
    io: context.io,
  });
  return await makeResult({ ledgerPath: input.ledgerPath, ledger, io: context.io });
});

const validateV8Run = module.validateV8Run.handler(async ({ context, input }) => {
  const ledger = await readV8HyperresearchRunLedger({
    ledgerPath: input.ledgerPath,
    io: context.io,
  });
  const integrity = await validateHyperresearchRunIntegrity({
    ledger,
    io: context.io,
  });
  const blockingFindings = integrity.filter((finding) => finding.severity === "blocking");
  const warningFindings = integrity.filter((finding) => finding.severity === "warning");
  return {
    ledgerPath: input.ledgerPath,
    status: resultStatus({ ledger, integrity }),
    passed: blockingFindings.length === 0 && ledger.completed,
    ledger,
    blockingFindings,
    warningFindings,
  };
});

export const router = module.router({
  startV8Run,
  advanceV8Run,
  inspectV8Run,
  validateV8Run,
});
