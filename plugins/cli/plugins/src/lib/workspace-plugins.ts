import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type WorkspacePlugin = {
  id: string;
  name?: string;
  dirName: string;
  absPath: string;
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

async function listWorkspacePluginPackageDirs(workspaceRoot: string): Promise<string[]> {
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

export async function listWorkspacePlugins(workspaceRoot: string): Promise<WorkspacePlugin[]> {
  const pluginDirs = await listWorkspacePluginPackageDirs(workspaceRoot);
  const plugins: WorkspacePlugin[] = [];

  for (const absPath of pluginDirs) {
    const dirName = path.basename(absPath);
    const pkgJsonPath = path.join(absPath, "package.json");

    let name: string | undefined;
    let templateRole: WorkspacePlugin["templateRole"] = "operational";
    let channel: WorkspacePlugin["channel"] = "both";
    let publishTier: WorkspacePlugin["publishTier"] = "blocked";
    if (await pathExists(pkgJsonPath)) {
      try {
        const parsed = JSON.parse(await fs.readFile(pkgJsonPath, "utf8")) as {
          name?: unknown;
          rawr?: {
            templateRole?: unknown;
            channel?: unknown;
            publishTier?: unknown;
          };
        };
        if (typeof parsed.name === "string") name = parsed.name;
        if (
          parsed.rawr?.templateRole === "fixture" ||
          parsed.rawr?.templateRole === "example" ||
          parsed.rawr?.templateRole === "operational"
        ) {
          templateRole = parsed.rawr.templateRole;
        }
        if (parsed.rawr?.channel === "A" || parsed.rawr?.channel === "B" || parsed.rawr?.channel === "both") {
          channel = parsed.rawr.channel;
        }
        if (parsed.rawr?.publishTier === "blocked" || parsed.rawr?.publishTier === "candidate") {
          publishTier = parsed.rawr.publishTier;
        }
      } catch {
        // ignore
      }
    }

    plugins.push({
      id: name ?? dirName,
      name,
      dirName,
      absPath,
      templateRole,
      channel,
      publishTier,
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
