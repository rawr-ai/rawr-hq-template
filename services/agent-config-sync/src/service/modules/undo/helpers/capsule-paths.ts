import type { AgentConfigSyncPathResources } from "../../../shared/resources";

export function undoCapsuleDir(workspaceRoot: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(workspaceRoot, ".rawr", "state", "undo", "last");
}

export function undoBackupsDir(workspaceRoot: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(undoCapsuleDir(workspaceRoot, pathOps), "backups");
}

export function undoManifestPath(workspaceRoot: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(undoCapsuleDir(workspaceRoot, pathOps), "manifest.json");
}
