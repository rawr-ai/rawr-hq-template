import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];
const DEFAULT_TEST_HOME = mkdtempSync(path.join(os.tmpdir(), "rawr-test-cutover-home-"));
tempDirs.push(DEFAULT_TEST_HOME);

function runRawr(args: string[], envOverrides?: Record<string, string>) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const baseHome = envOverrides?.HOME ?? DEFAULT_TEST_HOME;
  return spawnSync("bun", ["test/command-fixture/command-test-cli.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      HOME: baseHome,
      XDG_CONFIG_HOME: envOverrides?.XDG_CONFIG_HOME ?? path.join(baseHome, ".config"),
      XDG_DATA_HOME: envOverrides?.XDG_DATA_HOME ?? path.join(baseHome, ".local", "share"),
      XDG_STATE_HOME: envOverrides?.XDG_STATE_HOME ?? path.join(baseHome, ".local", "state"),
      ...(envOverrides ?? {}),
    },
  });
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

function makeIsolatedSyncEnv(home: string): Record<string, string> {
  return {
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, ".config"),
    XDG_DATA_HOME: path.join(home, ".local", "share"),
    XDG_STATE_HOME: path.join(home, ".local", "state"),
    CODEX_HOME: path.join(home, ".codex-rawr"),
    CLAUDE_PLUGINS_LOCAL: path.join(home, ".claude", "plugins", "local"),
  };
}

function seedCodexPromptResidue(codexHome: string, plugin: string, prompt: string) {
  mkdirSync(path.join(codexHome, "plugins"), { recursive: true });
  writeFileSync(
    path.join(codexHome, "plugins", "registry.json"),
    JSON.stringify({
      plugins: [{
        name: plugin,
        managed_by: "@rawr/plugin-plugins",
        prompts: [prompt],
      }],
    }, null, 2),
    "utf8",
  );
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("plugin command surface cutover", () => {
  it("keeps external and sync surfaces without runtime web, scaffold, or official relink commands", { timeout: 30000 }, () => {
    const proc = runRawr(["plugins", "--help"]);
    expect(proc.status).toBe(0);

    const out = `${proc.stdout}\n${proc.stderr}`;
    expect(out).not.toContain("plugins web");
    expect(out).not.toContain("plugins scaffold");
    expect(out).toContain("plugins sync");
    expect(out).toContain("plugins install");
    expect(out).toContain("plugins link");
    expect(out).not.toContain("plugins cli");
    expect(out).not.toContain("plugins doctor links");
    expect(out).not.toContain("plugins converge");
  });

  it("exposes native sync and generic export command surfaces", { timeout: 30000 }, () => {
    const sync = runRawr(["plugins", "sync", "--help"]);
    expect(sync.status).toBe(0);

    const syncOut = `${sync.stdout}\n${sync.stderr}`;
    expect(syncOut).toContain("Deploy one RAWR plugin through native provider plugin paths");
    expect(syncOut).toContain("--source-workspace");
    expect(syncOut).toContain("--codex-package");
    expect(syncOut).toContain("--codex-install");
    expect(syncOut).toContain("--codex-bin");
    expect(syncOut).toContain("--cleanup-behind");
    expect(syncOut).toContain("--destination-projection");

    const exportHelp = runRawr(["plugins", "export", "--help"]);
    expect(exportHelp.status).toBe(0);

    const exportOut = `${exportHelp.stdout}\n${exportHelp.stderr}`;
    expect(exportOut).toContain("Project one RAWR plugin to explicit filesystem destinations");
    expect(exportOut).toContain("--source-workspace");
    expect(exportOut).toContain("plugins export all");
  });

  it("removes legacy command surfaces", { timeout: 45000 }, () => {
    const hq = runRawr(["hq", "plugins", "list", "--json"]);
    expect((hq.status ?? 1) !== 0).toBe(true);

    const factory = runRawr(["factory", "plugin", "new", "legacy-check", "--dry-run", "--json"]);
    expect((factory.status ?? 1) !== 0).toBe(true);

    const web = runRawr(["plugins", "web", "list", "--json"]);
    expect((web.status ?? 1) !== 0).toBe(true);

    const sync = runRawr(["sync", "status", "tools", "--json"]);
    expect((sync.status ?? 1) !== 0).toBe(true);
  });

  it("supports plugins sync dry-run variants", { timeout: 45000 }, () => {
    const tempHome = mkdtempSync(path.join(os.tmpdir(), "rawr-plugins-sync-dry-run-"));
    tempDirs.push(tempHome);
    const syncEnv = makeIsolatedSyncEnv(tempHome);
    const codexHome = path.join(tempHome, ".codex-rawr");
    seedCodexPromptResidue(codexHome, "plugins", "legacy-check");

    const single = runRawr(
      [
        "plugins",
        "sync",
        "plugins",
        "--dry-run",
        "--json",
        "--agent",
        "codex",
        "--codex-home",
        codexHome,
        "--no-cowork",
      ],
      syncEnv,
    );
    expect(single.status).toBe(0);
    const singleJson = parseJson(single);
    expect(singleJson.ok).toBe(true);
    expect(singleJson.data.codexPackage?.packages?.[0]?.plugin).toBe("plugins");
    expect(singleJson.data.codexInstall?.actions?.[0]?.plugin).toBe("plugins");
    expect(singleJson.data.cleanupBehind?.actions).toBeTruthy();
    expect(singleJson.data.cleanupBehind?.retainedResidue).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reason: "projection-only-retained",
        target: expect.stringContaining("/prompts/legacy-check.md"),
      }),
    ]));
    expect(singleJson.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Codex guidance favors skills"),
    ]));

    const all = runRawr(
      [
        "plugins",
        "sync",
        "all",
        "--dry-run",
        "--json",
        "--scope",
        "cli",
        "--allow-partial",
        "--agent",
        "codex",
        "--codex-home",
        codexHome,
      ],
      syncEnv,
    );
    expect(all.status).toBe(0);
    const allJson = parseJson(all);
    expect(allJson.ok).toBe(true);
    expect(allJson.data.cleanupBehind?.actions).toBeTruthy();
    expect(allJson.data.cleanupBehind?.retainedResidue).toEqual(expect.arrayContaining([
      expect.objectContaining({
        reason: "projection-only-retained",
        target: expect.stringContaining("/prompts/legacy-check.md"),
      }),
    ]));
    expect(allJson.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Codex guidance favors skills"),
    ]));
    expect(allJson.data.installReconcile).toBeUndefined();

    const claudeHome = path.join(tempHome, ".claude", "plugins", "local");
    const claude = runRawr(
      [
        "plugins",
        "sync",
        "hq",
        "--dry-run",
        "--json",
        "--agent",
        "claude",
        "--claude-home",
        claudeHome,
        "--no-cowork",
      ],
      syncEnv,
    );
    expect(claude.status).toBe(0);
    const claudeJson = parseJson(claude);
    expect(claudeJson.ok).toBe(true);
    expect(claudeJson.data.targets?.[0]?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "workflow",
        target: expect.stringContaining("/commands/"),
      }),
    ]));
    expect(claudeJson.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("Claude Code custom commands have been merged into skills"),
    ]));
  });

  it("supports plugins sync sources add/list/remove", { timeout: 45000 }, () => {
    const tempHome = mkdtempSync(path.join(os.tmpdir(), "rawr-plugins-sources-"));
    tempDirs.push(tempHome);
    const fakeSource = path.join(tempHome, "plugin-source");
    const syncEnv = makeIsolatedSyncEnv(tempHome);

    const add = runRawr(["plugins", "sync", "sources", "add", fakeSource, "--json"], syncEnv);
    expect(add.status).toBe(0);
    const addJson = parseJson(add);
    expect(addJson.ok).toBe(true);

    const list = runRawr(["plugins", "sync", "sources", "list", "--json"], syncEnv);
    expect(list.status).toBe(0);
    const listJson = parseJson(list);
    expect(listJson.ok).toBe(true);
    expect(listJson.data.sources.length).toBe(1);

    const remove = runRawr(["plugins", "sync", "sources", "remove", fakeSource, "--json"], syncEnv);
    expect(remove.status).toBe(0);
    const removeJson = parseJson(remove);
    expect(removeJson.ok).toBe(true);

    const listAfter = runRawr(["plugins", "sync", "sources", "list", "--json"], syncEnv);
    expect(listAfter.status).toBe(0);
    const listAfterJson = parseJson(listAfter);
    expect(listAfterJson.ok).toBe(true);
    expect(listAfterJson.data.sources).toEqual([]);
  });
});
