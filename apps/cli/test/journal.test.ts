import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import type { HqOpsJournalSnippet } from "../src/lib/hq-ops-client";

const TEST_ROOT_PREFIX = "rawr-test-journal-";
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMAND_TEST_CLI = path.join(PROJECT_ROOT, "test", "command-fixture", "command-test-cli.ts");
const JOURNAL_SEED = path.join(PROJECT_ROOT, "test", "command-fixture", "seed-journal.ts");
const TEST_ROOT = realpathSync(mkdtempSync(path.join(realpathSync(tmpdir()), TEST_ROOT_PREFIX)));
const TEST_HOME = path.join(TEST_ROOT, "home");
const TEST_WORKSPACE = path.join(TEST_ROOT, "workspace");
mkdirSync(TEST_HOME, { recursive: true });
mkdirSync(path.join(TEST_WORKSPACE, "plugins"), { recursive: true });
writeFileSync(path.join(TEST_WORKSPACE, "package.json"), JSON.stringify({ private: true }));

function removeTestRoot(): void {
  const canonicalTemporaryRoot = realpathSync(tmpdir());
  const canonicalTestRoot = realpathSync(TEST_ROOT);
  const status = lstatSync(TEST_ROOT);
  if (
    !status.isDirectory() ||
    status.isSymbolicLink() ||
    canonicalTestRoot !== TEST_ROOT ||
    path.dirname(canonicalTestRoot) !== canonicalTemporaryRoot ||
    !path.basename(canonicalTestRoot).startsWith(TEST_ROOT_PREFIX)
  ) {
    throw new Error(`refusing to remove invalid journal test root: ${TEST_ROOT}`);
  }
  rmSync(canonicalTestRoot, { recursive: true, force: true });
}

afterAll(removeTestRoot);

function runRawr(args: string[]) {
  return spawnSync("bun", [COMMAND_TEST_CLI, ...args], {
    cwd: TEST_WORKSPACE,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      HOME: TEST_HOME,
      XDG_CONFIG_HOME: path.join(TEST_HOME, ".config"),
      XDG_DATA_HOME: path.join(TEST_HOME, ".local", "share"),
      XDG_STATE_HOME: path.join(TEST_HOME, ".local", "state"),
      RAWR_WORKSPACE_ROOT: TEST_WORKSPACE,
      RAWR_HQ_ROOT: TEST_WORKSPACE,
    },
  });
}

function seedJournal(snippet: HqOpsJournalSnippet) {
  return spawnSync("bun", [JOURNAL_SEED, TEST_WORKSPACE, JSON.stringify(snippet)], {
    cwd: TEST_WORKSPACE,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: TEST_HOME,
      XDG_CONFIG_HOME: path.join(TEST_HOME, ".config"),
      XDG_DATA_HOME: path.join(TEST_HOME, ".local", "share"),
      XDG_STATE_HOME: path.join(TEST_HOME, ".local", "state"),
      RAWR_WORKSPACE_ROOT: TEST_WORKSPACE,
      RAWR_HQ_ROOT: TEST_WORKSPACE,
    },
  });
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

function runRawrWithRetry(args: string[], attempts = 2) {
  let proc = runRawr(args);
  for (let i = 1; proc.status !== 0 && i < attempts; i += 1) {
    proc = runRawr(args);
  }
  return proc;
}

describe("journal + reflect", () => {
  it("journal search + tail + show returns explicitly owned snippets", { timeout: 30000 }, () => {
    const snippet: HqOpsJournalSnippet = {
      id: "journal-command-fixture-doctor",
      ts: new Date().toISOString(),
      kind: "command",
      title: "$ rawr doctor",
      preview: "explicit journal command fixture",
      body: "cmd: rawr doctor",
      tags: ["command", "doctor"],
    };
    const seed = seedJournal(snippet);
    expect(seed.status, seed.stderr).toBe(0);

    const searchProc = runRawr([
      "journal",
      "search",
      "--query",
      "doctor",
      "--limit",
      "5",
      "--json",
    ]);
    expect(searchProc.status).toBe(0);
    const search = parseJson(searchProc);
    expect(search.ok).toBe(true);
    expect(search.data).toBeTruthy();
    expect(Array.isArray(search.data.snippets)).toBe(true);
    expect(search.data.snippets).toContainEqual(expect.objectContaining({ id: snippet.id }));

    const id = snippet.id;
    expect(typeof id).toBe("string");

    const tailProc = runRawr(["journal", "tail", "--limit", "15", "--json"]);
    expect(tailProc.status).toBe(0);
    const tail = parseJson(tailProc);
    expect(tail.ok).toBe(true);
    expect(Array.isArray(tail.data.snippets)).toBe(true);
    expect(tail.data.snippets.length).toBeGreaterThan(0);
    expect(
      tail.data.snippets.every(
        (snippet: any) => typeof snippet.id === "string" && typeof snippet.title === "string"
      )
    ).toBe(true);

    const showProc = runRawr(["journal", "show", id, "--json"]);
    expect(showProc.status).toBe(0);
    const show = parseJson(showProc);
    expect(show.ok).toBe(true);
    expect(show.data.snippet.id).toBe(id);
    expect(typeof show.data.snippet.body).toBe("string");
  });

  it("reflect returns a stable structure", () => {
    const proc = runRawrWithRetry(["reflect", "--limit", "15", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeTruthy();
    expect(typeof parsed.data.considered).toBe("number");
    expect(Array.isArray(parsed.data.suggestions)).toBe(true);
  });
});
