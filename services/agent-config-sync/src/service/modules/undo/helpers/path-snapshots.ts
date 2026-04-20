import path from "node:path";

import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { UndoPathKind } from "../entities";

export async function removePathIfPresent(
  resources: AgentConfigSyncResources,
  target: string,
): Promise<boolean> {
  const kind = await resources.files.statPathKind(target);
  if (!kind) return false;
  await resources.files.removePath(target, { recursive: kind === "dir" });
  return true;
}

export async function copyPathSnapshot(input: {
  resources: AgentConfigSyncResources;
  sourceAbs: string;
  backupAbs: string;
  pathKind: UndoPathKind;
}): Promise<void> {
  if (input.pathKind === "file") {
    await input.resources.files.ensureDir(path.dirname(input.backupAbs));
    await input.resources.files.copyFile(input.sourceAbs, input.backupAbs);
    return;
  }

  await input.resources.files.ensureDir(input.backupAbs);
  await input.resources.files.copyDirTree(input.sourceAbs, input.backupAbs);
}

export async function restoreSnapshot(input: {
  resources: AgentConfigSyncResources;
  backupAbs: string;
  targetAbs: string;
  pathKind: UndoPathKind;
}): Promise<void> {
  if (input.pathKind === "file") {
    await input.resources.files.ensureDir(path.dirname(input.targetAbs));
    await input.resources.files.copyFile(input.backupAbs, input.targetAbs);
    return;
  }

  await input.resources.files.ensureDir(input.targetAbs);
  await input.resources.files.copyDirTree(input.backupAbs, input.targetAbs);
}
