/**
 * agent-config-sync: undo module.
 *
 * This router replays the last captured undo capsule produced by sync execution.
 * It exists so CLI/web can offer a safe "undo last sync" without embedding any
 * filesystem logic or capsule format semantics in projections.
 *
 * The capability is intentionally narrow:
 * - It only supports the plugin-sync provider capsule format.
 * - It uses injected path/FS ports so the module remains host-agnostic.
 */
import { module } from "../module";
import { PLUGINS_SYNC_UNDO_PROVIDER, type UndoApplyItem, type UndoOperation } from "../entities";
import type { AgentConfigSyncResources } from "../../../common/resources";
import { clearActiveUndoCapsule, loadActiveUndoCapsule, undoCapsuleDir } from "../repositories/capsule-store-repository";
import { removePathIfPresent, restoreSnapshot } from "../repositories/path-snapshot-repository";


async function applyUndoOperation(input: {
  workspaceRoot: string;
  operation: UndoOperation;
  dryRun: boolean;
  resources: AgentConfigSyncResources;
}): Promise<UndoApplyItem> {
  const op = input.operation;

  if (op.type === "create-path") {
    const exists = await input.resources.files.pathExists(op.target);
    if (!exists) {
      return {
        seq: op.seq,
        type: op.type,
        target: op.target,
        status: "skipped-missing",
        message: "target already absent",
      };
    }

    if (input.dryRun) {
      return { seq: op.seq, type: op.type, target: op.target, status: "planned", message: "would delete created path" };
    }

    try {
      await removePathIfPresent(input.resources, op.target);
      return { seq: op.seq, type: op.type, target: op.target, status: "deleted", message: "removed created path" };
    } catch (err) {
      return {
        seq: op.seq,
        type: op.type,
        target: op.target,
        status: "failed",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const backupAbs = input.resources.path.join(undoCapsuleDir(input.workspaceRoot, input.resources.path), op.backupRel);
  if (!(await input.resources.files.pathExists(backupAbs))) {
    return {
      seq: op.seq,
      type: op.type,
      target: op.target,
      status: "failed",
      message: `missing backup: ${backupAbs}`,
    };
  }

  if (input.dryRun) {
    return { seq: op.seq, type: op.type, target: op.target, status: "planned", message: "would restore snapshot" };
  }

  try {
    await removePathIfPresent(input.resources, op.target);
    await restoreSnapshot({ resources: input.resources, backupAbs, targetAbs: op.target, pathKind: op.pathKind });
    return {
      seq: op.seq,
      type: op.type,
      target: op.target,
      status: "restored",
    };
  } catch (err) {
    return {
      seq: op.seq,
      type: op.type,
      target: op.target,
      status: "failed",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export const runUndo = module.runUndo.handler(async ({ context, input }) => {
  const workspaceRoot = context.resources.path.resolve(context.repoRoot);
  const capsule = await loadActiveUndoCapsule(workspaceRoot, context.resources);

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
  const summary = {
    planned: 0,
    restored: 0,
    deleted: 0,
    skippedMissing: 0,
    failed: 0,
  };

  const reversed = [...capsule.operations].sort((a, b) => b.seq - a.seq);
  for (const operation of reversed) {
    const item = await applyUndoOperation({
      workspaceRoot,
      operation,
      dryRun: input.dryRun,
      resources: context.resources,
    });
    operations.push(item);

    if (item.status === "planned") summary.planned += 1;
    if (item.status === "restored") summary.restored += 1;
    if (item.status === "deleted") summary.deleted += 1;
    if (item.status === "skipped-missing") summary.skippedMissing += 1;
    if (item.status === "failed") summary.failed += 1;
  }

  const ok = summary.failed === 0;
  if (ok && !input.dryRun) {
    await clearActiveUndoCapsule(workspaceRoot, context.resources);
  }

  if (!ok) {
    return {
      ok: false,
      code: "UNDO_FAILED",
      message: "Undo completed with failures",
      details: {
        capsuleId: capsule.capsuleId,
        provider: capsule.provider,
        failed: summary.failed,
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
    summary,
  };
});
