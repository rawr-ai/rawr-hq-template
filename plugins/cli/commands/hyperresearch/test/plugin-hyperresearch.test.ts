import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import HyperresearchCodexAdvance from "../src/commands/hyperresearch/codex/advance";
import HyperresearchCodexStart from "../src/commands/hyperresearch/codex/start";
import HyperresearchCodexValidate from "../src/commands/hyperresearch/codex/validate";

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

async function makeV8Fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-plugin-hyperresearch-v8-"));
  tempDirs.push(root);
  const steps = path.join(root, "steps");
  const vault = path.join(root, "vault");
  await fs.mkdir(steps, { recursive: true });
  await Promise.all(
    v8StepFiles.map((fileName) =>
      fs.writeFile(path.join(steps, fileName), `# ${fileName}\n`, "utf8")
    )
  );
  return { steps, vault };
}

describe("@habitat-ai/rawr-plugin-hyperresearch", () => {
  it("starts and advances a V8 ledger through thin CLI commands", async () => {
    const fixture = await makeV8Fixture();
    const startSpy = vi
      .spyOn(HyperresearchCodexStart.prototype as any, "outputResult" as any)
      .mockImplementation(() => {});
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
    const [started] = startSpy.mock.calls[0] as unknown as [
      {
        ok: boolean;
        data: {
          ledgerPath: string;
          status: string;
        };
      },
    ];
    expect(started.ok).toBe(true);
    expect(started.data.status).toBe("running");

    vi.restoreAllMocks();
    const advanceSpy = vi
      .spyOn(HyperresearchCodexAdvance.prototype as any, "outputResult" as any)
      .mockImplementation(() => {});
    await HyperresearchCodexAdvance.run([
      "--ledger",
      started.data.ledgerPath,
      "--agent-mode",
      "synthesize",
      "--json",
    ]);
    const [advanced] = advanceSpy.mock.calls[0] as unknown as [
      {
        ok: boolean;
        data: {
          status: string;
          completed: boolean;
        };
      },
    ];
    expect(advanced.ok).toBe(true);
    expect(advanced.data.status).toBe("complete");
    expect(advanced.data.completed).toBe(true);
  });

  it("accepts backend on V8 validation for command-surface symmetry", async () => {
    const fixture = await makeV8Fixture();
    const startSpy = vi
      .spyOn(HyperresearchCodexStart.prototype as any, "outputResult" as any)
      .mockImplementation(() => {});
    await HyperresearchCodexStart.run([
      "--query",
      "Codex V8 validate proof",
      "--vault",
      fixture.vault,
      "--steps",
      fixture.steps,
      "--tier",
      "light",
      "--json",
    ]);
    const [started] = startSpy.mock.calls[0] as unknown as [
      {
        ok: boolean;
        data: {
          ledgerPath: string;
        };
      },
    ];

    vi.restoreAllMocks();
    const advanceSpy = vi
      .spyOn(HyperresearchCodexAdvance.prototype as any, "outputResult" as any)
      .mockImplementation(() => {});
    await HyperresearchCodexAdvance.run([
      "--ledger",
      started.data.ledgerPath,
      "--agent-mode",
      "synthesize",
      "--json",
    ]);
    expect((advanceSpy.mock.calls[0] as unknown as [{ ok: boolean }])[0].ok).toBe(true);

    vi.restoreAllMocks();
    const validateSpy = vi
      .spyOn(HyperresearchCodexValidate.prototype as any, "outputResult" as any)
      .mockImplementation(() => {});
    await HyperresearchCodexValidate.run([
      "--ledger",
      started.data.ledgerPath,
      "--backend",
      "real",
      "--json",
    ]);
    const [validated] = validateSpy.mock.calls[0] as unknown as [
      {
        ok: boolean;
        data: {
          status: string;
          passed: boolean;
        };
      },
    ];
    expect(validated.ok).toBe(true);
    expect(validated.data.status).toBe("complete");
    expect(validated.data.passed).toBe(true);
  });
});
