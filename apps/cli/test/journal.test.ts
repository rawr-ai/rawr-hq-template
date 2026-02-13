import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const TEST_HOME = mkdtempSync(path.join(tmpdir(), "rawr-test-journal-"));

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      HOME: TEST_HOME,
      XDG_CONFIG_HOME: path.join(TEST_HOME, ".config"),
      XDG_DATA_HOME: path.join(TEST_HOME, ".local", "share"),
      XDG_STATE_HOME: path.join(TEST_HOME, ".local", "state"),
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
  it("journal search + show returns atomic snippets", () => {
    const seed = runRawr(["doctor", "--json"]);
    expect(seed.status).toBe(0);

    const searchProc = runRawr(["journal", "search", "--query", "doctor", "--limit", "5", "--json"]);
    expect(searchProc.status).toBe(0);
    const search = parseJson(searchProc);
    expect(search.ok).toBe(true);
    expect(search.data).toBeTruthy();
    expect(Array.isArray(search.data.snippets)).toBe(true);
    expect(search.data.snippets.length).toBeGreaterThan(0);

    const id = search.data.snippets[0].id as string;
    expect(typeof id).toBe("string");

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
