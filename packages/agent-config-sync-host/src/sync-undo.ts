import fs from "node:fs/promises";
import path from "node:path";

import { copyDirTree, ensureDir, pathExists, readJsonFile, writeJsonFile } from "./fs-utils";
import { findWorkspaceRoot } from "./workspace";

export const PLUGINS_SYNC_UNDO_PROVIDER = "plugins.sync" as const;

export type UndoProvider = typeof PLUGINS_SYNC_UNDO_PROVIDER;
export type UndoPathKind = "file" | "dir";
export type UndoCapsuleStatus = "ready" | "ready-partial";

export type UndoOperation =
  | {
      seq: number;
      type: "create-path";
      target: string;
    }
  | {
      seq: number;
      type: "restore-path";
      target: string;
      pathKind: UndoPathKind;
      backupRel: string;
    };

export type UndoCapsule = {
  version: 1;
  capsuleId: string;
  provider: UndoProvider;
  createdAt: string;
  createdBy: {
    commandId: string;
    argv: string[];
  };
  workspaceRoot: string;
  status: UndoCapsuleStatus;
  operations: UndoOperation[];
};

export type UndoApplyStatus = "planned" | "restored" | "deleted" | "skipped-missing" | "failed";

export type UndoApplyItem = {
  seq: number;
  type: UndoOperation["type"];
  target: string;
  status: UndoApplyStatus;
  message?: string;
};

export type UndoRunResult =
  | {
      ok: true;
      capsuleId: string;
      provider: UndoProvider;
      dryRun: boolean;
      status: UndoCapsuleStatus;
      operations: UndoApplyItem[];
      summary: {
        planned: number;
        restored: number;
        deleted: number;
        skippedMissing: number;
        failed: number;
      };
    }
  | {
      ok: false;
      code: "UNDO_NOT_AVAILABLE" | "UNDO_PROVIDER_UNSUPPORTED" | "UNDO_FAILED";
      message: string;
      details?: unknown;
    };

function undoCapsuleDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".rawr", "state", "undo", "last");
}

function undoBackupsDir(workspaceRoot: string): string {
  return path.join(undoCapsuleDir(workspaceRoot), "backups");
}

function undoManifestPath(workspaceRoot: string): string {
  return path.join(undoCapsuleDir(workspaceRoot), "manifest.json");
}

async function statPathKind(target: string): Promise<UndoPathKind | null> {
  try {
    const stat = await fs.stat(target);
    return stat.isDirectory() ? "dir" : "file";
  } catch {
    return null;
  }
}

async function removePathIfPresent(target: string): Promise<boolean> {
  const kind = await statPathKind(target);
  if (!kind) return false;
  if (kind === "dir") await fs.rm(target, { recursive: true, force: true });
  else await fs.rm(target, { force: true });
  return true;
}

async function copyPathSnapshot(input: {
  sourceAbs: string;
  backupAbs: string;
  pathKind: UndoPathKind;
}): Promise<void> {
  if (input.pathKind === "file") {
    await ensureDir(path.dirname(input.backupAbs));
    await fs.copyFile(input.sourceAbs, input.backupAbs);
    return;
  }

  await ensureDir(input.backupAbs);
  await copyDirTree(input.sourceAbs, input.backupAbs);
}

async function restoreSnapshot(input: {
  backupAbs: string;
  targetAbs: string;
  pathKind: UndoPathKind;
}): Promise<void> {
  if (input.pathKind === "file") {
    await ensureDir(path.dirname(input.targetAbs));
    await fs.copyFile(input.backupAbs, input.targetAbs);
    return;
  }

  await ensureDir(input.targetAbs);
  await copyDirTree(input.backupAbs, input.targetAbs);
}

export async function loadActiveUndoCapsule(workspaceRoot: string): Promise<UndoCapsule | null> {
  const parsed = await readJsonFile<UndoCapsule>(undoManifestPath(workspaceRoot));
  if (!parsed) return null;
  if (parsed.version !== 1) return null;
  if (!Array.isArray(parsed.operations)) return null;
  return parsed;
}

export async function clearActiveUndoCapsule(workspaceRoot: string): Promise<void> {
  await fs.rm(undoCapsuleDir(workspaceRoot), { recursive: true, force: true });
}

export class PluginsSyncUndoCapture {
  private readonly workspaceRoot: string;

  private readonly commandId: string;

  private readonly argv: string[];

  private readonly startedAt: string;

  private readonly operations: UndoOperation[] = [];

  private readonly handledTargets = new Set<string>();

  private readonly snapshotByTarget = new Map<string, { backupRel: string; pathKind: UndoPathKind }>();

  private opSeq = 0;

  private backupSeq = 0;

  constructor(input: { workspaceRoot: string; commandId: string; argv: string[] }) {
    this.workspaceRoot = path.resolve(input.workspaceRoot);
    this.commandId = input.commandId;
    this.argv = [...input.argv];
    this.startedAt = new Date().toISOString();
  }

  private nextOperationSeq(): number {
    this.opSeq += 1;
    return this.opSeq;
  }

  private async ensureSnapshot(targetAbs: string, pathKind: UndoPathKind): Promise<{ backupRel: string; pathKind: UndoPathKind }> {
    const cached = this.snapshotByTarget.get(targetAbs);
    if (cached) return cached;

    this.backupSeq += 1;
    const backupRel = path.join("backups", `${String(this.backupSeq).padStart(4, "0")}-prev`);
    const backupAbs = path.join(undoCapsuleDir(this.workspaceRoot), backupRel);

    await copyPathSnapshot({
      sourceAbs: targetAbs,
      backupAbs,
      pathKind,
    });

    const snapshot = { backupRel, pathKind };
    this.snapshotByTarget.set(targetAbs, snapshot);
    return snapshot;
  }

  async prepare(): Promise<void> {
    await clearActiveUndoCapsule(this.workspaceRoot);
    await ensureDir(undoBackupsDir(this.workspaceRoot));
  }

  hasOperations(): boolean {
    return this.operations.length > 0;
  }

  async captureWriteTarget(target: string): Promise<void> {
    const targetAbs = path.resolve(target);
    if (this.handledTargets.has(targetAbs)) return;

    const existingKind = await statPathKind(targetAbs);
    if (!existingKind) {
      this.operations.push({
        seq: this.nextOperationSeq(),
        type: "create-path",
        target: targetAbs,
      });
      this.handledTargets.add(targetAbs);
      return;
    }

    const snapshot = await this.ensureSnapshot(targetAbs, existingKind);
    this.operations.push({
      seq: this.nextOperationSeq(),
      type: "restore-path",
      target: targetAbs,
      pathKind: snapshot.pathKind,
      backupRel: snapshot.backupRel,
    });
    this.handledTargets.add(targetAbs);
  }

  async captureDeleteTarget(target: string): Promise<void> {
    const targetAbs = path.resolve(target);
    if (this.handledTargets.has(targetAbs)) return;

    const existingKind = await statPathKind(targetAbs);
    if (!existingKind) return;

    const snapshot = await this.ensureSnapshot(targetAbs, existingKind);
    this.operations.push({
      seq: this.nextOperationSeq(),
      type: "restore-path",
      target: targetAbs,
      pathKind: snapshot.pathKind,
      backupRel: snapshot.backupRel,
    });
    this.handledTargets.add(targetAbs);
  }

  async finalize(input: { status: UndoCapsuleStatus }): Promise<UndoCapsule | null> {
    if (!this.hasOperations()) {
      await clearActiveUndoCapsule(this.workspaceRoot);
      return null;
    }

    const now = new Date().toISOString();
    const capsule: UndoCapsule = {
      version: 1,
      capsuleId: `${now.replaceAll(":", "-")}-${this.commandId.replace(/\s+/g, "-")}`,
      provider: PLUGINS_SYNC_UNDO_PROVIDER,
      createdAt: this.startedAt,
      createdBy: {
        commandId: this.commandId,
        argv: this.argv,
      },
      workspaceRoot: this.workspaceRoot,
      status: input.status,
      operations: this.operations,
    };

    await writeJsonFile(undoManifestPath(this.workspaceRoot), capsule);
    return capsule;
  }
}

export async function beginPluginsSyncUndoCapture(input: {
  workspaceRoot: string;
  commandId: string;
  argv: string[];
}): Promise<PluginsSyncUndoCapture> {
  const capture = new PluginsSyncUndoCapture(input);
  await capture.prepare();
  return capture;
}

export async function runUndoForWorkspace(input: {
  workspaceRoot: string;
  dryRun: boolean;
}): Promise<UndoRunResult> {
  const workspaceRoot = path.resolve(input.workspaceRoot);
  const capsule = await loadActiveUndoCapsule(workspaceRoot);

  if (!capsule) {
    return {
      ok: false,
      code: "UNDO_NOT_AVAILABLE",
      message: "No undo capsule is available",
    };
  }

  if (capsule.provider !== PLUGINS_SYNC_UNDO_PROVIDER) {
    return {
      ok: false,
      code: "UNDO_PROVIDER_UNSUPPORTED",
      message: `Unsupported undo provider: ${capsule.provider}`,
      details: { provider: capsule.provider },
    };
  }

  const operations: UndoApplyItem[] = [];
  let planned = 0;
  let restored = 0;
  let deleted = 0;
  let skippedMissing = 0;
  let failed = 0;

  const reversed = [...capsule.operations].sort((a, b) => b.seq - a.seq);
  for (const op of reversed) {
    if (op.type === "create-path") {
      const exists = await pathExists(op.target);
      if (!exists) {
        skippedMissing += 1;
        operations.push({
          seq: op.seq,
          type: op.type,
          target: op.target,
          status: "skipped-missing",
          message: "target already absent",
        });
        continue;
      }

      if (input.dryRun) {
        planned += 1;
        operations.push({ seq: op.seq, type: op.type, target: op.target, status: "planned", message: "would delete created path" });
        continue;
      }

      try {
        await removePathIfPresent(op.target);
        deleted += 1;
        operations.push({ seq: op.seq, type: op.type, target: op.target, status: "deleted", message: "removed created path" });
      } catch (err) {
        failed += 1;
        operations.push({
          seq: op.seq,
          type: op.type,
          target: op.target,
          status: "failed",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      continue;
    }

    const backupAbs = path.join(undoCapsuleDir(workspaceRoot), op.backupRel);
    if (!(await pathExists(backupAbs))) {
      failed += 1;
      operations.push({
        seq: op.seq,
        type: op.type,
        target: op.target,
        status: "failed",
        message: `missing backup: ${backupAbs}`,
      });
      continue;
    }

    if (input.dryRun) {
      planned += 1;
      operations.push({ seq: op.seq, type: op.type, target: op.target, status: "planned", message: "would restore snapshot" });
      continue;
    }

    try {
      await removePathIfPresent(op.target);
      await restoreSnapshot({ backupAbs, targetAbs: op.target, pathKind: op.pathKind });
      restored += 1;
      operations.push({
        seq: op.seq,
        type: op.type,
        target: op.target,
        status: "restored",
      });
    } catch (err) {
      failed += 1;
      operations.push({
        seq: op.seq,
        type: op.type,
        target: op.target,
        status: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const ok = failed === 0;
  if (ok && !input.dryRun) {
    await clearActiveUndoCapsule(workspaceRoot);
  }

  if (!ok) {
    return {
      ok: false,
      code: "UNDO_FAILED",
      message: "Undo completed with failures",
      details: {
        capsuleId: capsule.capsuleId,
        provider: capsule.provider,
        failed,
        operations,
      },
    };
  }

  return {
    ok: true,
    capsuleId: capsule.capsuleId,
    provider: capsule.provider,
    dryRun: input.dryRun,
    status: capsule.status,
    operations,
    summary: {
      planned,
      restored,
      deleted,
      skippedMissing,
      failed,
    },
  };
}

function nonFlagTokens(argv: string[]): string[] {
  return argv.filter((arg) => typeof arg === "string" && arg.length > 0 && !arg.startsWith("-"));
}

function isPluginsSyncRelatedArgv(argv: string[]): boolean {
  const parts = nonFlagTokens(argv);
  if (parts.length === 0) return false;

  if (parts[0] === "undo") return true;
  if (parts[0] === "plugins" && parts[1] === "sync") return true;
  if (parts[0] === "sync") return true;

  return false;
}

export async function expireUndoCapsuleOnUnrelatedCommand(input: {
  cwd: string;
  argv: string[];
}): Promise<{ workspaceRoot?: string; cleared: boolean; reason?: string }> {
  const workspaceRoot = await findWorkspaceRoot(input.cwd);
  if (!workspaceRoot) return { cleared: false, reason: "workspace-root-missing" };

  const capsule = await loadActiveUndoCapsule(workspaceRoot);
  if (!capsule) return { workspaceRoot, cleared: false, reason: "no-capsule" };

  if (capsule.provider === PLUGINS_SYNC_UNDO_PROVIDER && isPluginsSyncRelatedArgv(input.argv)) {
    return { workspaceRoot, cleared: false, reason: "related-command" };
  }

  await clearActiveUndoCapsule(workspaceRoot);
  return { workspaceRoot, cleared: true, reason: "unrelated-command" };
}
