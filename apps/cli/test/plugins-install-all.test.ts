import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const TEST_HOME = mkdtempSync(path.join(os.tmpdir(), "rawr-test-plugins-install-all-"));
const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runRawr(args: string[], env: Record<string, string | undefined> = {}) {
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: cliRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: TEST_HOME,
      XDG_CONFIG_HOME: path.join(TEST_HOME, ".config"),
      XDG_DATA_HOME: path.join(TEST_HOME, ".local", "share"),
      XDG_STATE_HOME: path.join(TEST_HOME, ".local", "state"),
      ...env,
    },
  });
}

function makeIsolatedEnv(prefix: string) {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  const home = path.join(root, "home");
  const codexHome = path.join(root, "codex");
  mkdirSync(home, { recursive: true });
  mkdirSync(codexHome, { recursive: true });

  return {
    root,
    env: {
      HOME: home,
      XDG_CONFIG_HOME: path.join(root, "xdg-config"),
      XDG_DATA_HOME: path.join(root, "xdg-data"),
      XDG_STATE_HOME: path.join(root, "xdg-state"),
      CODEX_HOME: codexHome,
      CLAUDE_CONFIG_DIR: path.join(root, "claude"),
      RAWR_SESSION_INDEX_PATH: path.join(root, "session-index.sqlite"),
    },
  };
}

function writeCodexFixture(codexHome: string) {
  const sessionDir = path.join(codexHome, "sessions", "2026", "04", "19");
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(
    path.join(sessionDir, "agent-d-direct-command-proof.jsonl"),
    [
      JSON.stringify({
        type: "session_meta",
        timestamp: "2026-04-19T01:02:03.000Z",
        payload: {
          id: "agent-d-direct-command-proof",
          cwd: "/tmp/rawr-agent-d-proof",
          git: { branch: "agent-service-module-ownership-hardening" },
          model: "gpt-5",
          model_provider: "openai",
        },
      }),
      JSON.stringify({
        type: "response_item",
        timestamp: "2026-04-19T01:02:04.000Z",
        payload: {
          type: "message",
          role: "assistant",
          content: "direct rawr sessions proof",
        },
      }),
    ].join("\n") + "\n",
  );
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

describe("plugins cli install all", () => {
  it("supports --json --dry-run with planned links", () => {
    const proc = runRawr(["plugins", "cli", "install", "all", "--json", "--dry-run"]);
    expect(proc.status).toBe(0);

    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeTruthy();
    expect(Array.isArray(parsed.data.planned)).toBe(true);
    expect(Array.isArray(parsed.data.skipped)).toBe(true);

    const ids = (parsed.data.planned as any[]).map((p) => p.pluginId);
    // At least the shipped sample oclif plugins should be detectable.
    expect(ids).toContain("@rawr/plugin-hello");
  });

  it("loads session-tools as a linked oclif plugin and runs rawr sessions directly", () => {
    const { env } = makeIsolatedEnv("rawr-test-sessions-direct-");
    writeCodexFixture(env.CODEX_HOME!);

    const install = runRawr(["plugins", "cli", "install", "all", "--json"], env);
    expect(`${install.stdout}\n${install.stderr}`).not.toContain("PLUGIN_LINK_FAILED");
    expect(install.status).toBe(0);

    const inspect = runRawr(["plugins", "inspect", "@rawr/plugin-session-tools", "--json"], env);
    expect(inspect.status).toBe(0);
    const inspected = JSON.parse(inspect.stdout) as Array<{ commandIDs?: string[] }>;
    expect(inspected[0]?.commandIDs).toContain("sessions:list");

    const sessions = runRawr(["sessions", "list", "--source", "codex", "--limit", "1", "--json"], env);
    expect(`${sessions.stdout}\n${sessions.stderr}`).not.toContain("command sessions:list not found");
    expect(sessions.status).toBe(0);

    const parsed = JSON.parse(sessions.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.sessions).toHaveLength(1);
    expect(parsed.data.sessions[0].sessionId).toBe("agent-d-direct-command-proof");

    const search = runRawr(
      [
        "sessions",
        "search",
        "--source",
        "codex",
        "--query-metadata",
        "agent-d-direct-command-proof",
        "--json",
      ],
      env,
    );
    expect(`${search.stdout}\n${search.stderr}`).not.toContain("command sessions:search not found");
    expect(search.status).toBe(0);

    const searchParsed = JSON.parse(search.stdout) as any;
    expect(searchParsed.ok).toBe(true);
    expect(searchParsed.data.hits).toHaveLength(1);
    expect(searchParsed.data.hits[0].sessionId).toBe("agent-d-direct-command-proof");

    const reindexSearch = runRawr(
      [
        "sessions",
        "search",
        "--source",
        "codex",
        "--query",
        "proof",
        "--reindex",
        "--reindex-limit",
        "1",
        "--index-path",
        path.join(env.HOME!, "session-index.sqlite"),
        "--json",
      ],
      env,
    );
    expect(`${reindexSearch.stdout}\n${reindexSearch.stderr}`).not.toContain("command sessions:search not found");
    expect(reindexSearch.status).toBe(0);

    const reindexParsed = JSON.parse(reindexSearch.stdout) as any;
    expect(reindexParsed.ok).toBe(true);
    expect(reindexParsed.data.hits).toHaveLength(1);
    expect(reindexParsed.data.hits[0].sessionId).toBe("agent-d-direct-command-proof");
  }, 120_000);
});
