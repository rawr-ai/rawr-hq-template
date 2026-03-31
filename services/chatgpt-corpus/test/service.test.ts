import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../src";
import { copyFixtureWorkspace, createClientOptions, createInvocation } from "./helpers";

const tempPaths: string[] = [];

afterEach(async () => {
  while (tempPaths.length > 0) {
    const tempPath = tempPaths.pop();
    if (tempPath) {
      await fs.rm(tempPath, { recursive: true, force: true });
    }
  }
});

async function makeTempWorkspace(prefix: string) {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempPaths.push(workspaceRoot);
  return workspaceRoot;
}

describe("@rawr/chatgpt-corpus", () => {
  it("keeps the package-root client entrypoint stable", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-chatgpt-corpus-package-root-");
    const pkg = await import("../src");
    const client = pkg.createClient(createClientOptions());

    const result = await client.corpus.initWorkspace(
      { workspaceRoot },
      createInvocation("trace-package-root"),
    );

    expect(result.workspaceRoot).toBe(workspaceRoot);
  });

  it("initializes the canonical workspace layout", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-chatgpt-corpus-init-");
    const client = createClient(createClientOptions());

    const result = await client.corpus.initWorkspace(
      { workspaceRoot },
      createInvocation("trace-init"),
    );

    await expect(fs.stat(path.join(workspaceRoot, "source-material", "conversations", "raw-json"))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(workspaceRoot, "work", "docs", "source"))).resolves.toBeTruthy();
    await expect(fs.readFile(path.join(workspaceRoot, ".gitignore"), "utf8")).resolves.toContain("work/generated/");
    expect(result.files.readmePath).toBe(path.join(workspaceRoot, "work", "README.md"));
  });

  it("consolidates fixture exports into reports and family graphs", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-chatgpt-corpus-fixture-");
    const client = createClient(createClientOptions());
    await client.corpus.initWorkspace({ workspaceRoot }, createInvocation("trace-init-fixture"));
    await copyFixtureWorkspace(workspaceRoot);

    const result = await client.corpus.consolidateWorkspace(
      { workspaceRoot },
      createInvocation("trace-consolidate"),
    );

    expect(result.sourceCounts).toMatchObject({
      jsonConversations: 4,
      markdownDocuments: 1,
      totalSources: 5,
    });
    expect(result.familyCount).toBe(2);
    expect(result.normalizedThreadCount).toBe(2);
    expect(result.anomalyCount).toBeGreaterThanOrEqual(3);

    const manifest = JSON.parse(await fs.readFile(result.outputPaths.manifest, "utf8")) as {
      corpus_summary: { source_count: number; family_count: number };
    };
    expect(manifest.corpus_summary).toMatchObject({
      source_count: 5,
      family_count: 2,
    });

    const familyGraphs = JSON.parse(await fs.readFile(result.outputPaths.familyGraphs, "utf8")) as Array<{
      canonical_title: string;
      classification: Record<string, string>;
    }>;
    const alphaFamily = familyGraphs.find((family) => family.canonical_title === "Alpha Architecture");
    expect(alphaFamily).toBeTruthy();
    expect(Object.values(alphaFamily!.classification)).toContain("duplicate");
  });

  it("succeeds on an empty workspace and emits warnings", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-chatgpt-corpus-empty-");
    const client = createClient(createClientOptions());
    await client.corpus.initWorkspace({ workspaceRoot }, createInvocation("trace-empty-init"));

    const result = await client.corpus.consolidateWorkspace(
      { workspaceRoot },
      createInvocation("trace-empty"),
    );

    expect(result.sourceCounts).toMatchObject({
      jsonConversations: 0,
      markdownDocuments: 0,
      totalSources: 0,
    });
    expect(result.warnings).toContain("No conversation exports were found under source-material/conversations/raw-json.");
    expect(result.warnings).toContain("No curated Markdown source docs were found under work/docs/source.");
  });

  it("returns a typed invalid export error for malformed export shape", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-chatgpt-corpus-invalid-shape-");
    const client = createClient(createClientOptions());
    await client.corpus.initWorkspace({ workspaceRoot }, createInvocation("trace-invalid-shape-init"));
    await fs.writeFile(
      path.join(workspaceRoot, "source-material", "conversations", "raw-json", "bad.json"),
      JSON.stringify({ metadata: { title: "Broken" }, messages: "nope" }, null, 2),
      "utf8",
    );

    await expect(
      client.corpus.consolidateWorkspace(
        { workspaceRoot },
        createInvocation("trace-invalid-shape"),
      ),
    ).rejects.toMatchObject({
      defined: true,
      code: "INVALID_CONVERSATION_EXPORT",
      data: {
        path: path.join(workspaceRoot, "source-material", "conversations", "raw-json", "bad.json"),
      },
    });
  });

  it("returns a typed invalid json error for unparseable conversation files", async () => {
    const workspaceRoot = await makeTempWorkspace("rawr-chatgpt-corpus-invalid-json-");
    const client = createClient(createClientOptions());
    await client.corpus.initWorkspace({ workspaceRoot }, createInvocation("trace-invalid-json-init"));
    await fs.writeFile(
      path.join(workspaceRoot, "source-material", "conversations", "raw-json", "bad.json"),
      "{ this is not json",
      "utf8",
    );

    await expect(
      client.corpus.consolidateWorkspace(
        { workspaceRoot },
        createInvocation("trace-invalid-json"),
      ),
    ).rejects.toMatchObject({
      defined: true,
      code: "INVALID_CONVERSATION_JSON",
      data: {
        path: path.join(workspaceRoot, "source-material", "conversations", "raw-json", "bad.json"),
      },
    });
  });
});
