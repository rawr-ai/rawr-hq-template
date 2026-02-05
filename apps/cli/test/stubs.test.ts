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

describe("rawr command stubs", () => {
  it("tools export supports --json", () => {
    const proc = runRawr(["tools", "export", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.tools.map((t: any) => t.command)).toContain("doctor");
  });

  it("plugins list finds workspace plugins", () => {
    const proc = runRawr(["plugins", "list", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.plugins.map((p: any) => p.id)).toContain("@rawr/plugin-hello");
  });

  it("plugins enable is gated by @rawr/security (not yet implemented)", () => {
    const proc = runRawr(["plugins", "enable", "hello"]);
    expect(proc.status).toBe(2);
    expect(proc.stdout).toContain("@rawr/security is missing export");
  });

  it("security check is a thin wrapper (not yet implemented)", () => {
    const proc = runRawr(["security", "check"]);
    expect(proc.status).toBe(2);
    expect(proc.stdout).toContain("@rawr/security is missing export");
  });

  it("security report is a thin wrapper (not yet implemented)", () => {
    const proc = runRawr(["security", "report"]);
    expect(proc.status).toBe(2);
    expect(proc.stdout).toContain("@rawr/security is missing export");
  });
});
