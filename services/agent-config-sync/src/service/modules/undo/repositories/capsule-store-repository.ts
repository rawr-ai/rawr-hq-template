import type { AgentConfigSyncPathResources, AgentConfigSyncResources } from "../../../common/resources";
import type { UndoCapsule } from "../entities";

export function undoCapsuleDir(workspaceRoot: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(workspaceRoot, ".rawr", "state", "undo", "last");
}

export function undoBackupsDir(workspaceRoot: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(undoCapsuleDir(workspaceRoot, pathOps), "backups");
}

export function undoManifestPath(workspaceRoot: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(undoCapsuleDir(workspaceRoot, pathOps), "manifest.json");
}

export async function loadActiveUndoCapsule(
  workspaceRoot: string,
  resources: AgentConfigSyncResources,
): Promise<UndoCapsule | null> {
  const parsed = await resources.files.readJsonFile<UndoCapsule>(undoManifestPath(workspaceRoot, resources.path));
  if (!parsed) return null;
  if (parsed.version !== 1) return null;
  if (!Array.isArray(parsed.operations)) return null;
  return parsed;
}

export async function clearActiveUndoCapsule(
  workspaceRoot: string,
  resources: AgentConfigSyncResources,
): Promise<void> {
  await resources.files.removePath(undoCapsuleDir(workspaceRoot, resources.path), { recursive: true });
}
