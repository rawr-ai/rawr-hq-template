import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beginPluginsSyncUndoCapture } from "@rawr/agent-config-sync/undo";
import { createNodeAgentConfigSyncResources } from "@rawr/agent-config-sync-node/resources";
import { afterEach, describe, expect, it } from "vitest";

const CLI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMAND_TEST_CLI = path.join(CLI_ROOT, "test", "command-fixture", "command-test-cli.ts");
const tempDirs: string[] = [];

function runRawr(args: string[], options: {
  cwd?: string;
  env?: Record<string, string | undefined>;
} = {}) {
  return spawnSync("bun", [COMMAND_TEST_CLI, ...args], {
    cwd: options.cwd ?? CLI_ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
  });
}

function parseJson(proc: ReturnType<typeof runRawr>) {
  expect(proc.stdout).toBeTruthy();
  return JSON.parse(proc.stdout) as any;
}

async function makeWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-undo-cli-ws-"));
  tempDirs.push(workspaceRoot);
  await fs.mkdir(path.join(workspaceRoot, "plugins"), { recursive: true });
  await fs.writeFile(
    path.join(workspaceRoot, "package.json"),
    `${JSON.stringify({ name: "rawr-undo-cli-test", private: true }, null, 2)}\n`,
    "utf8",
  );
  return await fs.realpath(workspaceRoot);
}

async function seedCapturedCreatePathCapsule(workspaceRoot: string, targetRel = "plugins/generated.txt") {
  const resources = createNodeAgentConfigSyncResources();
  const target = path.join(workspaceRoot, targetRel);
  const capture = await beginPluginsSyncUndoCapture({
    workspaceRoot,
    commandId: "plugins sync",
    argv: ["plugins", "sync", "fixture"],
    resources,
  });

  await capture.captureWriteTarget(target);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, "generated\n", "utf8");
  const capsule = await capture.finalize({ status: "ready" });
  expect(capsule).toBeTruthy();
  return { target, manifest: path.join(workspaceRoot, ".rawr", "state", "undo", "last", "manifest.json") };
}

async function mutateCapsuleProvider(manifest: string, provider: string) {
  const capsule = JSON.parse(await fs.readFile(manifest, "utf8")) as Record<string, unknown>;
  capsule.provider = provider;
  await fs.writeFile(manifest, `${JSON.stringify(capsule, null, 2)}\n`, "utf8");
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("rawr undo", () => {
  it("returns success JSON for dry-run and preserves a public-captured capsule", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();
    const { target, manifest } = await seedCapturedCreatePathCapsule(workspaceRoot);

    const proc = runRawr(["undo", "--json", "--dry-run"], { cwd: workspaceRoot });

    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.workspaceRoot).toBe(workspaceRoot);
    expect(parsed.data.undo).toMatchObject({
      ok: true,
      provider: "plugins.sync",
      dryRun: true,
      summary: {
        planned: 1,
        restored: 0,
        deleted: 0,
        skippedMissing: 0,
        failed: 0,
      },
    });
    await expect(fs.stat(manifest)).resolves.toBeTruthy();
    await expect(fs.readFile(target, "utf8")).resolves.toBe("generated\n");
  });

  it("resolves nested cwd to the same workspace root", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();
    await seedCapturedCreatePathCapsule(workspaceRoot, "plugins/nested-generated.txt");
    const nested = path.join(workspaceRoot, "plugins", "fixture", "src");
    await fs.mkdir(nested, { recursive: true });

    const proc = runRawr(["undo", "--json", "--dry-run"], { cwd: nested });

    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.workspaceRoot).toBe(workspaceRoot);
    expect(parsed.data.undo.ok).toBe(true);
  });

  it("prints human capsule, provider, dry-run, and summary fields", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();
    await seedCapturedCreatePathCapsule(workspaceRoot);

    const proc = runRawr(["undo", "--dry-run"], { cwd: workspaceRoot });

    expect(proc.status).toBe(0);
    expect(proc.stdout).toContain("capsule:");
    expect(proc.stdout).toContain("provider: plugins.sync");
    expect(proc.stdout).toContain("dry-run: true");
    expect(proc.stdout).toContain("summary: planned=1 restored=0 deleted=0 skippedMissing=0 failed=0");
  });

  it("clears the capsule and created path after successful non-dry-run undo", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();
    const { target, manifest } = await seedCapturedCreatePathCapsule(workspaceRoot);

    const proc = runRawr(["undo", "--json"], { cwd: workspaceRoot });

    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.undo.summary.deleted).toBe(1);
    await expect(fs.stat(manifest)).rejects.toThrow();
    await expect(fs.stat(target)).rejects.toThrow();
  });

  it("returns service failure JSON and exits 1 when no capsule exists", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();

    const proc = runRawr(["undo", "--json"], { cwd: workspaceRoot });

    expect(proc.status).toBe(1);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe("UNDO_NOT_AVAILABLE");
    expect(parsed.error.details.workspaceRoot).toBe(workspaceRoot);
  });

  it("prints human service failure output and exits 1 when no capsule exists", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();

    const proc = runRawr(["undo"], { cwd: workspaceRoot });

    expect(proc.status).toBe(1);
    expect(proc.stdout).toContain("error: No undo capsule is available");
    expect(proc.stdout).toContain("code: UNDO_NOT_AVAILABLE");
    expect(proc.stdout).toContain(`details: {"workspaceRoot":"${workspaceRoot}"}`);
  });

  it("prints human service failure details for unsupported providers", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();
    const { manifest } = await seedCapturedCreatePathCapsule(workspaceRoot);
    await mutateCapsuleProvider(manifest, "other.provider");

    const proc = runRawr(["undo"], { cwd: workspaceRoot });

    expect(proc.status).toBe(1);
    expect(proc.stdout).toContain("error: Unsupported undo provider: other.provider");
    expect(proc.stdout).toContain("code: UNDO_PROVIDER_UNSUPPORTED");
    expect(proc.stdout).toContain(`details: {"workspaceRoot":"${workspaceRoot}","service":{"provider":"other.provider"}}`);
  });

  it("returns WORKSPACE_ROOT_MISSING JSON and exits 2 outside a workspace", { timeout: 30000 }, async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-undo-not-ws-"));
    tempDirs.push(cwd);

    const proc = runRawr(["undo", "--json"], {
      cwd,
      env: {
        RAWR_WORKSPACE_ROOT: undefined,
        RAWR_HQ_ROOT: undefined,
      },
    });

    expect(proc.status).toBe(2);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe("WORKSPACE_ROOT_MISSING");
  });

  it("prints human WORKSPACE_ROOT_MISSING output and exits 2 outside a workspace", { timeout: 30000 }, async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-undo-not-ws-"));
    tempDirs.push(cwd);

    const proc = runRawr(["undo"], {
      cwd,
      env: {
        RAWR_WORKSPACE_ROOT: undefined,
        RAWR_HQ_ROOT: undefined,
      },
    });

    expect(proc.status).toBe(2);
    expect(proc.stdout).toContain("error: Could not find a RAWR workspace root");
    expect(proc.stdout).toContain("code: WORKSPACE_ROOT_MISSING");
  });

  it("ignores the removed universal lifecycle-expiration control", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();
    const { manifest } = await seedCapturedCreatePathCapsule(workspaceRoot);

    const proc = runRawr(["doctor", "--json"], {
      cwd: workspaceRoot,
      env: {
        RAWR_TEST_UNDO_LIFECYCLE_THROW: "1",
      },
    });

    expect(proc.status).toBe(0);
    const parsed = parseJson(proc);
    expect(parsed.ok).toBe(true);
    await expect(fs.stat(manifest)).resolves.toBeTruthy();
  });

  it("preserves a public-captured capsule before an unrelated command dispatches", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();
    const { manifest } = await seedCapturedCreatePathCapsule(workspaceRoot);

    const proc = runRawr(["doctor", "--json"], { cwd: workspaceRoot });

    expect(proc.status).toBe(0);
    await expect(fs.stat(manifest)).resolves.toBeTruthy();
  });

  it("preserves a public-captured capsule before plugin sync help dispatches", { timeout: 30000 }, async () => {
    const workspaceRoot = await makeWorkspace();
    const { manifest } = await seedCapturedCreatePathCapsule(workspaceRoot);

    const proc = runRawr(["plugins", "sync", "--help"], { cwd: workspaceRoot });

    expect(proc.status).toBe(0);
    await expect(fs.stat(manifest)).resolves.toBeTruthy();
  });
});
