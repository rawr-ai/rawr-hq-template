import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { createClientOptions, createTestHqOpsResources, invocation, writeGlobalRawrConfig, writeRawrConfig } from "./helpers";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

async function tempRoot(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe("hq-ops service resource-backed behavior", () => {
  it("owns config load, merge, validation, and global source mutation over primitive resources", async () => {
    const repoRoot = await tempRoot("hq-ops-config-");
    const homeDir = await tempRoot("hq-ops-home-");

    await writeGlobalRawrConfig(homeDir, {
      version: 1,
      sync: {
        sources: { paths: ["/global/a"] },
      },
    });
    await writeRawrConfig(repoRoot, {
      version: 1,
      sync: {
        sources: { paths: ["/workspace/b"] },
      },
    });

    const client = createClient(
      createClientOptions({
        repoRoot,
        homeDir,
      }),
    );

    const layered = await client.config.getLayeredConfig({}, invocation("trace-config"));
    expect(layered.global.path).toBe(path.join(homeDir, ".rawr", "config.json"));
    expect(layered.workspace.path).toBe(path.join(repoRoot, "rawr.config.ts"));
    expect(layered.merged?.sync?.sources?.paths).toEqual(["/global/a", "/workspace/b"]);

    const added = await client.config.addGlobalSyncSource({ path: "/global/c" }, invocation("trace-config-add"));
    expect(added.sources).toContain("/global/c");

    const removed = await client.config.removeGlobalSyncSource(
      { path: "/global/c" },
      invocation("trace-config-remove"),
    );
    expect(removed.sources).not.toContain("/global/c");
  });

  it("owns repo-state authority and mutation behavior over primitive resources", async () => {
    const repoRoot = await tempRoot("hq-ops-state-");
    const client = createClient(createClientOptions({ repoRoot }));

    const initial = await client.repoState.getState({}, invocation("trace-state"));
    expect(initial.authorityRepoRoot).toBe(await fs.realpath(repoRoot));
    expect(initial.state.plugins.enabled).toEqual([]);

    const enabled = await client.repoState.enablePlugin({ pluginId: "@rawr/plugin-next" }, invocation("trace-enable"));
    expect(enabled.plugins.enabled).toEqual(["@rawr/plugin-next"]);

    const disabled = await client.repoState.disablePlugin({ pluginId: "@rawr/plugin-next" }, invocation("trace-disable"));
    expect(disabled.plugins.enabled).toEqual([]);
    expect(disabled.plugins.disabled).toEqual(["@rawr/plugin-next"]);
  });

  it("owns journal persistence, index, FTS, and semantic ranking over primitive resources", async () => {
    const repoRoot = await tempRoot("hq-ops-journal-");
    const client = createClient(createClientOptions({ repoRoot }));

    const snippet = {
      id: "snippet-1",
      ts: "2026-04-16T00:00:00.000Z",
      kind: "note" as const,
      title: "Saved snippet",
      preview: "Saved preview",
      body: "Saved body mentions aardvark",
      tags: ["ops"],
    };

    const writeResult = await client.journal.writeSnippet(snippet, invocation("trace-write"));
    expect(writeResult.path).toBe(path.join(repoRoot, ".rawr", "journal", "snippets", "snippet-1.json"));

    const getResult = await client.journal.getSnippet({ id: "snippet-1" }, invocation("trace-get"));
    expect(getResult.snippet?.id).toBe("snippet-1");

    const tail = await client.journal.tailSnippets({ limit: 1 }, invocation("trace-tail"));
    expect(tail.snippets).toHaveLength(1);

    const fts = await client.journal.searchSnippets(
      { query: "aardvark", limit: 1, mode: "fts" },
      invocation("trace-search-fts"),
    );
    expect(fts.mode).toBe("fts");
    expect(fts.snippets[0]?.id).toBe("snippet-1");

    const semantic = await client.journal.searchSnippets(
      { query: "Saved", limit: 1, mode: "semantic" },
      invocation("trace-search-semantic"),
    );
    expect(semantic.mode).toBe("semantic");
    expect(semantic.snippets[0]?.score).toBeTypeOf("number");
  });

  it("owns security scan, report, and risk gate policy over process resources", async () => {
    const repoRoot = await tempRoot("hq-ops-security-");
    const resources = createTestHqOpsResources({
      exec: async (cmd, args) => {
        if (cmd === "git" && args[0] === "rev-parse") {
          return {
            exitCode: 0,
            signal: null,
            stdout: Buffer.from(`${repoRoot}\n`),
            stderr: new Uint8Array(),
            durationMs: 0,
          };
        }
        if (cmd === "git" && args[0] === "ls-files") {
          return {
            exitCode: 0,
            signal: null,
            stdout: new Uint8Array(),
            stderr: new Uint8Array(),
            durationMs: 0,
          };
        }
        if (cmd === "git" && args[0] === "diff") {
          return {
            exitCode: 0,
            signal: null,
            stdout: new Uint8Array(),
            stderr: new Uint8Array(),
            durationMs: 0,
          };
        }
        if (cmd === "bun" && args[0] === "audit") {
          return {
            exitCode: 1,
            signal: null,
            stdout: Buffer.from(
              JSON.stringify({
                vulnerable: [
                  {
                    title: "Known issue",
                    severity: "high",
                  },
                ],
              }),
            ),
            stderr: new Uint8Array(),
            durationMs: 0,
          };
        }
        return {
          exitCode: 0,
          signal: null,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
          durationMs: 0,
        };
      },
    });

    const client = createClient(createClientOptions({ repoRoot, resources }));

    const report = await client.security.securityCheck({ mode: "repo" }, invocation("trace-security"));
    expect(report.ok).toBe(false);
    expect(report.summary).toBe("vulns=1, untrusted=0, secrets=0");
    expect(report.reportPath).toContain(path.join(repoRoot, ".rawr", "security", "report-"));

    const evaluation = await client.security.gateEnable(
      {
        pluginId: "@rawr/plugin-mfe-demo",
        riskTolerance: "balanced",
        mode: "repo",
      },
      invocation("trace-gate"),
    );
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.requiresForce).toBe(true);
    expect(evaluation.report.meta?.pluginId).toBe("@rawr/plugin-mfe-demo");

    const latest = await client.security.getSecurityReport({}, invocation("trace-report"));
    expect(latest?.meta?.repoRoot).toBe(repoRoot);
  });
});
