import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { UndoCapsule } from "../entities";
import { undoCapsuleDir, undoManifestPath } from "./capsule-paths";

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
