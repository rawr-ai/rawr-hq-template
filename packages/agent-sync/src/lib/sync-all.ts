import path from "node:path";

import { scanSourcePlugin } from "./scan-source-plugin";
import type { SourceContent, SourcePlugin } from "./types";
import { findWorkspaceRoot, listWorkspacePluginDirs, loadSourcePluginFromPath } from "./workspace";

export type SyncAllPlan = {
  workspaceRoot: string;
  syncable: Array<{ sourcePlugin: SourcePlugin; content: SourceContent }>;
  skipped: Array<{ dirName: string; absPath: string; reason: string }>;
};

export async function planSyncAll(cwd = process.cwd()): Promise<SyncAllPlan> {
  const workspaceRoot = await findWorkspaceRoot(cwd);
  if (!workspaceRoot) {
    throw new Error("Unable to locate workspace root (expected a ./plugins directory)");
  }

  const pluginDirs = await listWorkspacePluginDirs(workspaceRoot);
  const syncable: SyncAllPlan["syncable"] = [];
  const skipped: SyncAllPlan["skipped"] = [];

  for (const absPath of pluginDirs) {
    const dirName = path.basename(absPath);
    const sourcePlugin = (await loadSourcePluginFromPath(dirName, absPath)) as SourcePlugin;
    try {
      const content = await scanSourcePlugin(sourcePlugin);
      const hasAny =
        content.workflowFiles.length > 0 ||
        content.skills.length > 0 ||
        content.scripts.length > 0 ||
        content.agentFiles.length > 0;
      if (!hasAny) {
        skipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      syncable.push({ sourcePlugin, content });
    } catch (err) {
      skipped.push({
        dirName: sourcePlugin.dirName,
        absPath: sourcePlugin.absPath,
        reason: `scan failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return { workspaceRoot, syncable, skipped };
}
