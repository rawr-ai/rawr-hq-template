import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pathExists, readJsonFile } from "./fs-utils";
import type { RawrPluginKind } from "./types";

type PackageJson = {
  name?: unknown;
  version?: unknown;
  description?: unknown;
  rawr?: unknown;
};

function normalizeRawrKind(input: unknown): RawrPluginKind | undefined {
  if (input === "toolkit" || input === "agent" || input === "web") return input;
  return undefined;
}

export async function findWorkspaceRoot(startDir = process.cwd()): Promise<string | null> {
  async function isWorkspaceRoot(candidateDir: string): Promise<boolean> {
    const pkg = path.join(candidateDir, "package.json");
    const plugins = path.join(candidateDir, "plugins");
    return (await pathExists(pkg)) && (await pathExists(plugins));
  }

  async function findUpwards(dir: string): Promise<string | null> {
    let current = path.resolve(dir);
    for (let i = 0; i < 20; i += 1) {
      if (await isWorkspaceRoot(current)) return current;
      const parent = path.dirname(current);
      if (parent === current) return null;
      current = parent;
    }
    return null;
  }

  const envRoot = process.env.RAWR_WORKSPACE_ROOT ?? process.env.RAWR_HQ_ROOT;
  if (typeof envRoot === "string" && envRoot.trim().length > 0) {
    const resolved = path.resolve(envRoot.trim());
    if (await isWorkspaceRoot(resolved)) return resolved;
  }

  const fromCwd = await findUpwards(startDir);
  if (fromCwd) return fromCwd;

  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return findUpwards(moduleDir);
}

async function listLeafPluginDirsUnder(root: string): Promise<string[]> {
  let dirents: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    dirents = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const out: string[] = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    if (dirent.name.startsWith(".")) continue;
    out.push(path.join(root, dirent.name));
  }
  return out;
}

export async function listWorkspacePluginDirs(workspaceRoot: string): Promise<string[]> {
  const pluginsDir = path.join(workspaceRoot, "plugins");

  const splitRoots = [
    path.join(pluginsDir, "cli"),
    path.join(pluginsDir, "agents"),
    path.join(pluginsDir, "web"),
  ];

  const out: string[] = [];
  for (const r of splitRoots) out.push(...(await listLeafPluginDirsUnder(r)));

  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export async function loadSourcePluginFromPath(ref: string, absPath: string): Promise<{
  ref: string;
  absPath: string;
  dirName: string;
  packageName?: string;
  description?: string;
  version?: string;
  rawrKind?: RawrPluginKind;
}> {
  const stat = await fs.stat(absPath);
  if (!stat.isDirectory()) throw new Error(`Resolved path is not a plugin directory: ${absPath}`);

  const pkgPath = path.join(absPath, "package.json");
  const pkg = (await readJsonFile<PackageJson>(pkgPath)) ?? {};
  const rawr = (pkg.rawr && typeof pkg.rawr === "object") ? (pkg.rawr as any) : undefined;
  const rawrKind = normalizeRawrKind(rawr?.kind);

  return {
    ref,
    absPath,
    dirName: path.basename(absPath),
    packageName: typeof pkg.name === "string" ? pkg.name : undefined,
    version: typeof pkg.version === "string" ? pkg.version : undefined,
    description: typeof pkg.description === "string" ? pkg.description : undefined,
    rawrKind,
  };
}
