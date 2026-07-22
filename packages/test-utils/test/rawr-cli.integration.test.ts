import { lstatSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { runCommand } from "../src";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const temporaryRoot = realpathSync(os.tmpdir());
const stateRootPrefix = "rawr-integration-";
const isolatedStateRoot = realpathSync(mkdtempSync(path.join(temporaryRoot, stateRootPrefix)));
const environment: NodeJS.ProcessEnv = {
  HOME: isolatedStateRoot,
  LANG: process.env.LANG,
  NO_COLOR: "1",
  PATH: process.env.PATH,
  XDG_CACHE_HOME: path.join(isolatedStateRoot, "xdg-cache"),
  XDG_CONFIG_HOME: path.join(isolatedStateRoot, "xdg-config"),
  XDG_DATA_HOME: path.join(isolatedStateRoot, "xdg-data"),
};

afterAll(() => {
  const canonicalRoot = realpathSync(isolatedStateRoot);
  const status = lstatSync(canonicalRoot);
  if (
    !status.isDirectory() ||
    status.isSymbolicLink() ||
    canonicalRoot !== isolatedStateRoot ||
    path.dirname(canonicalRoot) !== temporaryRoot ||
    !path.basename(canonicalRoot).startsWith(stateRootPrefix)
  ) {
    throw new Error(`refusing to remove invalid Oclif integration root: ${isolatedStateRoot}`);
  }
  rmSync(canonicalRoot, { recursive: true, force: true });
});

describe("rawr CLI (integration)", () => {
  it("runs the workspace Oclif application directly", async () => {
    const proc = await runCommand("bun", ["run", "rawr", "--", "--help"], {
      cwd: repoRoot,
      env: environment,
    });

    expect(proc.exitCode).toBe(0);
    expect(proc.stdout).toContain("USAGE");
    expect(proc.stdout).toContain("$ rawr [COMMAND]");
    expect(proc.stderr).not.toContain("CONTROLLER_RELEASE_REQUIRED");
  });

  it("delegates unknown-command failure to Oclif", async () => {
    const proc = await runCommand("bun", ["run", "rawr", "--", "not-a-command"], {
      cwd: repoRoot,
      env: environment,
    });

    expect(proc.exitCode).toBe(2);
    expect(`${proc.stdout}\n${proc.stderr}`).toContain("command not-a-command not found");
  });
});
