import { describe, expect, it } from "vitest";
import path from "node:path";
import {
  chunkMessages,
  detectSessionFormat,
  extractSession,
  resolveSession,
  searchSessionsByContent,
  searchSessionsByMetadata,
  type SessionListItem,
} from "../src";
import { defaultIndexPath } from "../src/search/index";

const fixturesDir = path.join(import.meta.dirname, "fixtures");
const claudeFixture = path.join(fixturesDir, "claude.jsonl");
const codexFixture = path.join(fixturesDir, "codex.jsonl");

describe("@rawr/session-tools", () => {
  it("detects claude vs codex formats", async () => {
    await expect(detectSessionFormat(claudeFixture)).resolves.toBe("claude");
    await expect(detectSessionFormat(codexFixture)).resolves.toBe("codex");
  });

  it("resolves a session by path (claude)", async () => {
    const resolved = await resolveSession(claudeFixture, "all");
    expect("error" in resolved).toBe(false);
    if ("error" in resolved) return;
    expect(resolved.resolved.source).toBe("claude");
    expect(resolved.metadata).toMatchObject({
      cwd: "/tmp/rawr-fixture-claude",
      gitBranch: "main",
      modelProvider: "anthropic",
    });
  });

  it("resolves a session by path (codex)", async () => {
    const resolved = await resolveSession(codexFixture, "all");
    expect("error" in resolved).toBe(false);
    if ("error" in resolved) return;
    expect(resolved.resolved.source).toBe("codex");
    expect(resolved.metadata).toMatchObject({
      cwd: "/tmp/rawr-fixture-codex",
      gitBranch: "codex/feat-sessions-plugin",
      modelProvider: "openai",
    });
  });

  it("extracts transcript messages with slicing + dedupe", async () => {
    const extracted = await extractSession(codexFixture, {
      roles: ["all"],
      includeTools: false,
      dedupe: true,
      offset: 0,
      maxMessages: 0,
    });
    expect("error" in extracted).toBe(false);
    if ("error" in extracted) return;
    expect(extracted.source).toBe("codex");
    expect(extracted.messageCount).toBeGreaterThanOrEqual(2);
    expect(extracted.messages[0]?.role).toBe("user");
  });

  it("chunks messages with overlap", () => {
    const chunks = chunkMessages([1, 2, 3, 4, 5], 3, 1);
    expect(chunks).toEqual([
      [1, 2, 3],
      [3, 4, 5],
      [5],
    ]);
  });

  it("searches sessions by metadata", () => {
    const sessions: SessionListItem[] = [
      {
        path: "/tmp/a.jsonl",
        source: "codex",
        sessionId: "abc",
        title: "Using oclif with Bun",
        cwd: "/tmp/rawr",
        gitBranch: "main",
        model: "gpt-5",
        modelProvider: "openai",
        modified: new Date().toISOString(),
        sizeKb: 1,
      },
      {
        path: "/tmp/b.jsonl",
        source: "claude",
        sessionId: "def",
        title: "Unrelated",
        cwd: "/tmp/other",
        gitBranch: "dev",
        model: "claude",
        modelProvider: "anthropic",
        modified: new Date().toISOString(),
        sizeKb: 1,
      },
    ];
    const hits = searchSessionsByMetadata(sessions, "oclif", 10);
    expect(hits.length).toBe(1);
    expect(hits[0]?.path).toBe("/tmp/a.jsonl");
    expect(hits[0]?.matchScore).toBeGreaterThan(0);
  });

  it("searches sessions by content without index", async () => {
    const sessions: SessionListItem[] = [
      {
        path: codexFixture,
        source: "codex",
        sessionId: "019c21af-23f2-7401-af13-9582c5881d39",
        title: "fixture",
        modified: new Date().toISOString(),
        sizeKb: 1,
      },
    ];
    const hits = await searchSessionsByContent({
      sessions,
      pattern: "oclif",
      ignoreCase: true,
      maxMatches: 10,
      snippetLen: 100,
      roles: ["all"],
      includeTools: false,
      useIndex: false,
      indexPath: defaultIndexPath(),
    });
    expect(hits.length).toBe(1);
    expect(hits[0]?.matchCount).toBeGreaterThan(0);
  });
});

