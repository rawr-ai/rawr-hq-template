import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src";
import { finalReportPath } from "../src/service/modules/runs/helpers/artifacts";
import {
  expandV8ArtifactPath,
  v8HyperresearchSteps,
  v8StepsForTier,
} from "../src/service/modules/runs/helpers/steps";
import type { HyperresearchAgentJob } from "../src/types";
import { createClientOptions, invocation, RecordingCli } from "./helpers";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeV8Fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hyperresearch-codex-v8-"));
  tempDirs.push(root);
  const stepsRoot = path.join(root, "steps");
  const vaultRoot = path.join(root, "vault");
  await fs.mkdir(stepsRoot, { recursive: true });
  await Promise.all(v8HyperresearchSteps.map((step) => fs.writeFile(
    path.join(stepsRoot, step.fileName),
    `# ${step.title}\n\nFixture body for ${step.id}.\n`,
    "utf8",
  )));
  return { root, stepsRoot, vaultRoot };
}

function sha256(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function requiredArtifactsFor(stepId: string, vaultTag: string, tier: "light" | "full" = "full") {
  const definition = v8StepsForTier(tier).find((step) => step.id === stepId);
  if (!definition) throw new Error(`Missing test step definition: ${stepId}`);
  return definition.requiredArtifacts.map((artifact) => expandV8ArtifactPath(artifact, vaultTag));
}

async function writeAgentOutput(input: {
  vaultRoot: string;
  job: HyperresearchAgentJob;
  artifactPaths?: string[];
  sourceUrls?: string[];
}) {
  const artifactWrites = [];
  for (const artifactPath of input.artifactPaths ?? []) {
    const content = artifactPath.endsWith(".json")
      ? JSON.stringify({ ok: true, jobId: input.job.id, artifactPath }, null, 2)
      : `# ${artifactPath}\n\nJob: ${input.job.id}\n`;
    await fs.mkdir(path.dirname(path.join(input.vaultRoot, artifactPath)), { recursive: true });
    await fs.writeFile(path.join(input.vaultRoot, artifactPath), content, "utf8");
    artifactWrites.push({
      path: artifactPath,
      sha256: sha256(content),
      summary: `Artifact written for ${input.job.id}`,
    });
  }

  await fs.writeFile(
    path.join(input.vaultRoot, input.job.expectedOutputPath),
    JSON.stringify({
      jobId: input.job.id,
      role: input.job.role,
      status: "complete",
      summary: input.job.role,
      evidence: input.sourceUrls ?? [],
      artifactWrites,
      sourceUrls: input.sourceUrls,
    }, null, 2),
    "utf8",
  );
}

async function packetRequiredArtifacts(input: {
  vaultRoot: string;
  job: HyperresearchAgentJob;
}): Promise<string[]> {
  const packet = JSON.parse(await fs.readFile(path.join(input.vaultRoot, input.job.packetPath), "utf8")) as {
    requiredArtifacts?: string[];
  };
  return packet.requiredArtifacts ?? [];
}

describe("hyperresearch-codex V8 runtime", () => {
  it("starts a versioned V8 run with query, scaffold, route, and CLI init audit", async () => {
    const fixture = await makeV8Fixture();
    const cli = new RecordingCli();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli }));

    const result = await client.runs.startV8Run({
      canonicalQuery: "Map Codex parity for Hyperresearch. Address serve(), step.run, Hooks, and MCP boundaries.",
      tier: "auto",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
      wrapperRequirements: ["save final report"],
    }, invocation("v8-start"));

    expect(result.status).toBe("running");
    expect(result.ledger.version).toBe(2);
    expect(result.ledger.tier).toBe("light");
    expect(result.ledger.tierSource).toBe("auto-default");
    expect(result.ledger.routeStepIds).toEqual([
      "01-decompose",
      "02-width-sweep",
      "10-triple-draft",
      "15-polish",
      "16-readability-audit",
    ]);
    expect(cli.calls.map((call) => call.operation)).toEqual(["init"]);
    await expect(fs.readFile(path.join(fixture.vaultRoot, "research", "scaffold.md"), "utf8"))
      .resolves.toContain("Map Codex parity for Hyperresearch");
  });

  it("runs the light fixture route end-to-end with fresh step loads and final report snapshot", async () => {
    const fixture = await makeV8Fixture();
    const cli = new RecordingCli();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Light V8 proof. Address serve(), step.run, Hooks, and MCP boundaries.",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-light-start"));

    const advanced = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
    }, invocation("v8-light-advance"));

    expect(advanced.status).toBe("complete");
    expect(advanced.ledger.steps.map((step) => step.status)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
      "complete",
    ]);
    expect(advanced.ledger.steps.every((step) => step.loaded?.sha256)).toBe(true);
    expect(advanced.ledger.reportSnapshots).toHaveLength(1);
    await expect(fs.readFile(path.join(fixture.vaultRoot, finalReportPath(advanced.ledger)), "utf8"))
      .resolves.toContain("Light Fixture Report");
    const decomposition = JSON.parse(await fs.readFile(
      path.join(fixture.vaultRoot, "research", "prompt-decomposition.json"),
      "utf8",
    )) as { namedTopics?: string[]; atomicItems?: Array<{ text: string }> };
    expect(decomposition.namedTopics).toEqual(expect.arrayContaining([
      "serve()",
      "step.run",
      "Hooks",
      "MCP",
    ]));
    expect(decomposition.atomicItems?.map((item) => item.text)).toEqual(expect.arrayContaining([
      "Address named topic: serve()",
      "Address named topic: step.run",
      "Address named topic: Hooks",
      "Address named topic: MCP",
    ]));
    expect(advanced.integrity.filter((finding) => finding.severity === "blocking")).toEqual([]);

    const validation = await client.runs.validateV8Run({
      ledgerPath: started.ledgerPath,
    }, invocation("v8-light-validate"));
    expect(validation.passed).toBe(true);
    expect(validation.blockingFindings).toEqual([]);
  });

  it("blocks validation when the final report is wholesale rewritten after snapshot", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Patch guard proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-patch-guard-start"));

    const advanced = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
    }, invocation("v8-patch-guard-advance"));
    expect(advanced.status).toBe("complete");

    await fs.writeFile(
      path.join(fixture.vaultRoot, "research", "notes", "final_report_patch-guard-proof.md"),
      "# Replacement Report\n\nThis is an unlogged rewrite with no retained report structure.\n",
      "utf8",
    );

    const validation = await client.runs.validateV8Run({
      ledgerPath: started.ledgerPath,
    }, invocation("v8-patch-guard-validate"));
    expect(validation.passed).toBe(false);
    expect(validation.blockingFindings).toContainEqual(expect.objectContaining({
      severity: "blocking",
      code: "patch-only-violation",
    }));
  });

  it("allows logged patch edits that preserve the synthesis snapshot lineage", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Logged patch proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-logged-patch-start"));

    const advanced = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
    }, invocation("v8-logged-patch-advance"));
    expect(advanced.status).toBe("complete");

    const reportPath = advanced.ledger.patchGuard.snapshotPath;
    const beforeSha256 = advanced.ledger.patchGuard.snapshotSha256;
    if (!reportPath || !beforeSha256) throw new Error("expected patch snapshot");
    const fullReportPath = path.join(fixture.vaultRoot, reportPath);
    const before = await fs.readFile(fullReportPath, "utf8");
    const after = `${before}\nPatch note: retained source-backed claim wording.\n`;
    await fs.writeFile(fullReportPath, after, "utf8");
    await fs.writeFile(
      path.join(fixture.vaultRoot, "research", "patch-log.json"),
      JSON.stringify({
        patches: [
          {
            criticId: "test-critic",
            findingIds: ["finding-1"],
            status: "accepted",
            rationale: "Add a small logged clarification without regenerating the report.",
            beforeSha256,
            afterSha256: sha256(after),
            hunks: [
              {
                section: "tail",
                before: "",
                after: "Patch note: retained source-backed claim wording.",
              },
            ],
          },
        ],
      }, null, 2),
      "utf8",
    );

    const validation = await client.runs.validateV8Run({
      ledgerPath: started.ledgerPath,
    }, invocation("v8-logged-patch-validate"));
    expect(validation.passed).toBe(true);
    expect(validation.blockingFindings).toEqual([]);
  });

  it("blocks patch logs that do not represent the actual accepted report change", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Bad patch log proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-bad-patch-log-start"));

    const advanced = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
    }, invocation("v8-bad-patch-log-advance"));
    expect(advanced.status).toBe("complete");

    const reportPath = advanced.ledger.patchGuard.snapshotPath;
    const beforeSha256 = advanced.ledger.patchGuard.snapshotSha256;
    if (!reportPath || !beforeSha256) throw new Error("expected patch snapshot");
    const fullReportPath = path.join(fixture.vaultRoot, reportPath);
    const before = await fs.readFile(fullReportPath, "utf8");
    const after = `${before}\nUncovered accepted change.\n`;
    await fs.writeFile(fullReportPath, after, "utf8");
    await fs.writeFile(
      path.join(fixture.vaultRoot, "research", "patch-log.json"),
      JSON.stringify({
        patches: [
          {
            criticId: "test-critic",
            findingIds: ["finding-1"],
            status: "rejected",
            rationale: "Rejected findings cannot cover actual report edits.",
            beforeSha256,
            afterSha256: sha256(after),
            hunks: [
              {
                section: "tail",
                before: "",
                after: "Different change.",
              },
            ],
          },
        ],
      }, null, 2),
      "utf8",
    );

    const validation = await client.runs.validateV8Run({
      ledgerPath: started.ledgerPath,
    }, invocation("v8-bad-patch-log-validate"));
    expect(validation.passed).toBe(false);
    expect(validation.blockingFindings).toContainEqual(expect.objectContaining({
      code: "patch-only-violation",
    }));
  });

  it("runs the full fixture route across all 16 V8 steps", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Full V8 proof",
      tier: "full",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-full-start"));

    const advanced = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
    }, invocation("v8-full-advance"));

    expect(advanced.status).toBe("complete");
    expect(advanced.ledger.steps).toHaveLength(16);
    expect(advanced.ledger.agentJobs?.map((job) => job.status).every((status) => status === "complete")).toBe(true);
    await expect(fs.readFile(path.join(fixture.vaultRoot, "research", "critic-findings-dialectic.json"), "utf8"))
      .resolves.toContain("12-critics");
    await expect(fs.readFile(path.join(fixture.vaultRoot, "research", "patch-log.json"), "utf8"))
      .resolves.toContain("14-patcher");
  });

  it("stops in codex mode for agent packets and resumes after outputs exist", async () => {
    const fixture = await makeV8Fixture();
    const cli = new RecordingCli();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Codex packet proof",
      tier: "full",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-packet-start"));

    const stepOne = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-step-one"));
    expect(stepOne.ledger.currentStepId).toBe("02-width-sweep");

    const awaiting = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-awaiting"));
    expect(awaiting.status).toBe("awaiting_agents");
    expect(awaiting.pendingAgentJobs.map((job) => job.role)).toEqual([
      "hyperresearch-fetcher",
      "hyperresearch-source-analyst",
    ]);
    await expect(packetRequiredArtifacts({ vaultRoot: fixture.vaultRoot, job: awaiting.pendingAgentJobs[0]! }))
      .resolves.toEqual([
        "research/temp/search-plan.md",
        "research/temp/scored-urls.md",
      ]);
    await expect(packetRequiredArtifacts({ vaultRoot: fixture.vaultRoot, job: awaiting.pendingAgentJobs[1]! }))
      .resolves.toEqual([
        "research/temp/source-capture-log.md",
        "research/temp/claims-width.json",
      ]);

    const requiredArtifacts = requiredArtifactsFor("02-width-sweep", awaiting.ledger.vaultTag);
    await Promise.all(awaiting.pendingAgentJobs.map(async (job) => writeAgentOutput({
      vaultRoot: fixture.vaultRoot,
      job,
      artifactPaths: await packetRequiredArtifacts({ vaultRoot: fixture.vaultRoot, job }),
      sourceUrls: [
        "https://www.python.org/about/",
        "https://www.python.org/downloads/",
      ],
    })));

    const resumed = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
      resumeReason: "agent outputs written",
    }, invocation("v8-packet-resume"));
    expect(resumed.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("complete");
    expect(resumed.ledger.steps.find((step) => step.id === "02-width-sweep")?.artifacts)
      .toEqual(requiredArtifacts);
    expect(resumed.ledger.sourceCaptures).toHaveLength(2);
    expect(resumed.ledger.sourceCaptures.find((capture) => capture.url === "https://www.python.org/about/"))
      .toEqual(expect.objectContaining({
        stepIds: ["02-width-sweep"],
        suggestedByAgentJobIds: awaiting.pendingAgentJobs.map((job) => job.id),
        cliCallIndexes: [2],
      }));
    expect(resumed.ledger.resumes).toContainEqual(expect.objectContaining({
      reason: "agent outputs written",
    }));
    expect(cli.calls.map((call) => call.operation)).toEqual([
      "init",
      "search",
      "fetch",
      "fetch",
      "note",
    ]);
    expect(cli.calls.filter((call) => call.operation === "fetch").map((call) => call.args)).toEqual([
      ["https://www.python.org/about/", "--json"],
      ["https://www.python.org/downloads/", "--json"],
    ]);
  });

  it("keeps packet fan-in atomic when agent outputs arrive over multiple advances", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Staggered packet fan-in proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-packet-stagger-start"));

    await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-stagger-step-one"));
    const awaiting = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-stagger-awaiting"));
    const [firstJob, secondJob] = awaiting.pendingAgentJobs;
    if (!firstJob || !secondJob) throw new Error("expected two pending jobs");

    await writeAgentOutput({
      vaultRoot: fixture.vaultRoot,
      job: firstJob,
      artifactPaths: await packetRequiredArtifacts({ vaultRoot: fixture.vaultRoot, job: firstJob }),
      sourceUrls: ["https://www.python.org/about/"],
    });
    const stillAwaiting = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-stagger-partial"));
    expect(stillAwaiting.status).toBe("awaiting_agents");
    expect(stillAwaiting.pendingAgentJobs.map((job) => job.id)).toEqual([
      firstJob.id,
      secondJob.id,
    ]);
    expect(stillAwaiting.ledger.agentJobs.filter((job) => job.stepId === "02-width-sweep").map((job) => job.status))
      .toEqual(["pending", "pending"]);

    await writeAgentOutput({
      vaultRoot: fixture.vaultRoot,
      job: secondJob,
      artifactPaths: await packetRequiredArtifacts({ vaultRoot: fixture.vaultRoot, job: secondJob }),
      sourceUrls: ["https://www.python.org/about/"],
    });
    const completed = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-stagger-complete"));
    expect(completed.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("complete");
    expect(completed.ledger.steps.find((step) => step.id === "02-width-sweep")?.artifacts)
      .toEqual(requiredArtifactsFor("02-width-sweep", completed.ledger.vaultTag, "light"));
    expect(completed.ledger.sourceCaptures).toHaveLength(1);
  });

  it("blocks packet-mode completion when agent outputs omit required artifact writes", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Missing packet artifact proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-packet-missing-artifact-start"));

    await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-missing-artifact-step-one"));
    const awaiting = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-missing-artifact-awaiting"));

    await Promise.all(awaiting.pendingAgentJobs.map((job) => writeAgentOutput({
      vaultRoot: fixture.vaultRoot,
      job,
      sourceUrls: ["https://www.python.org/about/"],
    })));

    const blocked = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-missing-artifact-advance"));

    expect(blocked.status).toBe("blocked");
    expect(blocked.ledger.steps.find((step) => step.id === "02-width-sweep")?.failure)
      .toContain("did not declare required artifact");
  });

  it("snapshots an agent-written final report in packet mode", async () => {
    const fixture = await makeV8Fixture();
    const cli = new RecordingCli();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Packet report snapshot proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-packet-snapshot-start"));

    await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-snapshot-step-one"));
    const awaitingWidth = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-snapshot-width-awaiting"));
    await Promise.all(awaitingWidth.pendingAgentJobs.map((job, index) => writeAgentOutput({
      vaultRoot: fixture.vaultRoot,
      job,
      artifactPaths: index === 0 ? requiredArtifactsFor("02-width-sweep", awaitingWidth.ledger.vaultTag, "light") : [],
      sourceUrls: ["https://www.python.org/about/"],
    })));
    await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-snapshot-width-complete"));

    const awaitingDraft = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-snapshot-draft-awaiting"));
    expect(awaitingDraft.status).toBe("awaiting_agents");
    expect(awaitingDraft.pendingAgentJobs.map((job) => job.role)).toEqual(["hyperresearch-draft-orchestrator"]);
    await writeAgentOutput({
      vaultRoot: fixture.vaultRoot,
      job: awaitingDraft.pendingAgentJobs[0]!,
      artifactPaths: requiredArtifactsFor("10-triple-draft", awaitingDraft.ledger.vaultTag, "light"),
      sourceUrls: ["https://www.python.org/about/"],
    });

    const resumed = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-snapshot-draft-complete"));
    expect(resumed.ledger.steps.find((step) => step.id === "10-triple-draft")?.status).toBe("complete");
    expect(resumed.ledger.reportSnapshots).toHaveLength(1);
    expect(resumed.ledger.patchGuard.snapshotPath).toBe(`research/notes/final_report_${resumed.ledger.vaultTag}.md`);
  });

  it("blocks completed run validation when claim trace is missing or references uncaptured sources", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Claim trace proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-claim-trace-start"));

    const advanced = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
    }, invocation("v8-claim-trace-advance"));
    expect(advanced.status).toBe("complete");

    await fs.writeFile(
      path.join(fixture.vaultRoot, "research", "claim-trace.json"),
      JSON.stringify({
        claims: [
          {
            claim: "Uncaptured source claim",
            reportLocation: "research/notes/final_report_claim-trace-proof.md",
            sources: [{ url: "https://example.com/uncaptured" }],
          },
        ],
      }, null, 2),
      "utf8",
    );

    const validation = await client.runs.validateV8Run({
      ledgerPath: started.ledgerPath,
    }, invocation("v8-claim-trace-validate"));
    expect(validation.passed).toBe(false);
    expect(validation.blockingFindings).toContainEqual(expect.objectContaining({
      code: "missing-source-capture",
    }));
    expect(validation.blockingFindings).toContainEqual(expect.objectContaining({
      code: "missing-claim-trace",
    }));
  });

  it("blocks failed agent outputs and does not complete the step on later advance calls", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Failed agent output proof",
      tier: "full",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-agent-fail-start"));

    await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-agent-fail-step-one"));
    const awaiting = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-agent-fail-awaiting"));

    const [failedJob, ...completedJobs] = awaiting.pendingAgentJobs;
    if (!failedJob) throw new Error("expected a pending agent job");
    await fs.writeFile(
      path.join(fixture.vaultRoot, failedJob.expectedOutputPath),
      JSON.stringify({
        jobId: failedJob.id,
        role: failedJob.role,
        status: "failed",
        summary: "failed",
        evidence: [],
        failure: "simulated agent failure",
      }, null, 2),
      "utf8",
    );
    await Promise.all(completedJobs.map((job) => fs.writeFile(
      path.join(fixture.vaultRoot, job.expectedOutputPath),
      JSON.stringify({
        jobId: job.id,
        role: job.role,
        status: "complete",
        summary: job.role,
        evidence: [],
      }, null, 2),
      "utf8",
    )));

    const blocked = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-agent-fail-block"));
    expect(blocked.status).toBe("blocked");
    expect(blocked.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("blocked");

    const stillBlocked = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
    }, invocation("v8-agent-fail-rerun"));
    expect(stillBlocked.status).toBe("blocked");
    expect(stillBlocked.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("blocked");
  });

  it("rejects mismatched start/resume inputs for an existing V8 ledger", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    await client.runs.startV8Run({
      canonicalQuery: "Original query",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-mismatch-start"));

    await expect(client.runs.startV8Run({
      canonicalQuery: "Different query",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-mismatch-second"))).rejects.toThrow("mismatched canonicalQuery");
  });

  it("blocks the active step when a required fixture CLI operation fails", async () => {
    const fixture = await makeV8Fixture();
    const startClient = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await startClient.runs.startV8Run({
      canonicalQuery: "Failed required CLI proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-cli-fail-start"));

    const failClient = createClient(createClientOptions({
      repoRoot: fixture.root,
      cli: new RecordingCli({ exitCode: 2, stderr: "simulated required CLI failure" }),
    }));
    const result = await failClient.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
      maxSteps: 2,
    }, invocation("v8-cli-fail-advance"));

    expect(result.status).toBe("blocked");
    expect(result.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("blocked");
    expect(result.integrity).toContainEqual(expect.objectContaining({
      severity: "blocking",
      code: "failed-cli-call",
    }));
  });

  it("blocks packet-mode completion when a required CLI operation fails after agent outputs", async () => {
    const fixture = await makeV8Fixture();
    const startClient = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await startClient.runs.startV8Run({
      canonicalQuery: "Failed packet CLI proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-packet-cli-fail-start"));

    await startClient.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-cli-fail-step-one"));
    const awaiting = await startClient.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-cli-fail-awaiting"));

    await Promise.all(awaiting.pendingAgentJobs.map((job) => fs.writeFile(
      path.join(fixture.vaultRoot, job.expectedOutputPath),
      JSON.stringify({
        jobId: job.id,
        role: job.role,
        status: "complete",
        summary: job.role,
        evidence: ["https://www.python.org/about/"],
        sourceUrls: ["https://www.python.org/about/"],
      }, null, 2),
      "utf8",
    )));

    const failClient = createClient(createClientOptions({
      repoRoot: fixture.root,
      cli: new RecordingCli({ exitCode: 2, stderr: "simulated packet CLI failure" }),
    }));
    const blocked = await failClient.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-cli-fail-advance"));

    expect(blocked.status).toBe("blocked");
    expect(blocked.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("blocked");
    expect(blocked.integrity).toContainEqual(expect.objectContaining({
      severity: "blocking",
      code: "failed-cli-call",
    }));
  });

  it("blocks packet-mode source capture when agent outputs provide no source URLs", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Missing packet URL proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-packet-missing-url-start"));

    await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-missing-url-step-one"));
    const awaiting = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-missing-url-awaiting"));

    await Promise.all(awaiting.pendingAgentJobs.map((job) => fs.writeFile(
      path.join(fixture.vaultRoot, job.expectedOutputPath),
      JSON.stringify({
        jobId: job.id,
        role: job.role,
        status: "complete",
        summary: job.role,
        evidence: [],
      }, null, 2),
      "utf8",
    )));

    const blocked = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-missing-url-advance"));

    expect(blocked.status).toBe("blocked");
    expect(blocked.ledger.steps.find((step) => step.id === "02-width-sweep")?.failure)
      .toContain("requires a source URL");
  });

  it("blocks packet-mode source capture when agent outputs provide malformed source URLs", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runs.startV8Run({
      canonicalQuery: "Malformed packet URL proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-packet-bad-url-start"));

    await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-bad-url-step-one"));
    const awaiting = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-bad-url-awaiting"));

    await Promise.all(awaiting.pendingAgentJobs.map((job) => fs.writeFile(
      path.join(fixture.vaultRoot, job.expectedOutputPath),
      JSON.stringify({
        jobId: job.id,
        role: job.role,
        status: "complete",
        summary: job.role,
        evidence: [],
        sourceUrls: ["not-a-url"],
      }, null, 2),
      "utf8",
    )));

    const blocked = await client.runs.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-bad-url-advance"));

    expect(blocked.status).toBe("blocked");
    expect(blocked.ledger.steps.find((step) => step.id === "02-width-sweep")?.failure)
      .toContain("invalid source URL");
  });
});
