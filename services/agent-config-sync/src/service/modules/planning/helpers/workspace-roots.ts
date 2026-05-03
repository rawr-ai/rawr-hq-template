import type { AgentConfigSyncResources } from "../../../shared/resources";
import type { RawrPluginKind } from "../../../shared/entities";

const WORKSPACE_PLUGIN_ROOTS: Array<{ scope: RawrPluginKind; relPath: string[] }> = [
  { scope: "toolkit", relPath: ["plugins", "cli"] },
  { scope: "agent", relPath: ["plugins", "agents"] },
  { scope: "web", relPath: ["plugins", "web"] },
  { scope: "api", relPath: ["plugins", "server", "api"] },
  { scope: "workflows", relPath: ["plugins", "async", "workflows"] },
  { scope: "schedules", relPath: ["plugins", "async", "schedules"] },
];

async function isWorkspaceRoot(candidateDir: string, resources: AgentConfigSyncResources): Promise<boolean> {
  const packageJsonPath = resources.path.join(candidateDir, "package.json");
  const pluginsDir = resources.path.join(candidateDir, "plugins");
  return (await resources.files.pathExists(packageJsonPath)) && (await resources.files.pathExists(pluginsDir));
}

async function listLeafPluginDirsUnder(rootPath: string, resources: AgentConfigSyncResources): Promise<string[]> {
  const dirents = await resources.files.readDir(rootPath);
  return dirents
    .filter((dirent) => dirent.isDirectory && !dirent.name.startsWith("."))
    .map((dirent) => resources.path.join(rootPath, dirent.name));
}

export type WorkspaceRootResolution =
  | { ok: true; workspaceRoot: string }
  | {
      ok: false;
      code: "INVALID_WORKSPACE_ROOT" | "WORKSPACE_ROOT_NOT_FOUND";
      cwd: string;
      workspaceRoot?: string;
      resolvedPath?: string;
    };

export async function resolveWorkspaceRoot(input: {
  cwd: string;
  workspaceRoot?: string;
  resources: AgentConfigSyncResources;
}): Promise<WorkspaceRootResolution> {
  if (input.workspaceRoot) {
    const explicit = input.resources.path.resolve(input.cwd, input.workspaceRoot);
    if (await isWorkspaceRoot(explicit, input.resources)) return { ok: true, workspaceRoot: explicit };
    return {
      ok: false,
      code: "INVALID_WORKSPACE_ROOT",
      cwd: input.cwd,
      workspaceRoot: input.workspaceRoot,
      resolvedPath: explicit,
    };
  }

  let currentDir = input.resources.path.resolve(input.cwd);
  for (let depth = 0; depth < 20; depth += 1) {
    if (await isWorkspaceRoot(currentDir, input.resources)) return { ok: true, workspaceRoot: currentDir };
    const parentDir = input.resources.path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return {
    ok: false,
    code: "WORKSPACE_ROOT_NOT_FOUND",
    cwd: input.cwd,
    workspaceRoot: input.workspaceRoot,
  };
}

export async function listWorkspacePluginDirs(
  workspaceRoot: string,
  resources: AgentConfigSyncResources,
): Promise<string[]> {
  const pluginDirs: string[] = [];
  for (const root of WORKSPACE_PLUGIN_ROOTS) {
    pluginDirs.push(...(await listLeafPluginDirsUnder(resources.path.join(workspaceRoot, ...root.relPath), resources)));
  }
  return pluginDirs.sort((a, b) => a.localeCompare(b));
}
