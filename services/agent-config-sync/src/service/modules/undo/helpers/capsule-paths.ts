import path from "node:path";

export function undoCapsuleDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".rawr", "state", "undo", "last");
}

export function undoBackupsDir(workspaceRoot: string): string {
  return path.join(undoCapsuleDir(workspaceRoot), "backups");
}

export function undoManifestPath(workspaceRoot: string): string {
  return path.join(undoCapsuleDir(workspaceRoot), "manifest.json");
}
