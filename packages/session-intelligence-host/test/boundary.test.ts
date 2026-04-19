import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNodeSessionIntelligenceBoundary } from "../src";

type EnvSnapshot = Record<string, string | undefined>;

const envKeys = [
  "HOME",
  "CODEX_HOME",
  "RAWR_SESSION_INDEX_PATH",
  "RAWR_CODEX_DISCOVERY_MAX_AGE_MS",
  "RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS",
  "RAWR_CODEX_DISCOVERY_ARCHIVED_MAX_AGE_MS",
] as const;

let envSnapshot: EnvSnapshot;

beforeEach(() => {
  envSnapshot = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of envKeys) {
    const value = envSnapshot[key];
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
});

async function withTempHome(testName: string): Promise<{ tmpHome: string; indexPath: string }> {
  const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), `rawr-session-intelligence-${testName}-`));
  process.env.HOME = tmpHome;
  delete process.env.CODEX_HOME;
  const indexPath = path.join(tmpHome, ".cache", "sessions-index.sqlite");
  process.env.RAWR_SESSION_INDEX_PATH = indexPath;
  return { tmpHome, indexPath };
}

async function writeCodexSession(input: {
  tmpHome: string;
  name: string;
  id: string;
  modified: string;
  message?: string;
}): Promise<string> {
  const sessionsDir = path.join(input.tmpHome, ".codex", "sessions", "2026", "02", "05");
  await fs.mkdir(sessionsDir, { recursive: true });
  const filePath = path.join(sessionsDir, input.name);
  const message = input.message ?? `message ${input.id}`;
  const rows = [
    {
      type: "session_meta",
      timestamp: input.modified,
      payload: {
        id: input.id,
        cwd: "/tmp/rawr-session-intelligence",
        timestamp: input.modified,
        git: { branch: "codex/session-intelligence-host" },
        model: "gpt-5.2",
        model_provider: "openai",
        info: { model_context_window: 128000 },
      },
    },
    {
      type: "event_msg",
      timestamp: input.modified,
      payload: {
        type: "user_message",
        message,
      },
    },
  ];
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  const date = new Date(input.modified);
  await fs.utimes(filePath, date, date);
  return filePath;
}

describe("@rawr/session-intelligence-host", () => {
  it("returns newest codex sessions first when bounded", async () => {
    const { tmpHome } = await withTempHome("newest");
    try {
      process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = "600000";
      await writeCodexSession({ tmpHome, name: "rollout-old.jsonl", id: "old", modified: "2026-02-01T00:00:00.000Z" });
      await writeCodexSession({ tmpHome, name: "rollout-mid.jsonl", id: "mid", modified: "2026-02-02T00:00:00.000Z" });
      await writeCodexSession({ tmpHome, name: "rollout-new.jsonl", id: "new", modified: "2026-02-03T00:00:00.000Z" });

      const boundary = createNodeSessionIntelligenceBoundary();
      const sessions = await boundary.deps.sessionSourceRuntime.listSessions({ source: "codex", limit: 2, filters: {} });

      expect(sessions).toHaveLength(2);
      expect(path.basename(sessions[0]!.path)).toBe("rollout-new.jsonl");
      expect(path.basename(sessions[1]!.path)).toBe("rollout-mid.jsonl");
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("uses the discovery cache for repeated bounded codex listings", async () => {
    const { tmpHome } = await withTempHome("cache-hit");
    try {
      process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = "600000";
      const sessionFile = await writeCodexSession({
        tmpHome,
        name: "rollout-cache-test.jsonl",
        id: "cache-test",
        modified: "2026-02-05T00:00:00.000Z",
      });
      const boundary = createNodeSessionIntelligenceBoundary();

      const first = await boundary.deps.sessionSourceRuntime.listCodexSessionFiles({ limit: 1 });
      expect(first).toHaveLength(1);
      expect(first[0]?.filePath).toBe(sessionFile);

      const readdirSpy = vi.spyOn(fs, "readdir").mockImplementation(async () => {
        throw new Error("unexpected filesystem readdir during cached listing");
      });
      const second = await boundary.deps.sessionSourceRuntime.listCodexSessionFiles({ limit: 1 });

      expect(second).toHaveLength(1);
      expect(second[0]?.filePath).toBe(sessionFile);
      expect(readdirSpy).not.toHaveBeenCalled();
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("invalidates the discovery cache when the scan age expires", async () => {
    const { tmpHome } = await withTempHome("cache-refresh");
    try {
      process.env.RAWR_CODEX_DISCOVERY_LIVE_MAX_AGE_MS = "0";
      const oldFile = await writeCodexSession({
        tmpHome,
        name: "rollout-old.jsonl",
        id: "old",
        modified: "2026-02-01T00:00:00.000Z",
      });
      const boundary = createNodeSessionIntelligenceBoundary();

      const first = await boundary.deps.sessionSourceRuntime.listCodexSessionFiles({ limit: 1 });
      expect(first).toHaveLength(1);
      expect(first[0]?.filePath).toBe(oldFile);

      const newFile = await writeCodexSession({
        tmpHome,
        name: "rollout-new.jsonl",
        id: "new",
        modified: "2026-02-03T00:00:00.000Z",
      });
      const second = await boundary.deps.sessionSourceRuntime.listCodexSessionFiles({ limit: 1 });

      expect(second).toHaveLength(1);
      expect(second[0]?.filePath).toBe(newFile);
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("reindexes sessions into the transcript cache file", async () => {
    const { tmpHome, indexPath } = await withTempHome("reindex");
    try {
      const sessionFile = await writeCodexSession({
        tmpHome,
        name: "rollout-reindex.jsonl",
        id: "reindex",
        modified: "2026-02-05T00:00:00.000Z",
        message: "findable transcript needle",
      });
      const boundary = createNodeSessionIntelligenceBoundary();

      const result = await boundary.deps.sessionIndexRuntime.reindexSessions({
        sessions: [{ path: sessionFile, source: "codex" }],
        roles: ["all"],
        includeTools: false,
        indexPath,
      });
      const stat = await fs.stat(indexPath);
      const text = await boundary.deps.sessionIndexRuntime.getSearchTextCached({
        filePath: sessionFile,
        source: "codex",
        roles: ["all"],
        includeTools: false,
        indexPath,
      });

      expect(result).toEqual({ indexed: 1, total: 1 });
      expect(stat.size).toBeGreaterThan(0);
      expect(text).toContain("findable transcript needle");
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });

  it("clears the transcript index file", async () => {
    const { tmpHome, indexPath } = await withTempHome("clear-index");
    try {
      const sessionFile = await writeCodexSession({
        tmpHome,
        name: "rollout-clear.jsonl",
        id: "clear",
        modified: "2026-02-05T00:00:00.000Z",
      });
      const boundary = createNodeSessionIntelligenceBoundary();
      await boundary.deps.sessionIndexRuntime.reindexSessions({
        sessions: [{ path: sessionFile, source: "codex" }],
        roles: ["all"],
        includeTools: false,
        indexPath,
      });

      await boundary.deps.sessionIndexRuntime.clearIndexFile(indexPath);

      await expect(fs.stat(indexPath)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await fs.rm(tmpHome, { recursive: true, force: true });
    }
  });
});
