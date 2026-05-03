import type {
  HyperresearchAgentJob,
  HyperresearchAgentOutput,
  HyperresearchStepDefinition,
  HyperresearchStepRecord,
  HyperresearchV8RunLedger,
} from "../../../shared/entities";
import type { HyperresearchCodexIO } from "../../../shared/resources";
import {
  jsonContent,
  readVaultText,
  writeVaultText,
} from "./artifacts";

export function pendingAgentJobsForStep(ledger: HyperresearchV8RunLedger, stepId: string) {
  return ledger.agentJobs.filter((job) => job.stepId === stepId && job.status === "pending");
}

function agentRolesForStep(
  definition: HyperresearchStepDefinition,
  ledger: HyperresearchV8RunLedger,
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

function assignedArtifactsForJob(input: {
  definition: HyperresearchStepDefinition;
  artifacts: string[];
  role: string;
  ordinal: number;
  roleCount: number;
}) {
  if (input.artifacts.length === 0) return [];

  if (input.definition.id === "02-width-sweep") {
    if (input.role === "hyperresearch-fetcher") {
      return input.artifacts.filter((artifact) => [
        "research/temp/search-plan.md",
        "research/temp/scored-urls.md",
      ].includes(artifact));
    }
    if (input.role === "hyperresearch-source-analyst") {
      return input.artifacts.filter((artifact) => [
        "research/temp/source-capture-log.md",
        "research/temp/claims-width.json",
      ].includes(artifact));
    }
  }

  if (input.definition.id === "10-triple-draft" && input.roleCount === 3) {
    const byOrdinal: Record<number, string[]> = {
      1: ["research/temp/draft-angles.md", "research/temp/draft-a.md"],
      2: ["research/temp/draft-b.md"],
      3: ["research/temp/draft-c.md"],
    };
    return input.artifacts.filter((artifact) => byOrdinal[input.ordinal]?.includes(artifact));
  }

  return input.artifacts.filter((_, index) => index % input.roleCount === input.ordinal - 1);
}

/**
 * Writes the parent-owned Codex packet contract for each role in a step.
 *
 * Packets are the durable boundary between service orchestration and spawned
 * agents: each job declares exactly where the agent must write its result.
 */
export async function createAgentJobs(input: {
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
  await input.io.ensureDir(input.io.join(input.ledger.vaultRoot, "research", "temp", "codex-agent-results"));
  for (const [index, role] of roles.entries()) {
    const ordinal = index + 1;
    const jobId = `${input.step.id}-${ordinal}-${role.replace(/^hyperresearch-/, "")}`;
    const packetPath = `research/temp/codex-agent-packets/${jobId}.json`;
    const expectedOutputPath = `research/temp/codex-agent-results/${jobId}.json`;
    const assignedRequiredArtifacts = assignedArtifactsForJob({
      definition: input.definition,
      artifacts: input.step.requiredArtifacts,
      role,
      ordinal,
      roleCount: roles.length,
    });
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
      stepRequiredArtifacts: input.step.requiredArtifacts,
      requiredArtifacts: assignedRequiredArtifacts,
      artifactContract: {
        assignedRequiredArtifacts,
        stepRequiredArtifacts: input.step.requiredArtifacts,
        fanInRule: "The parent service validates artifactWrites across every job for this step. Write or verify your assignedRequiredArtifacts; do not invent substitutes for another job's assigned artifacts unless you are explicitly carrying that artifact forward.",
      },
      expectedOutputPath,
      outputSchema: {
        status: "complete|failed",
        summary: "string",
        evidence: ["path-or-source-id"],
        artifactWrites: [
          {
            path: "research/temp/example-artifact.json",
            sha256: "sha256-of-file-content",
            summary: "what this required artifact supports; include carried-forward artifacts too",
          },
        ],
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

export async function writeFixtureAgentOutputs(input: {
  ledger: HyperresearchV8RunLedger;
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

/**
 * Reads declared packet outputs and makes reported failures terminal.
 *
 * Once a real agent has failed, later advances cannot switch to synthetic mode
 * to erase that failure from the run ledger.
 */
export async function validateAgentOutputs(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  io: HyperresearchCodexIO;
}): Promise<HyperresearchAgentOutput[] | null> {
  const jobs = input.ledger.agentJobs.filter((job) => job.stepId === input.step.id);
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

  if (jobs.some((job) => job.status === "failed")) {
    input.step.status = "blocked";
    input.step.failure = `Agent job failed for step ${input.step.id}`;
    return null;
  }

  for (const job of jobs) {
    const outputPath = job.outputPath ?? job.expectedOutputPath;
    const outputExists = await input.io.pathExists(input.io.join(input.ledger.vaultRoot, outputPath));
    if (!outputExists) return null;
  }

  const outputs: Array<{
    job: HyperresearchAgentJob;
    output: HyperresearchAgentOutput;
  }> = [];
  for (const job of jobs) {
    const outputPath = job.outputPath ?? job.expectedOutputPath;
    const output = await readVaultText({
      ledger: input.ledger,
      relativePath: outputPath,
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
    outputs.push({ job, output: parsed });
  }

  for (const { job } of outputs) {
    job.status = "complete";
    job.outputPath = job.expectedOutputPath;
    job.completedAt = input.io.now();
  }
  return outputs.map((item) => item.output);
}

function parseAgentOutput(input: {
  job: HyperresearchAgentJob;
  output: string | null;
}): HyperresearchAgentOutput {
  if (!input.output) throw new Error(`Agent output is empty: ${input.job.expectedOutputPath}`);
  let value: unknown;
  try {
    value = JSON.parse(input.output);
  } catch {
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
  if (record.artifactWrites !== undefined) {
    if (!Array.isArray(record.artifactWrites)) {
      throw new Error(`Agent output artifactWrites must be an array for ${input.job.id}`);
    }
    for (const item of record.artifactWrites) {
      if (!item || typeof item !== "object") {
        throw new Error(`Agent output artifactWrites entries must be objects for ${input.job.id}`);
      }
      const artifact = item as Record<string, unknown>;
      if (typeof artifact.path !== "string" || artifact.path.length === 0) {
        throw new Error(`Agent output artifactWrites.path is required for ${input.job.id}`);
      }
      if (typeof artifact.sha256 !== "string" || artifact.sha256.length === 0) {
        throw new Error(`Agent output artifactWrites.sha256 is required for ${input.job.id}`);
      }
      if (typeof artifact.summary !== "string" || artifact.summary.length === 0) {
        throw new Error(`Agent output artifactWrites.summary is required for ${input.job.id}`);
      }
    }
  }
  if (record.failure !== undefined && typeof record.failure !== "string") {
    throw new Error(`Agent output failure must be a string for ${input.job.id}`);
  }
  return record as HyperresearchAgentOutput;
}
