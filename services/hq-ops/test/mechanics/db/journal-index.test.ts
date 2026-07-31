import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../../../src";
import {
  createClientOptions,
  createTestHqOpsResources,
  invocation,
} from "../../support/service/helpers";

const tempDirectories: string[] = [];

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory) await fs.rm(directory, { force: true, recursive: true });
  }
});

describe("Journal index migration", () => {
  it("exports migration 0001 as DDL without connection pragmas", async () => {
    const packageManifest = JSON.parse(
      await fs.readFile(new URL("../../../package.json", import.meta.url), "utf8")
    ) as {
      exports: Record<string, { default?: string }>;
    };
    const migration = await fs.readFile(
      new URL("../../../src/service/db/migrations/0001_journal.sql", import.meta.url),
      "utf8"
    );

    expect(packageManifest.exports["./migrations/0001_journal.sql"]?.default).toBe(
      "./src/service/db/migrations/0001_journal.sql"
    );
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS snippets");
    expect(migration).toContain("CREATE VIRTUAL TABLE IF NOT EXISTS snippets_fts USING fts5");
    expect(migration).not.toContain("PRAGMA");
  });

  it("enables write, replacement, tail, and FTS behavior on a fresh Journal database", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hq-ops-journal-migration-"));
    tempDirectories.push(repoRoot);
    const resources = createTestHqOpsResources();
    const client = createClient(createClientOptions({ repoRoot, resources }));
    const record = {
      id: "fresh-index-snippet",
      ts: "2026-07-30T12:00:00.000Z",
      kind: "note" as const,
      title: "Fresh migration",
      preview: "Migration-ready Journal index",
      body: "The fresh database supports searchable migration behavior.",
      tags: ["migration"],
    };

    await client.journal.writeSnippet(record, invocation("trace-fresh-index-write"));
    await expect(
      client.journal.tailSnippets({ limit: 1 }, invocation("trace-fresh-index-tail"))
    ).resolves.toEqual({
      snippets: [
        {
          id: record.id,
          ts: record.ts,
          kind: record.kind,
          title: record.title,
          preview: record.preview,
          tags: record.tags,
        },
      ],
    });
    const search = await client.journal.searchSnippets(
      { limit: 1, mode: "fts", query: "searchable" },
      invocation("trace-fresh-index-search")
    );
    expect(search.mode).toBe("fts");
    expect(search.snippets.map((candidate) => candidate.id)).toEqual([record.id]);

    const replacement = {
      ...record,
      preview: "Replacement index row",
      body: "The replacement record contains a porcupine marker.",
    };
    await client.journal.writeSnippet(replacement, invocation("trace-fresh-index-replacement"));

    await expect(
      client.journal.searchSnippets(
        { limit: 5, mode: "fts", query: "searchable" },
        invocation("trace-stale-index-search")
      )
    ).resolves.toEqual({ mode: "fts", snippets: [] });
    await expect(
      client.journal.searchSnippets(
        { limit: 5, mode: "fts", query: "porcupine" },
        invocation("trace-replacement-index-search")
      )
    ).resolves.toEqual({
      mode: "fts",
      snippets: [
        {
          id: replacement.id,
          ts: replacement.ts,
          kind: replacement.kind,
          title: replacement.title,
          preview: replacement.preview,
          tags: replacement.tags,
        },
      ],
    });
  });
});
