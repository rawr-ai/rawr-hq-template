import type { AgentConfigSyncResources } from "../../../shared/resources";
import {
  PLUGINS_SYNC_UNDO_PROVIDER,
  type UndoCapsule,
  type UndoCapsuleStatus,
  type UndoOperation,
  type UndoPathKind,
} from "../entities";
import { undoBackupsDir, undoCapsuleDir, undoManifestPath } from "./capsule-paths";
import { clearActiveUndoCapsule } from "./capsule-store";
import { copyPathSnapshot } from "./path-snapshots";

export class PluginsSyncUndoCapture {
  private readonly workspaceRoot: string;
  private readonly resources: AgentConfigSyncResources;
  private readonly commandId: string;
  private readonly argv: string[];
  private readonly startedAt: string;
  private readonly operations: UndoOperation[] = [];
  private readonly handledTargets = new Set<string>();
  private readonly snapshotByTarget = new Map<string, { backupRel: string; pathKind: UndoPathKind }>();
  private opSeq = 0;
  private backupSeq = 0;

  constructor(input: { workspaceRoot: string; commandId: string; argv: string[]; resources: AgentConfigSyncResources }) {
    this.workspaceRoot = input.resources.path.resolve(input.workspaceRoot);
    this.resources = input.resources;
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
    const backupRel = this.resources.path.join("backups", `${String(this.backupSeq).padStart(4, "0")}-prev`);
    const backupAbs = this.resources.path.join(undoCapsuleDir(this.workspaceRoot, this.resources.path), backupRel);

    await copyPathSnapshot({
      resources: this.resources,
      sourceAbs: targetAbs,
      backupAbs,
      pathKind,
    });

    const snapshot = { backupRel, pathKind };
    this.snapshotByTarget.set(targetAbs, snapshot);
    return snapshot;
  }

  async prepare(): Promise<void> {
    await clearActiveUndoCapsule(this.workspaceRoot, this.resources);
    await this.resources.files.ensureDir(undoBackupsDir(this.workspaceRoot, this.resources.path));
  }

  hasOperations(): boolean {
    return this.operations.length > 0;
  }

  async captureWriteTarget(target: string): Promise<void> {
    const targetAbs = this.resources.path.resolve(target);
    if (this.handledTargets.has(targetAbs)) return;

    const existingKind = await this.resources.files.statPathKind(targetAbs);
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
    const targetAbs = this.resources.path.resolve(target);
    if (this.handledTargets.has(targetAbs)) return;

    const existingKind = await this.resources.files.statPathKind(targetAbs);
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
      await clearActiveUndoCapsule(this.workspaceRoot, this.resources);
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

    await this.resources.files.writeJsonFile(undoManifestPath(this.workspaceRoot, this.resources.path), capsule);
    return capsule;
  }
}

export async function beginPluginsSyncUndoCapture(input: {
  workspaceRoot: string;
  commandId: string;
  argv: string[];
  resources: AgentConfigSyncResources;
}): Promise<PluginsSyncUndoCapture> {
  const capture = new PluginsSyncUndoCapture(input);
  await capture.prepare();
  return capture;
}
