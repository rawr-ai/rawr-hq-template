import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src";
import { v8HyperresearchSteps } from "../src/service/modules/runtime/helpers/steps";
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

describe("hyperresearch-codex V8 runtime", () => {
  it("starts a versioned V8 run with query, scaffold, route, and CLI init audit", async () => {
    const fixture = await makeV8Fixture();
    const cli = new RecordingCli();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli }));

    const result = await client.runtime.startV8Run({
      canonicalQuery: "Map Codex parity for Hyperresearch",
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
    const started = await client.runtime.startV8Run({
      canonicalQuery: "Light V8 proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-light-start"));

    const advanced = await client.runtime.advanceV8Run({
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
    await expect(fs.readFile(path.join(fixture.vaultRoot, "research", "notes", "final_report_light-v8-proof.md"), "utf8"))
      .resolves.toContain("Light Fixture Report");
    expect(advanced.integrity.filter((finding) => finding.severity === "blocking")).toEqual([]);

    const validation = await client.runtime.validateV8Run({
      ledgerPath: started.ledgerPath,
    }, invocation("v8-light-validate"));
    expect(validation.passed).toBe(true);
    expect(validation.blockingFindings).toEqual([]);
  });

  it("runs the full fixture route across all 16 V8 steps", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runtime.startV8Run({
      canonicalQuery: "Full V8 proof",
      tier: "full",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-full-start"));

    const advanced = await client.runtime.advanceV8Run({
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
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runtime.startV8Run({
      canonicalQuery: "Codex packet proof",
      tier: "full",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-packet-start"));

    const stepOne = await client.runtime.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-packet-step-one"));
    expect(stepOne.ledger.currentStepId).toBe("02-width-sweep");

    const awaiting = await client.runtime.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-packet-awaiting"));
    expect(awaiting.status).toBe("awaiting_agents");
    expect(awaiting.pendingAgentJobs.map((job) => job.role)).toEqual([
      "hyperresearch-fetcher",
      "hyperresearch-source-analyst",
    ]);

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

    const resumed = await client.runtime.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
      resumeReason: "agent outputs written",
    }, invocation("v8-packet-resume"));
    expect(resumed.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("complete");
    expect(resumed.ledger.resumes).toContainEqual(expect.objectContaining({
      reason: "agent outputs written",
    }));
  });

  it("blocks failed agent outputs and does not complete the step on later advance calls", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await client.runtime.startV8Run({
      canonicalQuery: "Failed agent output proof",
      tier: "full",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-agent-fail-start"));

    await client.runtime.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
      maxSteps: 1,
    }, invocation("v8-agent-fail-step-one"));
    const awaiting = await client.runtime.advanceV8Run({
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

    const blocked = await client.runtime.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "packets",
    }, invocation("v8-agent-fail-block"));
    expect(blocked.status).toBe("blocked");
    expect(blocked.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("blocked");

    const stillBlocked = await client.runtime.advanceV8Run({
      ledgerPath: started.ledgerPath,
      agentMode: "synthesize",
    }, invocation("v8-agent-fail-rerun"));
    expect(stillBlocked.status).toBe("blocked");
    expect(stillBlocked.ledger.steps.find((step) => step.id === "02-width-sweep")?.status).toBe("blocked");
  });

  it("rejects mismatched start/resume inputs for an existing V8 ledger", async () => {
    const fixture = await makeV8Fixture();
    const client = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    await client.runtime.startV8Run({
      canonicalQuery: "Original query",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-mismatch-start"));

    await expect(client.runtime.startV8Run({
      canonicalQuery: "Different query",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-mismatch-second"))).rejects.toThrow("mismatched canonicalQuery");
  });

  it("blocks the active step when a required fixture CLI operation fails", async () => {
    const fixture = await makeV8Fixture();
    const startClient = createClient(createClientOptions({ repoRoot: fixture.root, cli: new RecordingCli() }));
    const started = await startClient.runtime.startV8Run({
      canonicalQuery: "Failed required CLI proof",
      tier: "light",
      vaultRoot: fixture.vaultRoot,
      stepsRoot: fixture.stepsRoot,
    }, invocation("v8-cli-fail-start"));

    const failClient = createClient(createClientOptions({
      repoRoot: fixture.root,
      cli: new RecordingCli({ exitCode: 2, stderr: "simulated required CLI failure" }),
    }));
    const result = await failClient.runtime.advanceV8Run({
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
});
