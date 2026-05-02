import { runHyperresearchCli } from "./helpers/cli";
import { validateHyperresearchRunIntegrity } from "./helpers/integrity";
import {
  assertV8LedgerMatches,
  appendV8ResumeEvent,
  createV8HyperresearchRunLedger,
  ensureV8LedgerState,
  nextPendingStep,
  readV8HyperresearchRunLedger,
  writeHyperresearchRunLedger,
} from "./helpers/ledger";
import {
  expandV8ArtifactPath,
  loadHyperresearchStep,
  v8HyperresearchSteps,
  v8StepsForTier,
} from "./helpers/steps";
import type {
  HyperresearchAgentJob,
  HyperresearchAgentOutput,
  HyperresearchRunLedger,
  HyperresearchStepDefinition,
  HyperresearchStepRecord,
  HyperresearchTier,
  HyperresearchV8RunLedger,
  V8RunStatus,
} from "./entities";
import type {
  AdvanceV8RunInput,
  StartV8RunInput,
  V8RunnerResult,
  V8ValidationResult,
} from "./contract";
import type {
  HyperresearchCliBackend,
  HyperresearchCodexIO,
} from "../../shared/resources";

type V8RuntimeDependencies = {
  io: HyperresearchCodexIO;
  cli: HyperresearchCliBackend;
};

function slugifyQuery(query: string): string {
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "hyperresearch";
}

function resolveTier(input: StartV8RunInput): {
  tier: HyperresearchTier;
  tierSource: "user" | "auto-default";
} {
  if (input.tier === "full") return { tier: "full", tierSource: "user" };
  if (input.tier === "light") return { tier: "light", tierSource: "user" };
  return { tier: "light", tierSource: "auto-default" };
}

function definitionFor(stepId: string, tier?: HyperresearchTier): HyperresearchStepDefinition {
  const definitions = tier ? v8StepsForTier(tier) : v8HyperresearchSteps;
  const definition = definitions.find((step) => step.id === stepId);
  if (!definition) throw new Error(`Unknown Hyperresearch V8 step: ${stepId}`);
  return definition;
}

function relativeArtifactsFor(
  definition: HyperresearchStepDefinition,
  ledger: HyperresearchRunLedger & { vaultTag: string },
) {
  return definition.requiredArtifacts.map((artifact) => expandV8ArtifactPath(artifact, ledger.vaultTag));
}

async function writeVaultText(input: {
  ledger: HyperresearchRunLedger;
  relativePath: string;
  content: string;
  io: HyperresearchCodexIO;
}) {
  await input.io.writeTextFile(input.io.join(input.ledger.vaultRoot, input.relativePath), input.content);
}

async function readVaultText(input: {
  ledger: HyperresearchRunLedger;
  relativePath: string;
  io: HyperresearchCodexIO;
}) {
  return await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, input.relativePath));
}

function jsonContent(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function addArtifact(step: HyperresearchStepRecord, relativePath: string) {
  if (!step.artifacts.includes(relativePath)) step.artifacts.push(relativePath);
}

function finalReportPath(ledger: HyperresearchRunLedger & { vaultTag: string }) {
  return `research/notes/final_report_${ledger.vaultTag}.md`;
}

function pendingAgentJobsForStep(ledger: HyperresearchRunLedger, stepId: string) {
  return (ledger.agentJobs ?? []).filter((job) => job.stepId === stepId && job.status === "pending");
}

function allPendingAgentJobs(ledger: HyperresearchRunLedger) {
  return (ledger.agentJobs ?? []).filter((job) => job.status === "pending");
}

function resultStatus(input: {
  ledger: HyperresearchRunLedger;
  integrity: Awaited<ReturnType<typeof validateHyperresearchRunIntegrity>>;
}): V8RunStatus {
  if (input.integrity.some((finding) => finding.severity === "blocking")) return "blocked";
  if (input.ledger.completed) return "complete";
  if (allPendingAgentJobs(input.ledger).length > 0) return "awaiting_agents";
  return "running";
}

async function writeCanonicalBootstrap(input: {
  ledger: HyperresearchRunLedger & { vaultTag: string; queryFilePath?: string };
  wrapperRequirements: string[];
  io: HyperresearchCodexIO;
}) {
  const queryRelativePath = `research/query-${input.ledger.vaultTag}.md`;
  input.ledger.queryFilePath = input.io.join(input.ledger.vaultRoot, queryRelativePath);
  await writeVaultText({
    ledger: input.ledger,
    relativePath: queryRelativePath,
    io: input.io,
    content: [
      "---",
      `vault_tag: ${input.ledger.vaultTag}`,
      `created: ${input.ledger.createdAt}`,
      "source: codex-start-run",
      "---",
      "",
      input.ledger.canonicalQuery,
      "",
    ].join("\n"),
  });
  await writeVaultText({
    ledger: input.ledger,
    relativePath: "research/scaffold.md",
    io: input.io,
    content: [
      "# Hyperresearch Codex Scaffold",
      "",
      "## User Prompt (VERBATIM)",
      "",
      input.ledger.canonicalQuery,
      "",
      "## Run Config",
      "",
      `- vault_tag: ${input.ledger.vaultTag}`,
      `- tier: ${input.ledger.tier}`,
      `- tier_source: ${input.ledger.tierSource ?? "unknown"}`,
      `- query_file_path: ${input.ledger.queryFilePath}`,
      "",
      "## Wrapper Requirements",
      "",
      ...(input.wrapperRequirements.length > 0
        ? input.wrapperRequirements.map((item) => `- ${item}`)
        : ["- none"]),
      "",
    ].join("\n"),
  });
}

function agentRolesForStep(
  definition: HyperresearchStepDefinition,
  ledger: HyperresearchRunLedger,
) {
  if (ledger.tier === "full" && definition.id === "10-triple-draft") {
    return [
      "hyperresearch-draft-orchestrator",
      "hyperresearch-draft-orchestrator",
      "hyperresearch-draft-orchestrator",
    ];
  }
  return definition.agentRoles ?? [];
}

async function createAgentJobs(input: {
  ledger: HyperresearchRunLedger & { vaultTag: string };
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  io: HyperresearchCodexIO;
}) {
  const roles = agentRolesForStep(input.definition, input.ledger);
  if (roles.length === 0) return [];

  input.ledger.agentJobs ??= [];
  const existing = input.ledger.agentJobs.filter((job) => job.stepId === input.step.id);
  if (existing.length > 0) return existing;

  const jobs: HyperresearchAgentJob[] = [];
  await input.io.ensureDir(input.io.join(input.ledger.vaultRoot, "research", "temp", "codex-agent-results"));
  for (const [index, role] of roles.entries()) {
    const ordinal = index + 1;
    const jobId = `${input.step.id}-${ordinal}-${role.replace(/^hyperresearch-/, "")}`;
    const packetPath = `research/temp/codex-agent-packets/${jobId}.json`;
    const expectedOutputPath = `research/temp/codex-agent-results/${jobId}.json`;
    const job: HyperresearchAgentJob = {
      id: jobId,
      stepId: input.step.id,
      role,
      status: "pending",
      packetPath,
      expectedOutputPath,
      createdAt: input.io.now(),
    };
    const packet = {
      jobId,
      role,
      canonicalQuery: input.ledger.canonicalQuery,
      pipelinePosition: `Step ${input.step.id} (${input.step.title}) in the Hyperresearch V8 route.`,
      stepId: input.step.id,
      stepTitle: input.step.title,
      vaultTag: input.ledger.vaultTag,
      inputArtifacts: input.step.artifacts,
      expectedOutputPath,
      outputSchema: {
        status: "complete|failed",
        summary: "string",
        evidence: ["path-or-source-id"],
        sourceUrls: ["https://example.com/source-url"],
      },
      failureBehavior: "Write the expected output path with status=failed and a failure reason if the role cannot complete.",
    };
    await writeVaultText({
      ledger: input.ledger,
      relativePath: packetPath,
      io: input.io,
      content: jsonContent(packet),
    });
    input.ledger.agentJobs.push(job);
    jobs.push(job);
  }
  return jobs;
}

async function writeFixtureAgentOutputs(input: {
  ledger: HyperresearchRunLedger;
  step: HyperresearchStepRecord;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchAgentOutput[]> {
  const outputs: HyperresearchAgentOutput[] = [];
  for (const job of pendingAgentJobsForStep(input.ledger, input.step.id)) {
    const output: HyperresearchAgentOutput = {
      jobId: job.id,
      status: "complete",
      role: job.role,
      summary: `Fixture output for ${job.role}`,
      evidence: input.step.artifacts,
      sourceUrls: ["https://www.python.org/about/"],
    };
    await writeVaultText({
      ledger: input.ledger,
      relativePath: job.expectedOutputPath,
      io: input.io,
      content: jsonContent(output),
    });
    job.status = "complete";
    job.outputPath = job.expectedOutputPath;
    job.completedAt = input.io.now();
    outputs.push(output);
  }
  return outputs;
}

async function validateAgentOutputs(input: {
  ledger: HyperresearchRunLedger;
  step: HyperresearchStepRecord;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchAgentOutput[] | null> {
  const outputs: HyperresearchAgentOutput[] = [];
  const failJob = (job: HyperresearchAgentJob, message: string) => {
    job.status = "failed";
    job.failure = message;
    job.completedAt = input.io.now();
    input.step.status = "blocked";
    input.step.failure = message;
    input.step.completedAt = input.io.now();
    input.ledger.failures.push({
      at: input.io.now(),
      stepId: input.step.id,
      kind: "agent",
      message,
    });
  };

  if ((input.ledger.agentJobs ?? []).some((job) => job.stepId === input.step.id && job.status === "failed")) {
    input.step.status = "blocked";
    input.step.failure = `Agent job failed for step ${input.step.id}`;
    return null;
  }

  for (const job of pendingAgentJobsForStep(input.ledger, input.step.id)) {
    const outputExists = await input.io.pathExists(input.io.join(input.ledger.vaultRoot, job.expectedOutputPath));
    if (!outputExists) return null;
    const output = await readVaultText({
      ledger: input.ledger,
      relativePath: job.expectedOutputPath,
      io: input.io,
    });
    let parsed: HyperresearchAgentOutput;
    try {
      parsed = parseAgentOutput({ job, output });
    } catch (error) {
      failJob(job, error instanceof Error ? error.message : String(error));
      return null;
    }
    if (parsed.status === "failed") {
      failJob(job, parsed.failure ?? `Agent job reported failure: ${job.id}`);
      return null;
    }
    job.status = "complete";
    job.outputPath = job.expectedOutputPath;
    job.completedAt = input.io.now();
    outputs.push(parsed);
  }
  return outputs;
}

function parseAgentOutput(input: {
  job: HyperresearchAgentJob;
  output: string | null;
}): HyperresearchAgentOutput {
  if (!input.output) throw new Error(`Agent output is empty: ${input.job.expectedOutputPath}`);
  let value: unknown;
  try {
    value = JSON.parse(input.output);
  } catch (error) {
    throw new Error(`Agent output is not valid JSON: ${input.job.expectedOutputPath}`);
  }
  if (!value || typeof value !== "object") {
    throw new Error(`Agent output is not an object: ${input.job.expectedOutputPath}`);
  }
  const record = value as Record<string, unknown>;
  if (record.jobId !== input.job.id) {
    throw new Error(`Agent output jobId mismatch for ${input.job.id}`);
  }
  if (record.role !== input.job.role) {
    throw new Error(`Agent output role mismatch for ${input.job.id}`);
  }
  if (record.status !== "complete" && record.status !== "failed") {
    throw new Error(`Agent output has invalid status for ${input.job.id}`);
  }
  if (typeof record.summary !== "string" || record.summary.length === 0) {
    throw new Error(`Agent output summary is required for ${input.job.id}`);
  }
  if (!Array.isArray(record.evidence) || record.evidence.some((item) => typeof item !== "string")) {
    throw new Error(`Agent output evidence array is required for ${input.job.id}`);
  }
  if (record.sourceUrls !== undefined) {
    if (!Array.isArray(record.sourceUrls) || record.sourceUrls.some((item) => typeof item !== "string" || item.length === 0)) {
      throw new Error(`Agent output sourceUrls array must contain strings for ${input.job.id}`);
    }
  }
  if (record.failure !== undefined && typeof record.failure !== "string") {
    throw new Error(`Agent output failure must be a string for ${input.job.id}`);
  }
  return record as HyperresearchAgentOutput;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sourceUrlsFromAgentOutputs(agentOutputs: HyperresearchAgentOutput[]): string[] {
  const urls = new Set<string>();
  for (const output of agentOutputs) {
    for (const url of output.sourceUrls ?? []) {
      if (isHttpUrl(url)) urls.add(url);
    }
    for (const evidence of output.evidence) {
      if (isHttpUrl(evidence)) urls.add(evidence);
    }
  }
  return [...urls];
}

async function runRequiredCliForStep(input: {
  definition: HyperresearchStepDefinition;
  ledger: HyperresearchRunLedger;
  io: HyperresearchCodexIO;
  cli: HyperresearchCliBackend;
  agentOutputs?: HyperresearchAgentOutput[];
}) {
  const sourceUrls = sourceUrlsFromAgentOutputs(input.agentOutputs ?? []);
  for (const operation of input.definition.requiredCliOperations ?? []) {
    const args = (() => {
      if (operation === "search") return [input.ledger.canonicalQuery, "--json"];
      if (operation === "fetch") {
        if (!sourceUrls[0]) throw new Error(`Step ${input.definition.id} requires a source URL for Hyperresearch fetch`);
        return [sourceUrls[0], "--json"];
      }
      if (operation === "fetch-batch") {
        if (sourceUrls.length === 0) throw new Error(`Step ${input.definition.id} requires source URLs for Hyperresearch fetch-batch`);
        return [...sourceUrls, "--json"];
      }
      if (operation === "note") return ["new", "--json", "Hyperresearch Codex V8 fixture source"];
      if (operation === "lint") return ["--json"];
      if (operation === "sync") return ["--json"];
      if (operation === "export") return ["json", "--json"];
      return ["--json"];
    })();
    await runHyperresearchCli({
      operation,
      args,
      cwd: input.ledger.vaultRoot,
      io: input.io,
      cli: input.cli,
      ledger: input.ledger,
      throwOnFailure: true,
    });
  }
}

async function writeStepArtifacts(input: {
  ledger: HyperresearchRunLedger & { vaultTag: string };
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  io: HyperresearchCodexIO;
}) {
  const artifacts = relativeArtifactsFor(input.definition, input.ledger);
  for (const artifact of artifacts) {
    if (artifact === finalReportPath(input.ledger) && await input.io.pathExists(input.io.join(input.ledger.vaultRoot, artifact))) {
      addArtifact(input.step, artifact);
      continue;
    }
    const content = artifact.endsWith(".json")
      ? jsonContent({
          ok: true,
          fixture: true,
          stepId: input.step.id,
          title: input.step.title,
          canonicalQuery: input.ledger.canonicalQuery,
          vaultTag: input.ledger.vaultTag,
        })
      : [
          `# ${input.step.title}`,
          "",
          `Step: ${input.step.id}`,
          `Query: ${input.ledger.canonicalQuery}`,
          `Vault tag: ${input.ledger.vaultTag}`,
          "",
        ].join("\n");
    await writeVaultText({ ledger: input.ledger, relativePath: artifact, content, io: input.io });
    addArtifact(input.step, artifact);
  }

  if (input.definition.id === "10-triple-draft" && input.ledger.tier === "light") {
    const reportPath = finalReportPath(input.ledger);
    await writeVaultText({
      ledger: input.ledger,
      relativePath: reportPath,
      io: input.io,
      content: [
        "# Hyperresearch Codex Light Fixture Report",
        "",
        `Query: ${input.ledger.canonicalQuery}`,
        "",
        "This fixture report proves the light-tier V8 control plane with source provenance placeholders and patch-only gates.",
        "",
      ].join("\n"),
    });
    addArtifact(input.step, reportPath);
  }

  if (input.definition.id === "11-synthesize") {
    const reportPath = finalReportPath(input.ledger);
    await writeVaultText({
      ledger: input.ledger,
      relativePath: reportPath,
      io: input.io,
      content: [
        "# Hyperresearch Codex Full Fixture Report",
        "",
        `Query: ${input.ledger.canonicalQuery}`,
        "",
        "This fixture report proves the full-tier V8 control plane with critic, patch, polish, and readability gates.",
        "",
      ].join("\n"),
    });
    addArtifact(input.step, reportPath);
  }

  if (input.definition.snapshotFinalReport) {
    const reportPath = finalReportPath(input.ledger);
    const report = await readVaultText({ ledger: input.ledger, relativePath: reportPath, io: input.io });
    if (report) {
      const sha256 = input.io.sha256(report);
      input.ledger.reportSnapshots ??= [];
      input.ledger.reportSnapshots.push({
        stepId: input.step.id,
        path: reportPath,
        sha256,
        createdAt: input.io.now(),
      });
      input.ledger.patchGuard = {
        snapshotPath: reportPath,
        snapshotSha256: sha256,
        violations: input.ledger.patchGuard?.violations ?? [],
      };
    }
  }
}

async function finishStep(input: {
  ledger: HyperresearchRunLedger & { vaultTag: string };
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  io: HyperresearchCodexIO;
}) {
  await writeStepArtifacts(input);
  input.step.status = "complete";
  input.step.completedAt = input.io.now();
  input.ledger.currentStepId = nextPendingStep(input.ledger)?.id;
  input.ledger.completed = input.ledger.steps.every((step) => step.status === "complete");
}

async function makeResult(input: {
  ledgerPath: string;
  ledger: HyperresearchV8RunLedger;
  io: HyperresearchCodexIO;
}): Promise<V8RunnerResult> {
  const integrity = await validateHyperresearchRunIntegrity({
    ledger: input.ledger,
    io: input.io,
  });
  return {
    ledgerPath: input.ledgerPath,
    status: resultStatus({ ledger: input.ledger, integrity }),
    ledger: input.ledger,
    pendingAgentJobs: allPendingAgentJobs(input.ledger),
    integrity,
  };
}

export async function startV8HyperresearchRun(
  input: StartV8RunInput,
  dependencies: V8RuntimeDependencies,
): Promise<V8RunnerResult> {
  const { io, cli } = dependencies;
  const { tier, tierSource } = resolveTier(input);
  const vaultTag = input.vaultTag ?? slugifyQuery(input.canonicalQuery);
  const ledgerPath = input.ledgerPath ?? io.join(input.vaultRoot, "research", "temp", "hyperresearch-codex-run.json");
  const queryFilePath = io.join(input.vaultRoot, `research/query-${vaultTag}.md`);
  const steps = v8StepsForTier(tier);

  await io.ensureDir(input.vaultRoot);
  await io.ensureDir(io.join(input.vaultRoot, "research", "temp"));
  await io.ensureDir(io.join(input.vaultRoot, "research", "notes"));
  await io.ensureDir(io.join(input.vaultRoot, "research", "raw"));
  await io.ensureDir(io.dirname(ledgerPath));

  const existing = await io.readJsonFile<HyperresearchRunLedger>(ledgerPath);
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
}

export async function advanceV8HyperresearchRun(
  input: AdvanceV8RunInput,
  dependencies: V8RuntimeDependencies,
): Promise<V8RunnerResult> {
  const { io, cli } = dependencies;
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

    const definition = definitionFor(step.id, ledger.tier);

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
        await finishStep({ ledger, step, definition, io });
        completedThisPass += 1;
      } catch (error) {
        step.status = "blocked";
        step.failure = error instanceof Error ? error.message : String(error);
        step.completedAt = io.now();
        ledger.failures.push({
          at: io.now(),
          stepId: step.id,
          kind: "step",
          message: step.failure,
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
      step.status = "blocked";
      step.failure = error instanceof Error ? error.message : String(error);
      step.completedAt = io.now();
      ledger.failures.push({
        at: io.now(),
        stepId: step.id,
        kind: "step",
        message: step.failure,
      });
      await writeHyperresearchRunLedger({ ledgerPath: input.ledgerPath, ledger, io });
      break;
    }
  }

  return await makeResult({ ledgerPath: input.ledgerPath, ledger, io });
}

export async function inspectV8HyperresearchRun(
  input: { ledgerPath: string },
  dependencies: Pick<V8RuntimeDependencies, "io">,
): Promise<V8RunnerResult> {
  const ledger = await readV8HyperresearchRunLedger({
    ledgerPath: input.ledgerPath,
    io: dependencies.io,
  });
  return await makeResult({ ledgerPath: input.ledgerPath, ledger, io: dependencies.io });
}

export async function validateV8HyperresearchRun(
  input: { ledgerPath: string },
  dependencies: Pick<V8RuntimeDependencies, "io">,
): Promise<V8ValidationResult> {
  const ledger = await readV8HyperresearchRunLedger({
    ledgerPath: input.ledgerPath,
    io: dependencies.io,
  });
  const integrity = await validateHyperresearchRunIntegrity({
    ledger,
    io: dependencies.io,
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
}
