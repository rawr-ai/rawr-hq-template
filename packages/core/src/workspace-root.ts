import fs from "node:fs/promises";
import path from "node:path";

/**
 * Checks for filesystem markers without forcing callers to handle ENOENT.
 */
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Defines the neutral workspace-root heuristic shared by CLI entrypoints.
 *
 * This is bootstrap support only: plugin roots and manifest semantics belong in
 * HQ Ops, not in this core package.
 */
async function isWorkspaceRoot(candidateDir: string): Promise<boolean> {
  const pkgPath = path.join(candidateDir, "package.json");
  const pluginsDir = path.join(candidateDir, "plugins");
  return (await pathExists(pkgPath)) && (await pathExists(pluginsDir));
}

/**
 * Walks upward with a bounded depth so command bootstrap cannot scan arbitrary
 * parent trees forever when invoked outside a RAWR workspace.
 */
async function findWorkspaceRootUpwards(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);
  for (let i = 0; i < 20; i += 1) {
    if (await isWorkspaceRoot(current)) return current;

    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }

  return null;
}

/**
 * Locates the RAWR workspace root before service binding.
 *
 * Environment overrides win first, preserving scriptability, then the command
 * searches upward from the current working directory.
 */
export async function findWorkspaceRoot(startDir = process.cwd()): Promise<string | null> {
  const envRoot = process.env.RAWR_WORKSPACE_ROOT ?? process.env.RAWR_HQ_ROOT;
  if (typeof envRoot === "string" && envRoot.trim().length > 0) {
    const resolved = path.resolve(envRoot.trim());
    if (await isWorkspaceRoot(resolved)) return resolved;
  }

  const fromCwd = await findWorkspaceRootUpwards(startDir);
  if (fromCwd) return fromCwd;

  return null;
}
