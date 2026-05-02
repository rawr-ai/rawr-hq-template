import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import HyperresearchCodexSlice from "../src/commands/hyperresearch/codex-slice";

const tempDirs: string[] = [];

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
});
