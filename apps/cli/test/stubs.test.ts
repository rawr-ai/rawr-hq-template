import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const TEST_HOME = mkdtempSync(path.join(os.tmpdir(), "rawr-test-stubs-"));

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

function expectExit(proc: ReturnType<typeof runRawr>, allowed: number[]) {
  expect(proc.status).not.toBeNull();
  expect(allowed).toContain(proc.status as number);
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

describe("rawr command surfaces", () => {
  it("tools export supports --json", { timeout: 30000 }, () => {
    const proc = runRawr(["tools", "export", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.tools.map((t: any) => t.command)).toContain("doctor");
  });

  it("plugins web list finds workspace plugins", { timeout: 30000 }, () => {
    const proc = runRawr(["plugins", "web", "list", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(Array.isArray(parsed.data.plugins)).toBe(true);
    expect(parsed.data.plugins.length).toBeGreaterThan(0);
    expect(parsed.data.plugins.every((plugin: any) => plugin.kind === "web")).toBe(true);
    expect(parsed.data.plugins.every((plugin: any) => typeof plugin.capability === "string" && plugin.capability.length > 0)).toBe(
      true,
    );
    expect(parsed.data.plugins.map((plugin: any) => plugin.id)).not.toContain("@rawr/plugin-hello");
    expect(parsed.data.excludedCount).toBeGreaterThanOrEqual(1);
  });

  it("plugins web enable enforces rawr.kind and enables web plugins", { timeout: 45000 }, () => {
    const blocked = runRawr(["plugins", "web", "enable", "hello", "--json", "--risk", "off"]);
    expectExit(blocked, [1, 2]);
    const blockedParsed = parseJson(blocked);
    expect(blockedParsed.ok).toBe(false);
    expect(blockedParsed.error.code).toBe("PLUGIN_KIND_MISMATCH");
    expect(blockedParsed.error.details.kind).toBe("toolkit");

    const proc = runRawr(["plugins", "web", "enable", "mfe-demo", "--json", "--risk", "off"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.pluginId).toBe("@rawr/plugin-mfe-demo");
    expect(parsed.data.evaluation.allowed).toBe(true);
    expect(parsed.data.state).toBeTruthy();
    expect(parsed.data.state.plugins.enabled).toContain("@rawr/plugin-mfe-demo");
  });

  it("plugins web status reflects persisted enable/disable state", { timeout: 45000 }, () => {
    runRawr(["plugins", "web", "enable", "mfe-demo", "--json", "--risk", "off"]);
    const enabledProc = runRawr(["plugins", "web", "status", "--json"]);
    expect(enabledProc.status).toBe(0);
    const enabled = parseJson(enabledProc);
    expect(enabled.ok).toBe(true);
    const plugin = enabled.data.plugins.find((p: any) => p.id === "@rawr/plugin-mfe-demo");
    expect(plugin).toBeTruthy();
    expect(plugin.enabled).toBe(true);

    const disableProc = runRawr(["plugins", "web", "disable", "mfe-demo", "--json"]);
    expect(disableProc.status).toBe(0);

    const disabledProc = runRawr(["plugins", "web", "status", "--json"]);
    expect(disabledProc.status).toBe(0);
    const disabled = parseJson(disabledProc);
    const plugin2 = disabled.data.plugins.find((p: any) => p.id === "@rawr/plugin-mfe-demo");
    expect(plugin2).toBeTruthy();
    expect(plugin2.enabled).toBe(false);
  });

  it("security check returns a machine-readable report", { timeout: 30000 }, () => {
    const proc = runRawr(["security", "check", "--json"]);
    expectExit(proc, [0, 1]);

    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);

    const report = parsed.data.report;
    expect(report).toBeTruthy();
    expect(typeof report.ok).toBe("boolean");
    expect(Array.isArray(report.findings)).toBe(true);
    expect(typeof report.summary).toBe("string");
    expect(typeof report.timestamp).toBe("string");

    if (proc.status === 1) expect(report.ok).toBe(false);
    if (proc.status === 0) expect(report.ok).not.toBe(false);
  });

  it("security report reads the last report from disk", { timeout: 30000 }, () => {
    runRawr(["security", "check", "--json"]);
    const proc = runRawr(["security", "report", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeTruthy();
    expect(parsed.data.report).toBeTruthy();
    expect(typeof parsed.data.report.timestamp).toBe("string");
  });
});
