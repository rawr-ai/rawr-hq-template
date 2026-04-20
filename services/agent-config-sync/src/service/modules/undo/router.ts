import { module } from "./module";
import { PLUGINS_SYNC_UNDO_PROVIDER, type UndoApplyItem } from "./entities";
import { applyUndoOperation } from "./helpers/apply-operation";
import { clearActiveUndoCapsule, loadActiveUndoCapsule } from "./helpers/capsule-store";

const runUndo = module.runUndo.handler(async ({ context, input }) => {
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

export const router = module.router({
  runUndo,
});
