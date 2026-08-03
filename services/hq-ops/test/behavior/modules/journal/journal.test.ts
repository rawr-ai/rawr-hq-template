import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ORPCError } from "@orpc/server";
import { afterEach, describe, expect, it } from "vitest";
import { createClient } from "../../../../src/client";
import type { HqOpsResources, SqliteDatabase } from "../../../../src/service/model/ports/resources";
import {
  type AnalyticsEntry,
  createClientOptions,
  createTestHqOpsResources,
  invocation,
  type LogEntry,
} from "../../../support/service/helpers";

const tempDirectories: string[] = [];

afterEach(async () => {
  while (tempDirectories.length > 0) {
    const directory = tempDirectories.pop();
    if (directory) await fs.rm(directory, { force: true, recursive: true });
  }
});

async function createTempRoot(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "hq-ops-journal-behavior-"));
  tempDirectories.push(directory);
  return directory;
}

function snippet(id: string) {
  return {
    id,
    ts: "2026-07-30T12:00:00.000Z",
    kind: "note" as const,
    title: "Journal proof",
    preview: "Canonical JSON first",
    body: "Derived index failures do not replace canonical Journal truth.",
    tags: ["journal", "proof"],
  };
}

function failingDatabase(failure: unknown, onClose: () => void): SqliteDatabase {
  return {
    exec() {},
    prepare() {
      throw failure;
    },
    close: onClose,
  };
}

describe("HQ Ops Journal behavior", () => {
  it("emits one root analytics and log failure lifecycle and closes the index once", async () => {
    const analytics: AnalyticsEntry[] = [];
    const logs: LogEntry[] = [];
    const resources = createTestHqOpsResources();
    const failureSentinel = new Error("journal-index-failure-sentinel");
    let openCount = 0;
    let closeCount = 0;
    resources.journalIndexDatabase.open = async () => {
      openCount += 1;
      return failingDatabase(failureSentinel, () => {
        closeCount += 1;
      });
    };
    const client = createClient(createClientOptions({ analytics, logs, resources }));

    let caught: unknown;
    try {
      await client.journal.tailSnippets({ limit: 1 }, invocation("trace-journal-failure"));
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(failureSentinel);
    expect(openCount).toBe(1);
    expect(closeCount).toBe(1);
    const procedureAnalytics = analytics.filter(
      (entry) => entry.event === "orpc.procedure" && entry.payload.path === "journal.tailSnippets"
    );
    const procedureLogs = logs.filter(
      (entry) => entry.event === "hq-ops.procedure" && entry.payload.path === "journal.tailSnippets"
    );
    expect(procedureAnalytics).toHaveLength(1);
    expect(procedureAnalytics[0]?.payload.outcome).toBe("error");
    expect(procedureLogs).toHaveLength(1);
    expect(procedureLogs[0]?.level).toBe("error");
    expect(procedureLogs[0]?.payload.outcome).toBe("error");
  });

  it.each([
    "acquisition",
    "update",
  ] as const)("keeps canonical snippet JSON when index %s fails", async (failure) => {
    const repoRoot = await createTempRoot();
    const resources = createTestHqOpsResources();
    let closeCount = 0;
    resources.journalIndexDatabase.open = async () => {
      if (failure === "acquisition") {
        throw new Error("journal-index-acquisition-failure");
      }
      return failingDatabase(new Error("journal-index-update-failure"), () => {
        closeCount += 1;
      });
    };
    const client = createClient(createClientOptions({ repoRoot, resources }));
    const record = snippet(`snippet-${failure}`);

    const result = await client.journal.writeSnippet(
      record,
      invocation(`trace-journal-${failure}`)
    );
    const persisted = JSON.parse(await fs.readFile(result.path, "utf8"));

    expect(persisted).toEqual(record);
    expect(closeCount).toBe(failure === "update" ? 1 : 0);
  });

  it("closes one successfully acquired index handle exactly once", async () => {
    const repoRoot = await createTempRoot();
    const resources = createTestHqOpsResources();
    const openIndex = resources.journalIndexDatabase.open;
    let closeCount = 0;
    resources.journalIndexDatabase.open = async (dbPath) => {
      const db = await openIndex(dbPath);
      return {
        exec: (sql) => db.exec(sql),
        prepare: (sql) => db.prepare(sql),
        close() {
          closeCount += 1;
          db.close();
        },
      };
    };
    const client = createClient(createClientOptions({ repoRoot, resources }));

    await expect(
      client.journal.tailSnippets({ limit: 1 }, invocation("trace-journal-success"))
    ).resolves.toEqual({ snippets: [] });
    expect(closeCount).toBe(1);
  });

  it("distinguishes malformed JSON from a structurally invalid canonical record", async () => {
    const repoRoot = await createTempRoot();
    const snippetsDirectory = path.join(repoRoot, ".rawr", "journal", "snippets");
    await fs.mkdir(snippetsDirectory, { recursive: true });
    const client = createClient(createClientOptions({ repoRoot }));

    await fs.writeFile(path.join(snippetsDirectory, "malformed.json"), "{", "utf8");
    await expect(
      client.journal.getSnippet({ id: "malformed" }, invocation("trace-journal-malformed"))
    ).resolves.toEqual({ snippet: null });

    await fs.writeFile(
      path.join(snippetsDirectory, "invalid.json"),
      JSON.stringify({ id: "invalid" }),
      "utf8"
    );
    const invalidRead = client.journal.getSnippet(
      { id: "invalid" },
      invocation("trace-journal-invalid")
    );
    await expect(invalidRead).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Output validation failed",
    });
    await expect(invalidRead).rejects.toBeInstanceOf(ORPCError);
  });

  it("returns the exact semantic warning without opening the index or embedding", async () => {
    const resources = createTestHqOpsResources();
    let indexOpenCount = 0;
    let embeddingCallCount = 0;
    resources.journalIndexDatabase.open = async () => {
      indexOpenCount += 1;
      throw new Error("semantic search must not open an index without configuration");
    };
    resources.embeddings.getConfig = () => null;
    resources.embeddings.embedText = async () => {
      embeddingCallCount += 1;
      throw new Error("semantic search must not embed without configuration");
    };
    const client = createClient(createClientOptions({ resources }));

    await expect(
      client.journal.searchSnippets(
        { limit: 5, mode: "semantic", query: "journal" },
        invocation("trace-journal-semantic-unavailable")
      )
    ).resolves.toEqual({
      mode: "semantic",
      warning: "Semantic search not configured (missing embedding provider configuration)",
      snippets: [],
    });
    expect(indexOpenCount).toBe(0);
    expect(embeddingCallCount).toBe(0);
  });
});
