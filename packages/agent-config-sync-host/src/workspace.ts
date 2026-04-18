import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pathExists, readJsonFile } from "./fs-utils";
import type { HostSourcePlugin, RawrPluginKind } from "./types";

type WorkspacePackageJson = {
  name?: unknown;
  version?: unknown;
  description?: unknown;
  rawr?: unknown;
};

function asObjectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function normalizeRawrKind(input: unknown): RawrPluginKind | undefined {
  if (input === "toolkit" || input === "agent" || input === "web") return input;
  return undefined;
}

export async function findWorkspaceRoot(startDir = process.cwd()): Promise<string | null> {
  async function isWorkspaceRoot(candidateDir: string): Promise<boolean> {
    const packageJsonPath = path.join(candidateDir, "package.json");
    const pluginsDir = path.join(candidateDir, "plugins");
    return (await pathExists(packageJsonPath)) && (await pathExists(pluginsDir));
  }

  async function findUpwards(initialDir: string): Promise<string | null> {
    let currentDir = path.resolve(initialDir);
    for (let depth = 0; depth < 20; depth += 1) {
      if (await isWorkspaceRoot(currentDir)) return currentDir;
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) return null;
      currentDir = parentDir;
    }
    return null;
  }

  const envRoot = process.env.RAWR_WORKSPACE_ROOT ?? process.env.RAWR_HQ_ROOT;
  if (typeof envRoot === "string" && envRoot.trim().length > 0) {
    const resolvedRoot = path.resolve(envRoot.trim());
    if (await isWorkspaceRoot(resolvedRoot)) return resolvedRoot;
  }

  const fromStartDir = await findUpwards(startDir);
  if (fromStartDir) return fromStartDir;

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return findUpwards(moduleDir);
}

async function listLeafPluginDirsUnder(rootPath: string): Promise<string[]> {
  let dirents: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    dirents = await fs.readdir(rootPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const pluginDirs: string[] = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name.startsWith(".")) continue;
    pluginDirs.push(path.join(rootPath, dirent.name));
  }
  return pluginDirs;
}

export async function listWorkspacePluginDirs(workspaceRoot: string): Promise<string[]> {
  const pluginsDir = path.join(workspaceRoot, "plugins");
  const splitRoots = [
    path.join(pluginsDir, "cli"),
    path.join(pluginsDir, "agents"),
    path.join(pluginsDir, "web"),
  ];

  const pluginDirs: string[] = [];
  for (const splitRoot of splitRoots) {
    pluginDirs.push(...(await listLeafPluginDirsUnder(splitRoot)));
  }

  pluginDirs.sort((a, b) => a.localeCompare(b));
  return pluginDirs;
}

export async function loadSourcePluginFromPath(
  ref: string,
  absPath: string,
): Promise<HostSourcePlugin> {
  const stat = await fs.stat(absPath);
  if (!stat.isDirectory()) {
    throw new Error(`Resolved path is not a plugin directory: ${absPath}`);
  }

  const packageJsonPath = path.join(absPath, "package.json");
  const packageJson = (await readJsonFile<WorkspacePackageJson>(packageJsonPath)) ?? {};
  const rawr = asObjectRecord(packageJson.rawr);
  const rawrKind = normalizeRawrKind(rawr?.kind);

  return {
    ref,
    absPath,
    dirName: path.basename(absPath),
    packageName: typeof packageJson.name === "string" ? packageJson.name : undefined,
    version: typeof packageJson.version === "string" ? packageJson.version : undefined,
    description: typeof packageJson.description === "string" ? packageJson.description : undefined,
    rawrKind,
  };
}
