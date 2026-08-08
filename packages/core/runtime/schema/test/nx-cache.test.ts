import { expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { lstat, mkdtemp, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

type CommandResult = Readonly<{
  exitCode: number;
  stderr: string;
  stdout: string;
}>;

const FIXTURE_PREFIX = "runtime-schema-nx-cache-";
const workspaceRoot = fileURLToPath(new URL("../../../../..", import.meta.url));
const ownerRoot = path.join(workspaceRoot, "packages/core/runtime/schema");
const configPath = path.join(ownerRoot, "tsdown.config.ts");
const outputRoot = path.join(ownerRoot, "dist");
const nx = path.join(workspaceRoot, "node_modules/.bin/nx");
const temporaryParent = await realpath(tmpdir());

test("restores an unchanged build and invalidates on a declared relevant input", async () => {
  const fixtureRoot = await realpath(await mkdtemp(path.join(temporaryParent, FIXTURE_PREFIX)));
  const outputBackup = path.join(fixtureRoot, "original-dist");
  const originalConfig = await readFile(configPath, "utf8");
  const hadOutput = await pathExists(outputRoot);

  try {
    if (hadOutput) await rename(outputRoot, outputBackup);

    const first = await runNxBuild(fixtureRoot);
    expect(first, first.stderr || first.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(first)).toBe(false);
    const firstOutput = await readFile(path.join(outputRoot, "index.js"));

    await rm(outputRoot, { recursive: true, force: false });
    const restored = await runNxBuild(fixtureRoot);
    expect(restored, restored.stderr || restored.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(restored)).toBe(true);
    expect(await readFile(path.join(outputRoot, "index.js"))).toEqual(firstOutput);

    await writeFile(
      configPath,
      `${originalConfig}\n// Relevant-input mutation for the Nx cache acceptance proof.\n`
    );
    await rm(outputRoot, { recursive: true, force: false });
    const invalidated = await runNxBuild(fixtureRoot);
    expect(invalidated, invalidated.stderr || invalidated.stdout).toMatchObject({ exitCode: 0 });
    expect(cacheHit(invalidated)).toBe(false);
  } finally {
    await writeFile(configPath, originalConfig);
    await rm(outputRoot, { recursive: true, force: true });
    if (hadOutput) await rename(outputBackup, outputRoot);
    await rm(fixtureRoot, { recursive: true, force: false });
  }
}, 120_000);

async function runNxBuild(fixtureRoot: string): Promise<CommandResult> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NO_COLOR: "1",
    NX_CACHE_DIRECTORY: path.join(fixtureRoot, "cache"),
    NX_DAEMON: "false",
    NX_ISOLATE_PLUGINS: "false",
    NX_SKIP_REMOTE_CACHE: "true",
    NX_TASKS_RUNNER_DYNAMIC_OUTPUT: "false",
    NX_WORKSPACE_DATA_DIRECTORY: path.join(fixtureRoot, "workspace-data"),
  };
  for (const name of [
    "FORCE_COLOR",
    "NX_DISABLE_NX_CACHE",
    "NX_DRY_RUN",
    "NX_PROJECT_GRAPH_CACHE_DIRECTORY",
    "NX_SKIP_NX_CACHE",
  ]) {
    delete env[name];
  }

  return new Promise((resolve, reject) => {
    const child = spawn(nx, ["run", "runtime-schema:build", "--outputStyle=static"], {
      cwd: workspaceRoot,
      env,
      shell: process.platform === "win32",
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    let settled = false;
    const settle = (finish: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      finish();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      settle(() => reject(new Error("runtime-schema:build exceeded its cache-proof timeout.")));
    }, 30_000);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => stdout.push(chunk));
    child.stderr.on("data", (chunk: string) => stderr.push(chunk));
    child.on("error", (error) => settle(() => reject(error)));
    child.on("close", (code) => {
      settle(() =>
        resolve({ exitCode: code ?? 1, stderr: stderr.join(""), stdout: stdout.join("") })
      );
    });
  });
}

function cacheHit(result: CommandResult): boolean {
  return /(?:existing outputs match the cache|read the output from the cache|\[local cache\])/iu.test(
    `${result.stdout}\n${result.stderr}`
  );
}

async function pathExists(input: string): Promise<boolean> {
  try {
    await lstat(input);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
