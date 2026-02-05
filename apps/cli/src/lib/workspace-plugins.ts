import fs from "node:fs/promises";
import path from "node:path";

export type WorkspacePlugin = {
  id: string;
  name?: string;
  dirName: string;
  absPath: string;
};

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function findWorkspaceRoot(startDir = process.cwd()): Promise<string | null> {
  let current = startDir;
  for (let i = 0; i < 20; i++) {
    const pkgPath = path.join(current, "package.json");
    const pluginsDir = path.join(current, "plugins");
    if ((await pathExists(pkgPath)) && (await pathExists(pluginsDir))) return current;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }

  return null;
}

export async function listWorkspacePlugins(workspaceRoot: string): Promise<WorkspacePlugin[]> {
  const pluginsDir = path.join(workspaceRoot, "plugins");
  const dirents = await fs.readdir(pluginsDir, { withFileTypes: true });
  const plugins: WorkspacePlugin[] = [];

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;
    const absPath = path.join(pluginsDir, dirent.name);
    const pkgJsonPath = path.join(absPath, "package.json");

    let name: string | undefined;
    if (await pathExists(pkgJsonPath)) {
      try {
        const parsed = JSON.parse(await fs.readFile(pkgJsonPath, "utf8")) as { name?: unknown };
        if (typeof parsed.name === "string") name = parsed.name;
      } catch {
        // ignore
      }
    }

    plugins.push({
      id: name ?? dirent.name,
      name,
      dirName: dirent.name,
      absPath,
    });
  }

  plugins.sort((a, b) => a.id.localeCompare(b.id));
  return plugins;
}

export function resolvePluginId(
  plugins: WorkspacePlugin[],
  inputId: string,
): WorkspacePlugin | undefined {
  const direct = plugins.find((p) => p.id === inputId);
  if (direct) return direct;
  return plugins.find((p) => p.dirName === inputId);
}

