import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runRawr(args: string[], options?: { cwd?: string; env?: Record<string, string | undefined> }) {
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: options?.cwd ?? cliRoot,
    encoding: "utf8",
    env: { ...process.env, ...(options?.env ?? {}) },
  });
}

describe("hq runtime commands", () => {
  it("plans hq up with the canonical shell and flags", () => {
    const proc = runRawr(["hq", "up", "--json"]);
    expect(proc.status).toBe(0);

    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.cmd).toBe("bash");
    expect(parsed.data.args).toEqual(["./scripts/dev/hq.sh", "up", "--open", "coordination", "--observability", "auto"]);

    const expectedCwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
    expect(parsed.data.cwd).toBe(expectedCwd);
  });

  it("plans hq down and attach with the canonical shell actions", () => {
    const expectedCwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

    const down = runRawr(["hq", "down", "--json"]);
    expect(down.status).toBe(0);
    expect(JSON.parse(down.stdout)).toMatchObject({
      ok: true,
      data: {
        cmd: "bash",
        args: ["./scripts/dev/hq.sh", "down"],
        cwd: expectedCwd,
      },
    });

    const attach = runRawr(["hq", "attach", "--json"]);
    expect(attach.status).toBe(0);
    expect(JSON.parse(attach.stdout)).toMatchObject({
      ok: true,
      data: {
        cmd: "bash",
        args: ["./scripts/dev/hq.sh", "attach"],
        cwd: expectedCwd,
      },
    });
  });

  it("plans hq restart with forwarded open and observability flags", () => {
    const proc = runRawr(["hq", "restart", "--open", "all", "--observability", "off", "--json"]);
    expect(proc.status).toBe(0);

    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.cmd).toBe("bash");
    expect(parsed.data.args).toEqual(["./scripts/dev/hq.sh", "restart", "--open", "all", "--observability", "off"]);
  });

  it("writes stale HQ status once and prunes the dead state file", () => {
    const workspaceRoot = mkdtempSync(path.join(os.tmpdir(), "rawr-hq-status-"));
    mkdirSync(path.join(workspaceRoot, "plugins"), { recursive: true });
    mkdirSync(path.join(workspaceRoot, ".rawr", "hq"), { recursive: true });
    writeFileSync(path.join(workspaceRoot, "package.json"), JSON.stringify({ name: "status-fixture", private: true }, null, 2));
    writeFileSync(
      path.join(workspaceRoot, ".rawr", "hq", "state.env"),
      [
        "hq_manager_pid=999991",
        "hq_server_pid=999992",
        "hq_web_pid=999993",
        "hq_async_pid=999994",
        "hq_started_at=2026-03-19T00:00:00.000Z",
      ].join("\n"),
    );

    const proc = runRawr(["hq", "status", "--json"], {
      env: {
        RAWR_WORKSPACE_ROOT: workspaceRoot,
      },
    });

    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.manager.state).toBe("stale");
    expect(parsed.data.manager.stale).toBe(true);
    expect(parsed.data.summary).toBe("stopped");
    expect(parsed.data.support.observability.state).toBe("managed-stopped");
    expect(parsed.data.observability).toBeUndefined();

    expect(path.join(parsed.data.workspaceRoot, parsed.data.artifacts.statusFile)).toBe(
      path.join(workspaceRoot, ".rawr/hq/status.json"),
    );
    expect(readFileSync(path.join(workspaceRoot, ".rawr", "hq", "status.json"), "utf8")).toContain('"schemaVersion": 1');
    expect(() => readFileSync(path.join(workspaceRoot, ".rawr", "hq", "state.env"), "utf8")).toThrow();
  });

  it("rejects invalid RAWR_HQ_OBSERVABILITY values before writing status", () => {
    const workspaceRoot = mkdtempSync(path.join(os.tmpdir(), "rawr-hq-invalid-mode-"));
    mkdirSync(path.join(workspaceRoot, "plugins"), { recursive: true });
    writeFileSync(path.join(workspaceRoot, "package.json"), JSON.stringify({ name: "status-fixture", private: true }, null, 2));

    const proc = runRawr(["hq", "status", "--json"], {
      env: {
        RAWR_WORKSPACE_ROOT: workspaceRoot,
        RAWR_HQ_OBSERVABILITY: "invalid",
      },
    });

    expect(proc.status).not.toBe(0);
    expect(`${proc.stdout}\n${proc.stderr}`).toContain("invalid RAWR_HQ_OBSERVABILITY 'invalid'");
    expect(`${proc.stdout}\n${proc.stderr}`).not.toContain('"mode": "invalid"');
    expect(() => readFileSync(path.join(workspaceRoot, ".rawr", "hq", "status.json"), "utf8")).toThrow();
  });
});
