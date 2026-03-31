import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import CorpusConsolidate from "../src/commands/corpus/consolidate";
import CorpusInit from "../src/commands/corpus/init";

const tempPaths: string[] = [];
const FIXTURES_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../../../services/chatgpt-corpus/test/fixtures",
);

afterEach(async () => {
  vi.restoreAllMocks();
  while (tempPaths.length > 0) {
    const tempPath = tempPaths.pop();
    if (tempPath) await fs.rm(tempPath, { recursive: true, force: true });
  }
});

async function makeTempWorkspace(prefix: string) {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempPaths.push(workspaceRoot);
  return workspaceRoot;
}

async function copyFixtureWorkspace(workspaceRoot: string): Promise<void> {
  await fs.mkdir(path.join(workspaceRoot, "source-material", "conversations", "raw-json"), {
    recursive: true,
  });
  await fs.mkdir(path.join(workspaceRoot, "work", "docs", "source"), {
    recursive: true,
  });

  await fs.cp(
    path.join(FIXTURES_ROOT, "raw-json"),
    path.join(workspaceRoot, "source-material", "conversations", "raw-json"),
    { recursive: true },
  );
  await fs.cp(
    path.join(FIXTURES_ROOT, "docs"),
    path.join(workspaceRoot, "work", "docs", "source"),
    { recursive: true },
  );
}

describe("@rawr/plugin-chatgpt-corpus", () => {
  it("initializes a workspace and returns structured json", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-plugin-corpus-init-");
    const outputSpy = vi.spyOn(CorpusInit.prototype as any, "outputResult" as any).mockImplementation(() => {});

    await CorpusInit.run([workspaceRoot, "--json"]);

    const [parsed] = outputSpy.mock.calls[0] as unknown as [{
      ok: boolean;
      data: {
        workspaceRoot: string;
        files: {
          readmePath: string;
        };
      };
    }];

    expect(parsed.ok).toBe(true);
    expect(parsed.data.workspaceRoot).toBe(workspaceRoot);
    await expect(fs.stat(parsed.data.files.readmePath)).resolves.toBeTruthy();
  });

  it("consolidates fixture workspaces and returns structured json", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-plugin-corpus-consolidate-");
    vi.spyOn(CorpusInit.prototype as any, "outputResult" as any).mockImplementation(() => {});
    await CorpusInit.run([workspaceRoot, "--json"]);
    await copyFixtureWorkspace(workspaceRoot);

    const outputSpy = vi.spyOn(CorpusConsolidate.prototype as any, "outputResult" as any).mockImplementation(() => {});
    await CorpusConsolidate.run([workspaceRoot, "--json"]);

    const [parsed] = outputSpy.mock.calls[0] as unknown as [{
      ok: boolean;
      data: {
        familyCount: number;
        sourceCounts: {
          jsonConversations: number;
        };
        outputPaths: {
          manifest: string;
        };
      };
    }];

    expect(parsed.ok).toBe(true);
    expect(parsed.data.familyCount).toBe(2);
    expect(parsed.data.sourceCounts.jsonConversations).toBe(4);
    await expect(fs.stat(parsed.data.outputPaths.manifest)).resolves.toBeTruthy();
  });

  it("prints concise human output for consolidate", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-plugin-corpus-human-");
    vi.spyOn(CorpusInit.prototype as any, "outputResult" as any).mockImplementation(() => {});
    await CorpusInit.run([workspaceRoot, "--json"]);
    await copyFixtureWorkspace(workspaceRoot);

    const logMessages: string[] = [];
    vi.spyOn(CorpusConsolidate.prototype as any, "log" as any).mockImplementation((...args: unknown[]) => {
      logMessages.push(args.map((value) => String(value)).join(" "));
    });
    vi.spyOn(CorpusConsolidate.prototype as any, "warn" as any).mockImplementation(() => {});

    await CorpusConsolidate.run([workspaceRoot]);

    expect(logMessages.join("\n")).toContain("consolidated 4 conversation export(s) into 2 family/families");
    expect(logMessages.join("\n")).toContain(path.join(workspaceRoot, "work", "generated", "reports"));
  });
});
