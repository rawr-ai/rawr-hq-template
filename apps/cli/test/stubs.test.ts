import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env },
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
  it("tools export supports --json", () => {
    const proc = runRawr(["tools", "export", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.tools.map((t: any) => t.command)).toContain("doctor");
  });

  it("hq plugins list finds workspace plugins", () => {
    const proc = runRawr(["hq", "plugins", "list", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.plugins.map((p: any) => p.id)).toContain("@rawr/plugin-hello");
  });

  it("hq plugins enable is gated by @rawr/security", () => {
    const proc = runRawr(["hq", "plugins", "enable", "hello", "--json", "--risk", "off"]);
    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.pluginId).toBe("@rawr/plugin-hello");
    expect(parsed.data.evaluation.allowed).toBe(true);
    expect(parsed.data.state).toBeTruthy();
    expect(parsed.data.state.plugins.enabled).toContain("@rawr/plugin-hello");
  });

  it("hq plugins status reflects persisted enable/disable state", () => {
    runRawr(["hq", "plugins", "enable", "hello", "--json", "--risk", "off"]);
    const enabledProc = runRawr(["hq", "plugins", "status", "--json"]);
    expect(enabledProc.status).toBe(0);
    const enabled = parseJson(enabledProc);
    expect(enabled.ok).toBe(true);
    const hello = enabled.data.plugins.find((p: any) => p.id === "@rawr/plugin-hello");
    expect(hello).toBeTruthy();
    expect(hello.enabled).toBe(true);

    const disableProc = runRawr(["hq", "plugins", "disable", "hello", "--json"]);
    expect(disableProc.status).toBe(0);

    const disabledProc = runRawr(["hq", "plugins", "status", "--json"]);
    expect(disabledProc.status).toBe(0);
    const disabled = parseJson(disabledProc);
    const hello2 = disabled.data.plugins.find((p: any) => p.id === "@rawr/plugin-hello");
    expect(hello2).toBeTruthy();
    expect(hello2.enabled).toBe(false);
  });

  it("security check returns a machine-readable report", () => {
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

  it("security report reads the last report from disk", () => {
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
