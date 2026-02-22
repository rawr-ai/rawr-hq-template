import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseWorkspacePluginManifest, type WorkspacePluginDiscoveryRoot, type WorkspacePluginKind } from "./plugin-manifest-contract";

export type WorkspacePlugin = {
  id: string;
  name?: string;
  dirName: string;
  absPath: string;
  kind: WorkspacePluginKind;
  capability: string;
  templateRole: "fixture" | "example" | "operational";
  channel: "A" | "B" | "both";
  publishTier: "blocked" | "candidate";
};

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function isWorkspaceRoot(candidateDir: string): Promise<boolean> {
  const pkgPath = path.join(candidateDir, "package.json");
  const pluginsDir = path.join(candidateDir, "plugins");
  return (await pathExists(pkgPath)) && (await pathExists(pluginsDir));
}

async function findWorkspaceRootUpwards(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);
  for (let i = 0; i < 20; i++) {
    if (await isWorkspaceRoot(current)) return current;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }

  return null;
}

export async function findWorkspaceRoot(startDir = process.cwd()): Promise<string | null> {
  // Explicit override for cases where the CLI is invoked from outside the workspace.
  // (e.g. you want to run `rawr journal tail` from another repo).
  const envRoot = process.env.RAWR_WORKSPACE_ROOT ?? process.env.RAWR_HQ_ROOT;
  if (typeof envRoot === "string" && envRoot.trim().length > 0) {
    const resolved = path.resolve(envRoot.trim());
    if (await isWorkspaceRoot(resolved)) return resolved;
  }

  // Primary: search from the working directory.
  const fromCwd = await findWorkspaceRootUpwards(startDir);
  if (fromCwd) return fromCwd;

  // Fallback: search from the installed CLI’s location (useful when invoked elsewhere).
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return findWorkspaceRootUpwards(moduleDir);
}

type WorkspacePluginDir = {
  absPath: string;
  discoveryRoot: WorkspacePluginDiscoveryRoot;
};

async function listLeafPluginDirsUnder(root: string, discoveryRoot: WorkspacePluginDiscoveryRoot): Promise<WorkspacePluginDir[]> {
  let dirents: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    dirents = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: WorkspacePluginDir[] = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name.startsWith(".")) continue;
    out.push({
      absPath: path.join(root, dirent.name),
      discoveryRoot,
    });
  }
  return out;
}

async function listWorkspacePluginPackageDirs(workspaceRoot: string): Promise<WorkspacePluginDir[]> {
  const pluginsDir = path.join(workspaceRoot, "plugins");

  const splitRoots: Array<{ rootPath: string; discoveryRoot: WorkspacePluginDiscoveryRoot }> = [
    { rootPath: path.join(pluginsDir, "cli"), discoveryRoot: "cli" },
    { rootPath: path.join(pluginsDir, "agents"), discoveryRoot: "agents" },
    { rootPath: path.join(pluginsDir, "web"), discoveryRoot: "web" },
  ];

  const out: WorkspacePluginDir[] = [];
  for (const root of splitRoots) {
    out.push(...(await listLeafPluginDirsUnder(root.rootPath, root.discoveryRoot)));
  }

  out.sort((a, b) => a.absPath.localeCompare(b.absPath));
  return out;
}

export async function listWorkspacePlugins(workspaceRoot: string): Promise<WorkspacePlugin[]> {
  const pluginDirs = await listWorkspacePluginPackageDirs(workspaceRoot);
  const plugins: WorkspacePlugin[] = [];

  for (const pluginDir of pluginDirs) {
    const absPath = pluginDir.absPath;
    const dirName = path.basename(absPath);
    const pkgJsonPath = path.join(absPath, "package.json");

    if (!(await pathExists(pkgJsonPath))) continue;

    let parsedPackageJson: unknown;
    try {
      parsedPackageJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf8")) as unknown;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse plugin manifest ${pkgJsonPath}: ${detail}`);
    }

    const parsed = parseWorkspacePluginManifest({
      manifest: parsedPackageJson,
      pkgJsonPath,
      discoveryRoot: pluginDir.discoveryRoot,
    });

    plugins.push({
      id: parsed.name ?? dirName,
      name: parsed.name,
      dirName,
      absPath,
      kind: parsed.kind,
      capability: parsed.capability,
      templateRole: parsed.templateRole,
      channel: parsed.channel,
      publishTier: parsed.publishTier,
    });
  }

  plugins.sort((a, b) => a.id.localeCompare(b.id));
  return plugins;
}

export function filterOperationalPlugins(plugins: WorkspacePlugin[], includeNonOperational: boolean): WorkspacePlugin[] {
  if (includeNonOperational) return plugins;
  return plugins.filter((plugin) => plugin.templateRole === "operational");
}

export function resolvePluginId(plugins: WorkspacePlugin[], inputId: string): WorkspacePlugin | undefined {
  const direct = plugins.find((p) => p.id === inputId);
  if (direct) return direct;
  return plugins.find((p) => p.dirName === inputId);
}
