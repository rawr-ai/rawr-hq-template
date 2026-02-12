import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  beginPluginsSyncUndoCapture,
  expireUndoCapsuleOnUnrelatedCommand,
  loadActiveUndoCapsule,
  runUndoForWorkspace,
} from "../src/lib/sync-undo";

const tempDirs: string[] = [];

async function makeWorkspaceRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-undo-workspace-"));
  tempDirs.push(root);

  await fs.mkdir(path.join(root, "plugins"), { recursive: true });
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "rawr-test-workspace", private: true }, null, 2), "utf8");

  return root;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("sync undo", () => {
  it("captures create/update/delete and restores prior state", async () => {
    const workspaceRoot = await makeWorkspaceRoot();
    const stateDir = path.join(workspaceRoot, "state");
    await fs.mkdir(stateDir, { recursive: true });

    const updatedTarget = path.join(stateDir, "updated.txt");
    const createdTarget = path.join(stateDir, "created.txt");
    const deletedTarget = path.join(stateDir, "deleted.txt");

    await fs.writeFile(updatedTarget, "before-update", "utf8");
    await fs.writeFile(deletedTarget, "before-delete", "utf8");

    const capture = await beginPluginsSyncUndoCapture({
      workspaceRoot,
      commandId: "plugins sync all",
      argv: ["plugins", "sync", "all"],
    });

    await capture.captureWriteTarget(updatedTarget);
    await fs.writeFile(updatedTarget, "after-update", "utf8");

    await capture.captureWriteTarget(createdTarget);
    await fs.writeFile(createdTarget, "created", "utf8");

    await capture.captureDeleteTarget(deletedTarget);
    await fs.rm(deletedTarget, { force: true });

    const capsule = await capture.finalize({ status: "ready" });
    expect(capsule).toBeTruthy();

    const preview = await runUndoForWorkspace({ workspaceRoot, dryRun: true });
    expect(preview.ok).toBe(true);
    expect(await loadActiveUndoCapsule(workspaceRoot)).toBeTruthy();

    const undo = await runUndoForWorkspace({ workspaceRoot, dryRun: false });
    expect(undo.ok).toBe(true);

    await expect(fs.readFile(updatedTarget, "utf8")).resolves.toBe("before-update");
    await expect(fs.stat(createdTarget)).rejects.toThrow();
    await expect(fs.readFile(deletedTarget, "utf8")).resolves.toBe("before-delete");
    await expect(loadActiveUndoCapsule(workspaceRoot)).resolves.toBeNull();
  });

  it("expires on unrelated commands and preserves on related commands", async () => {
    const workspaceRoot = await makeWorkspaceRoot();
    const target = path.join(workspaceRoot, "state", "created.txt");
    await fs.mkdir(path.dirname(target), { recursive: true });

    const captureA = await beginPluginsSyncUndoCapture({
      workspaceRoot,
      commandId: "plugins sync",
      argv: ["plugins", "sync", "demo"],
    });
    await captureA.captureWriteTarget(target);
    await fs.writeFile(target, "created", "utf8");
    await captureA.finalize({ status: "ready" });

    const expired = await expireUndoCapsuleOnUnrelatedCommand({
      cwd: workspaceRoot,
      argv: ["doctor"],
    });
    expect(expired.cleared).toBe(true);
    await expect(loadActiveUndoCapsule(workspaceRoot)).resolves.toBeNull();

    const captureB = await beginPluginsSyncUndoCapture({
      workspaceRoot,
      commandId: "plugins sync",
      argv: ["plugins", "sync", "demo"],
    });
    await captureB.captureWriteTarget(target);
    await captureB.finalize({ status: "ready" });

    const preserved = await expireUndoCapsuleOnUnrelatedCommand({
      cwd: workspaceRoot,
      argv: ["plugins", "sync", "all"],
    });
    expect(preserved.cleared).toBe(false);
    await expect(loadActiveUndoCapsule(workspaceRoot)).resolves.toBeTruthy();
  });
});
