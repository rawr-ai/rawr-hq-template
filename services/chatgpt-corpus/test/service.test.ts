import { describe, expect, it } from "vitest";
import { createClient } from "../src";
import { createMemoryWorkspaceStore, createClientOptions, createInvocation, seedFixtureWorkspace } from "./helpers";

describe("@rawr/chatgpt-corpus", () => {
  it("keeps the package-root client entrypoint stable", async () => {
    const workspaceStore = createMemoryWorkspaceStore();
    const pkg = await import("../src");
    const client = pkg.createClient(createClientOptions(workspaceStore));

    const result = await client.workspace.describeTemplate(
      {},
      createInvocation("trace-package-root"),
    );

    expect(result.requiredDirectories).toContain("source-material/conversations/raw-json");
  });

  it("describes the canonical workspace template", async () => {
    const workspaceStore = createMemoryWorkspaceStore();
    const client = createClient(createClientOptions(workspaceStore));

    const result = await client.workspace.describeTemplate(
      {},
      createInvocation("trace-template"),
    );

    expect(result.requiredDirectories).toEqual([
      "source-material/conversations/raw-json",
      "work/docs/source",
    ]);
    expect(result.outputDirectories).toContain("work/generated/reports");
    expect(result.managedFiles.map((file) => file.fileId)).toEqual([
      "workspace-readme",
      "workspace-gitignore",
    ]);
  });

  it("initializes the canonical workspace layout through the workspace store", async () => {
    const workspaceRef = "workspace://init";
    const workspaceStore = createMemoryWorkspaceStore();
    const client = createClient(createClientOptions(workspaceStore, workspaceRef));

    const result = await client.workspace.initialize(
      {},
      createInvocation("trace-init"),
    );

    expect(result.workspaceRef).toBe(workspaceRef);
    expect(result.createdEntries).toContain("source-material/conversations/raw-json");
    expect(result.managedFiles).toEqual([
      { fileId: "workspace-readme", relativePath: "work/README.md" },
      { fileId: "workspace-gitignore", relativePath: ".gitignore" },
    ]);
    expect(workspaceStore.getFileContents(workspaceRef, ".gitignore")).toContain("work/generated/");
  });

  it("reads fixture exports into a normalized source snapshot", async () => {
    const workspaceRef = "workspace://fixture";
    const workspaceStore = createMemoryWorkspaceStore();
    seedFixtureWorkspace(workspaceStore, workspaceRef);
    const client = createClient(createClientOptions(workspaceStore, workspaceRef));

    const result = await client.sourceMaterials.readSnapshot(
      {},
      createInvocation("trace-read-snapshot"),
    );

    expect(result.sourceCounts).toEqual({
      jsonConversations: 4,
      markdownDocuments: 1,
      totalSources: 5,
    });
    expect(result.snapshot.jsonRecords[0]?.type).toBe("json_conversation");
  });

  it("builds the canonical corpus artifacts from a normalized source snapshot", async () => {
    const workspaceRef = "workspace://build";
    const workspaceStore = createMemoryWorkspaceStore();
    seedFixtureWorkspace(workspaceStore, workspaceRef);
    const client = createClient(createClientOptions(workspaceStore, workspaceRef));
    const snapshot = await client.sourceMaterials.readSnapshot({}, createInvocation("trace-build-read"));

    const result = await client.corpusArtifacts.build(
      { snapshot: snapshot.snapshot },
      createInvocation("trace-build"),
    );

    expect(result.sourceCounts).toEqual({
      jsonConversations: 4,
      markdownDocuments: 1,
      totalSources: 5,
    });
    expect(result.familyCount).toBe(2);
    expect(result.normalizedThreadCount).toBe(2);
    expect(result.anomalyCount).toBeGreaterThanOrEqual(3);
    expect(result.manifest.corpus_summary).toMatchObject({
      source_count: 5,
      family_count: 2,
    });
    const alphaFamily = result.familyGraphs.find((family) => family.canonical_title === "Alpha Architecture");
    expect(alphaFamily).toBeTruthy();
    expect(Object.values(alphaFamily!.classification)).toContain("duplicate");
  });

  it("materializes artifact files through the workspace store", async () => {
    const workspaceRef = "workspace://materialize";
    const workspaceStore = createMemoryWorkspaceStore();
    seedFixtureWorkspace(workspaceStore, workspaceRef);
    const client = createClient(createClientOptions(workspaceStore, workspaceRef));

    const result = await client.corpusArtifacts.materialize(
      {},
      createInvocation("trace-materialize"),
    );

    expect(result.familyCount).toBe(2);
    expect(result.outputEntries.map((entry) => entry.fileId)).toContain("manifest");
    const manifestText = workspaceStore.getFileContents(workspaceRef, "work/generated/corpus/corpus-manifest.json");
    expect(manifestText).toBeTruthy();
    expect(JSON.parse(manifestText ?? "{}")).toMatchObject({
      corpus_summary: {
        source_count: 5,
        family_count: 2,
      },
    });
  });

  it("succeeds on an empty workspace and emits warnings", async () => {
    const workspaceStore = createMemoryWorkspaceStore();
    const client = createClient(createClientOptions(workspaceStore, "workspace://empty"));

    const result = await client.corpusArtifacts.materialize(
      {},
      createInvocation("trace-empty"),
    );

    expect(result.sourceCounts).toEqual({
      jsonConversations: 0,
      markdownDocuments: 0,
      totalSources: 0,
    });
    expect(result.warnings).toContain("No conversation exports were found under source-material/conversations/raw-json.");
    expect(result.warnings).toContain("No curated Markdown source docs were found under work/docs/source.");
  });

  it("returns a typed invalid export error for malformed export shape", async () => {
    const workspaceRef = "workspace://invalid-shape";
    const workspaceStore = createMemoryWorkspaceStore();
    workspaceStore.seedSourceMaterials(workspaceRef, {
      conversations: [
        {
          relativePath: "source-material/conversations/raw-json/bad.json",
          contents: JSON.stringify({ metadata: { title: "Broken" }, messages: "nope" }, null, 2),
        },
      ],
      documents: [],
    });
    const client = createClient(createClientOptions(workspaceStore, workspaceRef));

    await expect(
      client.sourceMaterials.readSnapshot(
        {},
        createInvocation("trace-invalid-shape"),
      ),
    ).rejects.toMatchObject({
      defined: true,
      code: "INVALID_CONVERSATION_EXPORT",
      data: {
        path: "source-material/conversations/raw-json/bad.json",
      },
    });
  });

  it("returns a typed invalid json error for unparseable conversation files", async () => {
    const workspaceRef = "workspace://invalid-json";
    const workspaceStore = createMemoryWorkspaceStore();
    workspaceStore.seedSourceMaterials(workspaceRef, {
      conversations: [
        {
          relativePath: "source-material/conversations/raw-json/bad.json",
          contents: "{ this is not json",
        },
      ],
      documents: [],
    });
    const client = createClient(createClientOptions(workspaceStore, workspaceRef));

    await expect(
      client.corpusArtifacts.materialize(
        {},
        createInvocation("trace-invalid-json"),
      ),
    ).rejects.toMatchObject({
      defined: true,
      code: "INVALID_CONVERSATION_JSON",
      data: {
        path: "source-material/conversations/raw-json/bad.json",
      },
    });
  });
});
