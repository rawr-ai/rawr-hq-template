import { resolveSourceScopeForPath, scopeAllows } from "../../../shared/internal/source-scope";
import type { SyncScope } from "../../../shared/entities";
import type { AgentConfigSyncPathResources } from "../../../shared/resources";

export const MANAGED_BY = "@rawr/plugin-plugins";

export function pluginMatchesScope(input: {
  pathOps: AgentConfigSyncPathResources;
  sourcePluginPath: unknown;
  workspaceRoot: string;
  scope: SyncScope;
}): boolean {
  if (input.scope === "all") return true;
  if (typeof input.sourcePluginPath !== "string" || input.sourcePluginPath.length === 0) return false;
  const resolved = resolveSourceScopeForPath(input.pathOps, input.sourcePluginPath, input.workspaceRoot);
  return scopeAllows(input.scope, resolved);
}
