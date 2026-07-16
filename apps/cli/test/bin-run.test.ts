import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runNode(args: string[], opts?: { cwd?: string }) {
  return spawnSync("node", ["bin/run.js", ...args], {
    cwd: opts?.cwd ?? cliRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("bin/run.js", () => {
  it("refuses source-local execution without a materialized controller", () => {
    const proc = runNode(["--version"]);
    expect(proc.status).toBe(78);
    expect(proc.stderr).toContain("CONTROLLER_RELEASE_REQUIRED");
  });

  it("does not fall back to an ambient bun executable", () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rawr-source-launcher-"));
    const sentinel = path.join(temp, "ambient-bun-executed");
    const fakeBun = path.join(temp, "bun");
    fs.writeFileSync(fakeBun, `#!/bin/sh\ntouch ${JSON.stringify(sentinel)}\n`, { mode: 0o755 });

    try {
      const proc = spawnSync("node", ["bin/run.js", "doctor"], {
        cwd: cliRoot,
        encoding: "utf8",
        env: { ...process.env, PATH: `${temp}${path.delimiter}${process.env.PATH ?? ""}` },
      });

      expect(proc.status).toBe(78);
      expect(proc.stderr).toContain("CONTROLLER_RELEASE_REQUIRED");
      expect(fs.existsSync(sentinel)).toBe(false);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
