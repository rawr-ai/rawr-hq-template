import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import {
  chunkMessages,
  detectSessionFormat,
  extractSession,
  listCodexSessionFiles,
  listSessions,
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

  it("returns newest codex sessions when limit is set", async () => {
    const previousHome = process.env.HOME;
    const previousCodexHome = process.env.CODEX_HOME;
    const previousIndexPath = process.env.RAWR_SESSION_INDEX_PATH;
    const previousDiscoveryLiveMaxAge = process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS;
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-session-tools-home-"));
    try {
      process.env.HOME = tmpHome;
      delete process.env.CODEX_HOME;
      process.env.RAWR_SESSION_INDEX_PATH = path.join(tmpHome, ".cache", "sessions-index.sqlite");
      process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = "600000";

      const sessionsDir = path.join(tmpHome, ".codex", "sessions", "2026", "02", "05");
      await fs.mkdir(sessionsDir, { recursive: true });

      const oldFile = path.join(sessionsDir, "rollout-old.jsonl");
      const midFile = path.join(sessionsDir, "rollout-mid.jsonl");
      const newFile = path.join(sessionsDir, "rollout-new.jsonl");
      const payload = (id: string) =>
        `{"type":"session_meta","timestamp":"2026-02-05T00:00:00.000Z","payload":{"id":"${id}","cwd":"/tmp/rawr-fixture-codex","timestamp":"2026-02-05T00:00:00.000Z","git":{"branch":"codex/rawr-s5-session-tools"},"model":"gpt-5.2","model_provider":"openai","info":{"model_context_window":128000}}}\n`;

      await fs.writeFile(oldFile, payload("old"), "utf8");
      await fs.writeFile(midFile, payload("mid"), "utf8");
      await fs.writeFile(newFile, payload("new"), "utf8");

      await fs.utimes(oldFile, new Date("2026-02-01T00:00:00.000Z"), new Date("2026-02-01T00:00:00.000Z"));
      await fs.utimes(midFile, new Date("2026-02-02T00:00:00.000Z"), new Date("2026-02-02T00:00:00.000Z"));
      await fs.utimes(newFile, new Date("2026-02-03T00:00:00.000Z"), new Date("2026-02-03T00:00:00.000Z"));

      const sessions = await listSessions({
        source: "codex",
        limit: 2,
        filters: {},
      });

      expect(sessions).toHaveLength(2);
      expect(path.basename(sessions[0]!.path)).toBe("rollout-new.jsonl");
      expect(path.basename(sessions[1]!.path)).toBe("rollout-mid.jsonl");
    } finally {
      if (previousHome == null) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousCodexHome == null) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      if (previousIndexPath == null) delete process.env.RAWR_SESSION_INDEX_PATH;
      else process.env.RAWR_SESSION_INDEX_PATH = previousIndexPath;
      if (previousDiscoveryLiveMaxAge == null) delete process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS;
      else process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = previousDiscoveryLiveMaxAge;
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("uses cached codex discovery index for repeated bounded listings", async () => {
    const previousHome = process.env.HOME;
    const previousCodexHome = process.env.CODEX_HOME;
    const previousIndexPath = process.env.RAWR_SESSION_INDEX_PATH;
    const previousDiscoveryLiveMaxAge = process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS;
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-session-tools-cache-home-"));

    try {
      process.env.HOME = tmpHome;
      delete process.env.CODEX_HOME;
      process.env.RAWR_SESSION_INDEX_PATH = path.join(tmpHome, ".cache", "sessions-index.sqlite");
      process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = "600000";

      const sessionsDir = path.join(tmpHome, ".codex", "sessions", "2026", "02", "05");
      await fs.mkdir(sessionsDir, { recursive: true });
      const sessionFile = path.join(sessionsDir, "rollout-cache-test.jsonl");
      await fs.writeFile(sessionFile, `{"type":"session_meta","payload":{"id":"cache-test"}}\n`, "utf8");
      await fs.utimes(sessionFile, new Date("2026-02-05T00:00:00.000Z"), new Date("2026-02-05T00:00:00.000Z"));

      const first = await listCodexSessionFiles(1);
      expect(first).toHaveLength(1);
      expect(first[0]?.filePath).toBe(sessionFile);

      const readdirSpy = vi.spyOn(fs, "readdir").mockImplementation(async () => {
        throw new Error("unexpected filesystem readdir during cached listing");
      });
      try {
        const second = await listCodexSessionFiles(1);
        expect(second).toHaveLength(1);
        expect(second[0]?.filePath).toBe(sessionFile);
      } finally {
        readdirSpy.mockRestore();
      }
    } finally {
      if (previousHome == null) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousCodexHome == null) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      if (previousIndexPath == null) delete process.env.RAWR_SESSION_INDEX_PATH;
      else process.env.RAWR_SESSION_INDEX_PATH = previousIndexPath;
      if (previousDiscoveryLiveMaxAge == null) delete process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS;
      else process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = previousDiscoveryLiveMaxAge;
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("invalidates codex discovery cache when the root scan age expires", async () => {
    const previousHome = process.env.HOME;
    const previousCodexHome = process.env.CODEX_HOME;
    const previousIndexPath = process.env.RAWR_SESSION_INDEX_PATH;
    const previousDiscoveryLiveMaxAge = process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS;
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-session-tools-refresh-home-"));

    try {
      process.env.HOME = tmpHome;
      delete process.env.CODEX_HOME;
      process.env.RAWR_SESSION_INDEX_PATH = path.join(tmpHome, ".cache", "sessions-index.sqlite");
      process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = "0";

      const sessionsDir = path.join(tmpHome, ".codex", "sessions", "2026", "02", "05");
      await fs.mkdir(sessionsDir, { recursive: true });

      const oldFile = path.join(sessionsDir, "rollout-old.jsonl");
      await fs.writeFile(oldFile, `{"type":"session_meta","payload":{"id":"old"}}\n`, "utf8");
      await fs.utimes(oldFile, new Date("2026-02-01T00:00:00.000Z"), new Date("2026-02-01T00:00:00.000Z"));

      const first = await listCodexSessionFiles(1);
      expect(first).toHaveLength(1);
      expect(first[0]?.filePath).toBe(oldFile);

      const newFile = path.join(sessionsDir, "rollout-new.jsonl");
      await fs.writeFile(newFile, `{"type":"session_meta","payload":{"id":"new"}}\n`, "utf8");
      await fs.utimes(newFile, new Date("2026-02-03T00:00:00.000Z"), new Date("2026-02-03T00:00:00.000Z"));

      const second = await listCodexSessionFiles(1);
      expect(second).toHaveLength(1);
      expect(second[0]?.filePath).toBe(newFile);
    } finally {
      if (previousHome == null) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousCodexHome == null) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      if (previousIndexPath == null) delete process.env.RAWR_SESSION_INDEX_PATH;
      else process.env.RAWR_SESSION_INDEX_PATH = previousIndexPath;
      if (previousDiscoveryLiveMaxAge == null) delete process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS;
      else process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = previousDiscoveryLiveMaxAge;
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });
});
