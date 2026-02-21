import {
  filterPluginsByKind as filterPluginsByKindFromWorkspace,
  findWorkspaceRoot as findWorkspaceRootFromWorkspace,
  listWorkspacePlugins as listWorkspacePluginsFromWorkspace,
  resolvePluginId as resolvePluginIdFromWorkspace,
  type WorkspacePlugin,
  type WorkspacePluginKind,
} from "@rawr/hq/workspace";

export type { WorkspacePlugin, WorkspacePluginKind };

export async function findWorkspaceRoot(startDir = process.cwd()): Promise<string | null> {
  return findWorkspaceRootFromWorkspace(startDir);
}

export async function listWorkspacePlugins(workspaceRoot: string): Promise<WorkspacePlugin[]> {
  return listWorkspacePluginsFromWorkspace(workspaceRoot);
}

export function filterPluginsByKind(plugins: WorkspacePlugin[], kind: WorkspacePluginKind): WorkspacePlugin[] {
  return filterPluginsByKindFromWorkspace(plugins, kind);
}

export function resolvePluginId(plugins: WorkspacePlugin[], inputId: string): WorkspacePlugin | undefined {
  return resolvePluginIdFromWorkspace(plugins, inputId);
}
