import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  expireUndoCapsuleOnUnrelatedCommand,
  PLUGINS_SYNC_UNDO_PROVIDER,
  type UndoCapsule,
} from "@rawr/agent-config-sync/undo";
import { createClient } from "../src/client";
import { createClientOptions, createNodeTestResources } from "./helpers";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-undo-"));
  tempDirs.push(workspaceRoot);
  return workspaceRoot;
}

function capsuleDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".rawr", "state", "undo", "last");
}

function manifestPath(workspaceRoot: string): string {
  return path.join(capsuleDir(workspaceRoot), "manifest.json");
}

async function writeCapsule(workspaceRoot: string, capsule: UndoCapsule): Promise<void> {
  await fs.mkdir(capsuleDir(workspaceRoot), { recursive: true });
  await fs.writeFile(manifestPath(workspaceRoot), `${JSON.stringify(capsule, null, 2)}\n`, "utf8");
}

async function makeReplayWorkspace(input: { provider?: string } = {}) {
  const workspaceRoot = await makeWorkspace();
  const target = path.join(workspaceRoot, "provider-home", "prompts", "hello.md");
  const created = path.join(workspaceRoot, "provider-home", "prompts", "new.md");
  const backupRel = path.join("backups", "0001-prev");
  const backup = path.join(capsuleDir(workspaceRoot), backupRel);

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.mkdir(path.dirname(backup), { recursive: true });
  await fs.writeFile(target, "# new\n", "utf8");
  await fs.writeFile(created, "# created\n", "utf8");
  await fs.writeFile(backup, "# old\n", "utf8");

  const capsule: UndoCapsule = {
    version: 1,
    capsuleId: "test-capsule",
    provider: (input.provider ?? PLUGINS_SYNC_UNDO_PROVIDER) as UndoCapsule["provider"],
    createdAt: "2026-05-08T00:00:00.000Z",
    createdBy: {
      commandId: "plugins sync",
      argv: ["plugins", "sync"],
    },
    workspaceRoot,
    status: "ready",
    operations: [
      {
        seq: 1,
        type: "restore-path",
        target,
        pathKind: "file",
        backupRel,
      },
      {
        seq: 2,
        type: "create-path",
        target: created,
      },
    ],
  };
  await writeCapsule(workspaceRoot, capsule);

  return { workspaceRoot, target, created };
}

function makeClient(workspaceRoot: string) {
  return createClient(createClientOptions({
    repoRoot: workspaceRoot,
    resources: createNodeTestResources(),
  }));
}

describe("agent-config-sync undo behavior", () => {
  it("plans runUndo in dry-run mode while preserving files and the active capsule", async () => {
    const { workspaceRoot, target, created } = await makeReplayWorkspace();
    const client = makeClient(workspaceRoot);

    const result = await client.undo.runUndo(
      { dryRun: true },
      { context: { invocation: { traceId: "test-undo-dry-run" } } },
    );

    expect(result).toMatchObject({
      ok: true,
      dryRun: true,
      capsuleId: "test-capsule",
      summary: {
        planned: 2,
        restored: 0,
        deleted: 0,
        skippedMissing: 0,
        failed: 0,
      },
    });
    if (result.ok) {
      expect(result.operations.map((operation) => operation.seq)).toEqual([2, 1]);
      expect(result.operations.every((operation) => operation.status === "planned")).toBe(true);
    }
    await expect(fs.readFile(target, "utf8")).resolves.toBe("# new\n");
    await expect(fs.readFile(created, "utf8")).resolves.toBe("# created\n");
    await expect(fs.stat(manifestPath(workspaceRoot))).resolves.toBeDefined();
  });

  it("applies runUndo in non-dry-run mode and clears the active capsule", async () => {
    const { workspaceRoot, target, created } = await makeReplayWorkspace();
    const client = makeClient(workspaceRoot);

    const result = await client.undo.runUndo(
      { dryRun: false },
      { context: { invocation: { traceId: "test-undo-apply" } } },
    );

    expect(result).toMatchObject({
      ok: true,
      dryRun: false,
      summary: {
        planned: 0,
        restored: 1,
        deleted: 1,
        skippedMissing: 0,
        failed: 0,
      },
    });
    await expect(fs.readFile(target, "utf8")).resolves.toBe("# old\n");
    await expect(fs.stat(created)).rejects.toThrow();
    await expect(fs.stat(manifestPath(workspaceRoot))).rejects.toThrow();
  });

  it("reports no active capsule without touching the workspace", async () => {
    const workspaceRoot = await makeWorkspace();
    const client = makeClient(workspaceRoot);

    await expect(client.undo.runUndo(
      { dryRun: false },
      { context: { invocation: { traceId: "test-undo-no-capsule" } } },
    )).resolves.toMatchObject({
      ok: false,
      code: "UNDO_NOT_AVAILABLE",
      message: "No undo capsule is available",
    });
  });

  it("rejects unsupported capsule providers and preserves the capsule", async () => {
    const { workspaceRoot } = await makeReplayWorkspace({ provider: "other.provider" });
    const client = makeClient(workspaceRoot);

    await expect(client.undo.runUndo(
      { dryRun: false },
      { context: { invocation: { traceId: "test-undo-unsupported-provider" } } },
    )).resolves.toMatchObject({
      ok: false,
      code: "UNDO_PROVIDER_UNSUPPORTED",
      details: { provider: "other.provider" },
    });
    await expect(fs.stat(manifestPath(workspaceRoot))).resolves.toBeDefined();
  });

  it("reports failed undo operations and preserves the capsule for follow-up", async () => {
    const { workspaceRoot } = await makeReplayWorkspace();
    await fs.rm(path.join(capsuleDir(workspaceRoot), "backups"), { recursive: true, force: true });
    const client = makeClient(workspaceRoot);

    const result = await client.undo.runUndo(
      { dryRun: false },
      { context: { invocation: { traceId: "test-undo-failed-operation" } } },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "UNDO_FAILED",
      details: {
        failed: 1,
      },
    });
    await expect(fs.stat(manifestPath(workspaceRoot))).resolves.toBeDefined();
  });

  it("keeps plugin-sync undo capsules for related commands", async () => {
    const { workspaceRoot } = await makeReplayWorkspace();

    const result = await expireUndoCapsuleOnUnrelatedCommand({
      cwd: workspaceRoot,
      argv: ["plugins", "sync", "--dry-run"],
      workspaceRoot,
      resources: createNodeTestResources(),
    });

    expect(result).toEqual({ workspaceRoot, cleared: false, reason: "related-command" });
    await expect(fs.stat(manifestPath(workspaceRoot))).resolves.toBeDefined();
  });

  it("keeps non-plugin capsules for undo commands so runUndo can report provider errors", async () => {
    const { workspaceRoot } = await makeReplayWorkspace({ provider: "other.provider" });

    const result = await expireUndoCapsuleOnUnrelatedCommand({
      cwd: workspaceRoot,
      argv: ["undo"],
      workspaceRoot,
      resources: createNodeTestResources(),
    });

    expect(result).toEqual({ workspaceRoot, cleared: false, reason: "related-command" });
    await expect(fs.stat(manifestPath(workspaceRoot))).resolves.toBeDefined();
  });

  it("keeps plugin-sync undo capsules for legacy sync aliases", async () => {
    const { workspaceRoot } = await makeReplayWorkspace();

    const result = await expireUndoCapsuleOnUnrelatedCommand({
      cwd: workspaceRoot,
      argv: ["sync"],
      workspaceRoot,
      resources: createNodeTestResources(),
    });

    expect(result).toEqual({ workspaceRoot, cleared: false, reason: "related-command" });
    await expect(fs.stat(manifestPath(workspaceRoot))).resolves.toBeDefined();
  });

  it("expires plugin-sync undo capsules for unrelated commands", async () => {
    const { workspaceRoot } = await makeReplayWorkspace();

    const result = await expireUndoCapsuleOnUnrelatedCommand({
      cwd: workspaceRoot,
      argv: ["plugins", "list"],
      workspaceRoot,
      resources: createNodeTestResources(),
    });

    expect(result).toEqual({ workspaceRoot, cleared: true, reason: "unrelated-command" });
    await expect(fs.stat(manifestPath(workspaceRoot))).rejects.toThrow();
  });

  it("skips command expiration without a workspace root", async () => {
    const workspaceRoot = await makeWorkspace();

    await expect(expireUndoCapsuleOnUnrelatedCommand({
      cwd: workspaceRoot,
      argv: ["plugins", "list"],
      workspaceRoot: null,
      resources: createNodeTestResources(),
    })).resolves.toEqual({ cleared: false, reason: "workspace-root-missing" });
  });

  it("reports no capsule during command expiration", async () => {
    const workspaceRoot = await makeWorkspace();

    await expect(expireUndoCapsuleOnUnrelatedCommand({
      cwd: workspaceRoot,
      argv: ["plugins", "list"],
      workspaceRoot,
      resources: createNodeTestResources(),
    })).resolves.toEqual({ workspaceRoot, cleared: false, reason: "no-capsule" });
  });
});
