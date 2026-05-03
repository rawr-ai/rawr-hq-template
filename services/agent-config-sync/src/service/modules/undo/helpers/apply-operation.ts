import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { UndoApplyItem, UndoOperation } from "../entities";
import { undoCapsuleDir } from "./capsule-paths";
import { removePathIfPresent, restoreSnapshot } from "./path-snapshots";

export async function applyUndoOperation(input: {
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
