import path from "node:path";

import { resolveSourceScopeForPath, scopeAllows } from "../../../shared/internal/source-scope";
import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { SyncScope } from "../../../shared/entities";
import type { WorkspaceSkip, WorkspaceSyncable } from "../contract";
import {
  hasAnyContent,
  loadWorkspaceSourcePlugins,
  resolveSourcePlugin,
  scanSourcePlugin,
} from "./source-plugins";

export async function discoverWorkspaceSources(input: {
  cwd: string;
  workspaceRoot: string;
  sourcePaths: string[];
  resources: AgentConfigSyncResources;
}): Promise<{ workspaceRoot: string; syncable: WorkspaceSyncable[]; skipped: WorkspaceSkip[] }> {
  const workspaceRoot = input.workspaceRoot;
  const workspacePlugins = await loadWorkspaceSourcePlugins(workspaceRoot, input.resources);
  const syncable: WorkspaceSyncable[] = [];
  const skipped: WorkspaceSkip[] = [...workspacePlugins.skipped];

  for (const sourcePlugin of workspacePlugins.plugins) {
    try {
      const content = await scanSourcePlugin({
        sourcePlugin,
        workspacePlugins: workspacePlugins.plugins,
        resources: input.resources,
      });
      if (!hasAnyContent(content)) {
        skipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      syncable.push({ sourcePlugin, content });
    } catch (error) {
      skipped.push({
        dirName: sourcePlugin.dirName,
        absPath: sourcePlugin.absPath,
        reason: `scan failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const plannedWorkspaceDirs = new Set(syncable.map((item) => path.resolve(item.sourcePlugin.absPath)));
  const seen = new Set<string>();

  for (const candidate of input.sourcePaths) {
    const absPath = path.resolve(input.cwd, candidate);
    if (plannedWorkspaceDirs.has(absPath) || seen.has(absPath)) continue;
    seen.add(absPath);

    try {
      const sourcePlugin = await resolveSourcePlugin({
        pluginRef: absPath,
        cwd: input.cwd,
        workspaceRoot,
        resources: input.resources,
      });
      const content = await scanSourcePlugin({
        sourcePlugin,
        workspacePlugins: workspacePlugins.plugins,
        resources: input.resources,
      });
      if (!hasAnyContent(content)) {
        skipped.push({ dirName: sourcePlugin.dirName, absPath: sourcePlugin.absPath, reason: "no canonical content directories" });
        continue;
      }
      syncable.push({ sourcePlugin, content });
    } catch (error) {
      skipped.push({
        dirName: path.basename(absPath),
        absPath,
        reason: `unresolvable: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return { workspaceRoot, syncable, skipped };
}

export function filterByScope(input: {
  workspaceRoot: string;
  syncable: WorkspaceSyncable[];
  skipped: WorkspaceSkip[];
  scope: SyncScope;
}): { syncable: WorkspaceSyncable[]; skipped: WorkspaceSkip[] } {
  const filteredSyncable = input.syncable.filter(({ sourcePlugin }) =>
    scopeAllows(input.scope, resolveSourceScopeForPath(sourcePlugin.absPath, input.workspaceRoot)),
  );
  const skipped = [...input.skipped];

  for (const item of input.syncable) {
    if (filteredSyncable.includes(item)) continue;
    skipped.push({
      dirName: item.sourcePlugin.dirName,
      absPath: item.sourcePlugin.absPath,
      reason: `out of scope (${input.scope})`,
    });
  }

  return { syncable: filteredSyncable, skipped };
}
