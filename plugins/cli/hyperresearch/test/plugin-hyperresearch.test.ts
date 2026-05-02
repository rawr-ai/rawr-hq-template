import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import HyperresearchCodexSlice from "../src/commands/hyperresearch/codex-slice";
import HyperresearchCodexAdvance from "../src/commands/hyperresearch/codex/advance";
import HyperresearchCodexRunFixture from "../src/commands/hyperresearch/codex/run-fixture";
import HyperresearchCodexStart from "../src/commands/hyperresearch/codex/start";

const tempDirs: string[] = [];
const v8StepFiles = [
  "hyperresearch-1-decompose.md",
  "hyperresearch-2-width-sweep.md",
  "hyperresearch-3-contradiction-graph.md",
  "hyperresearch-4-loci-analysis.md",
  "hyperresearch-5-depth-investigation.md",
  "hyperresearch-6-cross-locus-reconcile.md",
  "hyperresearch-7-source-tensions.md",
  "hyperresearch-8-corpus-critic.md",
  "hyperresearch-9-evidence-digest.md",
  "hyperresearch-10-triple-draft.md",
  "hyperresearch-11-synthesize.md",
  "hyperresearch-12-critics.md",
  "hyperresearch-13-gap-fetch.md",
  "hyperresearch-14-patcher.md",
  "hyperresearch-15-polish.md",
  "hyperresearch-16-readability-audit.md",
];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-plugin-hyperresearch-"));
  tempDirs.push(root);
  const steps = path.join(root, "steps");
  const vault = path.join(root, "vault");
  await fs.mkdir(steps, { recursive: true });
  await fs.writeFile(path.join(steps, "01-canonical-query.md"), "# Step 1\n", "utf8");
  await fs.writeFile(path.join(steps, "02-source-capture.md"), "# Step 2\n", "utf8");
  await fs.writeFile(path.join(steps, "03-final-artifact.md"), "# Step 3\n", "utf8");
  return { steps, vault };
}

async function makeV8Fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-plugin-hyperresearch-v8-"));
  tempDirs.push(root);
  const steps = path.join(root, "steps");
  const vault = path.join(root, "vault");
  await fs.mkdir(steps, { recursive: true });
  await Promise.all(v8StepFiles.map((fileName) => fs.writeFile(
    path.join(steps, fileName),
    `# ${fileName}\n`,
    "utf8",
  )));
  return { steps, vault };
}

describe("@rawr/plugin-hyperresearch", () => {
  it("runs the codex-slice command with fixture backend and returns structured json", async () => {
    const fixture = await makeFixture();
    const outputSpy = vi.spyOn(HyperresearchCodexSlice.prototype as any, "outputResult" as any).mockImplementation(() => {});

    await HyperresearchCodexSlice.run([
      "--query",
      "Codex parity proof",
      "--vault",
      fixture.vault,
      "--steps",
      fixture.steps,
      "--json",
    ]);

    const [parsed] = outputSpy.mock.calls[0] as unknown as [{
      ok: boolean;
      data: {
        completed: boolean;
        completedSteps: string[];
        cliCalls: Array<{ operation: string; exitCode: number; args?: string[] }>;
      };
    }];

    expect(parsed.ok).toBe(true);
    expect(parsed.data.completed).toBe(true);
    expect(parsed.data.completedSteps).toEqual([
      "01-canonical-query",
      "02-source-capture",
      "03-final-artifact",
    ]);
    expect(parsed.data.cliCalls.map((call) => call.operation)).toEqual(["init", "note", "lint", "export"]);
  });

  it("returns a failed result when integrity gates block acceptance", async () => {
    const fixture = await makeFixture();
    await fs.rm(path.join(fixture.steps, "02-source-capture.md"));
    const outputSpy = vi.spyOn(HyperresearchCodexSlice.prototype as any, "outputResult" as any).mockImplementation(() => {});

    await expect(HyperresearchCodexSlice.run([
      "--query",
      "Codex parity proof",
      "--vault",
      fixture.vault,
      "--steps",
      fixture.steps,
      "--backend",
      "fixture",
      "--json",
    ])).rejects.toThrow();

    const [parsed] = outputSpy.mock.calls[0] as unknown as [{
      ok: boolean;
      error: {
        code: string;
        details: {
          integrity: Array<{ severity: string; code: string; stepId?: string }>;
        };
      };
    }];

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe("HYPERRESEARCH_CODEX_INTEGRITY_BLOCKED");
    expect(parsed.error.details.integrity).toContainEqual(expect.objectContaining({
      severity: "blocking",
      code: "failed-step",
      stepId: "02-source-capture",
    }));
  });

  it("runs the V8 fixture command with the service-owned start/advance loop", async () => {
    const fixture = await makeV8Fixture();
    const outputSpy = vi.spyOn(HyperresearchCodexRunFixture.prototype as any, "outputResult" as any).mockImplementation(() => {});

    await HyperresearchCodexRunFixture.run([
      "--query",
      "Codex V8 fixture proof",
      "--vault",
      fixture.vault,
      "--steps",
      fixture.steps,
      "--tier",
      "light",
      "--json",
    ]);

    const [parsed] = outputSpy.mock.calls[0] as unknown as [{
      ok: boolean;
      data: {
        status: string;
        completed: boolean;
        completedSteps: string[];
      };
    }];

    expect(parsed.ok).toBe(true);
    expect(parsed.data.status).toBe("complete");
    expect(parsed.data.completed).toBe(true);
    expect(parsed.data.completedSteps).toEqual([
      "01-decompose",
      "02-width-sweep",
      "10-triple-draft",
      "15-polish",
      "16-readability-audit",
    ]);
  });

  it("starts and advances a V8 ledger through thin CLI commands", async () => {
    const fixture = await makeV8Fixture();
    const startSpy = vi.spyOn(HyperresearchCodexStart.prototype as any, "outputResult" as any).mockImplementation(() => {});
    await HyperresearchCodexStart.run([
      "--query",
      "Codex V8 command proof",
      "--vault",
      fixture.vault,
      "--steps",
      fixture.steps,
      "--tier",
      "light",
      "--json",
    ]);
    const [started] = startSpy.mock.calls[0] as unknown as [{
      ok: boolean;
      data: {
        ledgerPath: string;
        status: string;
      };
    }];
    expect(started.ok).toBe(true);
    expect(started.data.status).toBe("running");

    vi.restoreAllMocks();
    const advanceSpy = vi.spyOn(HyperresearchCodexAdvance.prototype as any, "outputResult" as any).mockImplementation(() => {});
    await HyperresearchCodexAdvance.run([
      "--ledger",
      started.data.ledgerPath,
      "--agent-mode",
      "synthesize",
      "--json",
    ]);
    const [advanced] = advanceSpy.mock.calls[0] as unknown as [{
      ok: boolean;
      data: {
        status: string;
        completed: boolean;
      };
    }];
    expect(advanced.ok).toBe(true);
    expect(advanced.data.status).toBe("complete");
    expect(advanced.data.completed).toBe(true);
  });
});
