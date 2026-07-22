import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src";
import { assertAllowedHyperresearchOperation } from "../src/service/common/adapters/hyperresearch-cli";
import { createClientOptions, invocation, RecordingCli } from "./helpers";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeRunFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hyperresearch-codex-"));
  tempDirs.push(root);
  const stepsRoot = path.join(root, "steps");
  const vaultRoot = path.join(root, "vault");
  await fs.mkdir(stepsRoot, { recursive: true });
  await fs.writeFile(
    path.join(stepsRoot, "01-canonical-query.md"),
    "# Step 1\nPersist the query.\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(stepsRoot, "02-source-capture.md"),
    "# Step 2\nCapture a source.\n",
    "utf8"
  );
  await fs.writeFile(
    path.join(stepsRoot, "03-final-artifact.md"),
    "# Step 3\nWrite final report.\n",
    "utf8"
  );
  return { root, stepsRoot, vaultRoot };
}

describe("hyperresearch-codex synthetic runtime slice", () => {
  it("runs the synthetic three-step control plane with fresh step hashes, CLI calls, and final artifacts", async () => {
    const fixture = await makeRunFixture();
    const cli = new RecordingCli();
    const client = createClient(
      createClientOptions({
        repoRoot: fixture.root,
        cli,
      })
    );

    const result = await client.fixtures.runSyntheticSlice(
      {
        canonicalQuery: "Compare Codex and Claude Hyperresearch runtime parity",
        tier: "light",
        vaultRoot: fixture.vaultRoot,
        stepsRoot: fixture.stepsRoot,
      },
      invocation("full-run")
    );

    expect(result.ledger.completed).toBe(true);
    expect(result.integrity.filter((finding) => finding.severity === "blocking")).toEqual([]);
    expect(result.ledger.steps.map((step) => step.status)).toEqual([
      "complete",
      "complete",
      "complete",
    ]);
    expect(result.ledger.steps.every((step) => step.loaded?.sha256)).toBe(true);
    expect(cli.calls.map((call) => ({ operation: call.operation, args: call.args }))).toEqual([
      { operation: "init", args: ["--json"] },
      { operation: "note", args: ["new", "--json", "Synthetic Codex parity source"] },
      { operation: "lint", args: ["--json"] },
      { operation: "export", args: ["json", "--json"] },
    ]);
    await expect(
      fs.readFile(
        path.join(fixture.vaultRoot, "research", "temp", "codex-artifacts", "final-report.md"),
        "utf8"
      )
    ).resolves.toContain("Hyperresearch Codex Synthetic Report");
  });

  it("resumes from the durable ledger without rerunning completed steps", async () => {
    const fixture = await makeRunFixture();
    const firstCli = new RecordingCli();
    const firstClient = createClient(
      createClientOptions({
        repoRoot: fixture.root,
        cli: firstCli,
      })
    );

    const first = await firstClient.fixtures.runSyntheticSlice(
      {
        canonicalQuery: "Resume proof",
        tier: "full",
        vaultRoot: fixture.vaultRoot,
        stepsRoot: fixture.stepsRoot,
        maxSteps: 1,
      },
      invocation("first-pass")
    );

    expect(first.ledger.completed).toBe(false);
    expect(first.ledger.currentStepId).toBe("02-source-capture");
    expect(firstCli.calls.map((call) => call.operation)).toEqual(["init"]);

    const secondCli = new RecordingCli();
    const secondClient = createClient(
      createClientOptions({
        repoRoot: fixture.root,
        cli: secondCli,
      })
    );
    const second = await secondClient.fixtures.runSyntheticSlice(
      {
        canonicalQuery: "Resume proof",
        tier: "full",
        vaultRoot: fixture.vaultRoot,
        stepsRoot: fixture.stepsRoot,
        resumeReason: "test resume",
      },
      invocation("second-pass")
    );

    expect(second.ledger.completed).toBe(true);
    expect(second.ledger.resumes).toEqual([
      expect.objectContaining({ reason: "test resume", nextStepId: "02-source-capture" }),
    ]);
    expect(secondCli.calls.map((call) => call.operation)).toEqual(["note", "lint", "export"]);
  });

  it("keeps unsupported backend operations out of the runner contract", () => {
    expect(() => assertAllowedHyperresearchOperation("research")).toThrow(
      "Unsupported Hyperresearch CLI operation: research"
    );
  });

  it("records incomplete runs as warnings instead of silently passing final acceptance", async () => {
    const fixture = await makeRunFixture();
    const client = createClient(
      createClientOptions({
        repoRoot: fixture.root,
        cli: new RecordingCli(),
      })
    );
    const result = await client.fixtures.runSyntheticSlice(
      {
        canonicalQuery: "Partial run",
        tier: "light",
        vaultRoot: fixture.vaultRoot,
        stepsRoot: fixture.stepsRoot,
        maxSteps: 1,
      },
      invocation("partial-run")
    );

    expect(result.integrity).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "incomplete-run",
      })
    );
  });

  it("returns blocking integrity findings when the CLI backend fails", async () => {
    const fixture = await makeRunFixture();
    const cli = new RecordingCli({
      exitCode: 2,
      stderr: "simulated backend failure",
    });
    const client = createClient(
      createClientOptions({
        repoRoot: fixture.root,
        cli,
      })
    );

    const result = await client.fixtures.runSyntheticSlice(
      {
        canonicalQuery: "Failed backend proof",
        tier: "light",
        vaultRoot: fixture.vaultRoot,
        stepsRoot: fixture.stepsRoot,
      },
      invocation("failed-backend")
    );

    expect(result.integrity).toContainEqual(
      expect.objectContaining({
        severity: "blocking",
        code: "failed-cli-call",
      })
    );
  });

  it("records missing fresh step references as failed steps", async () => {
    const fixture = await makeRunFixture();
    await fs.rm(path.join(fixture.stepsRoot, "02-source-capture.md"));
    const client = createClient(
      createClientOptions({
        repoRoot: fixture.root,
        cli: new RecordingCli(),
      })
    );

    const result = await client.fixtures.runSyntheticSlice(
      {
        canonicalQuery: "Missing step proof",
        tier: "light",
        vaultRoot: fixture.vaultRoot,
        stepsRoot: fixture.stepsRoot,
      },
      invocation("missing-step")
    );

    expect(result.ledger.completed).toBe(false);
    expect(result.integrity).toContainEqual(
      expect.objectContaining({
        severity: "blocking",
        code: "failed-step",
        stepId: "02-source-capture",
      })
    );
  });
});
