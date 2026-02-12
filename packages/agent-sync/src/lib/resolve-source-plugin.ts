import path from "node:path";

import { pathExists, readJsonFile } from "./fs-utils";
import type { SourcePlugin } from "./types";
import { findWorkspaceRoot, listWorkspacePluginDirs, loadSourcePluginFromPath } from "./workspace";

type PackageJson = {
  name?: unknown;
};

export async function resolveSourcePlugin(pluginRef: string, cwd = process.cwd()): Promise<SourcePlugin> {
  const pathCandidate = path.resolve(cwd, pluginRef);
  if (await pathExists(pathCandidate)) {
    return loadSourcePluginFromPath(pluginRef, pathCandidate);
  }

  const workspaceRoot = await findWorkspaceRoot(cwd);
  if (!workspaceRoot) {
    throw new Error("Unable to locate workspace root (expected a ./plugins/{cli,agents,web} directory)");
  }

  const pluginDirs = await listWorkspacePluginDirs(workspaceRoot);
  let byDir: string | null = null;

  for (const pluginDir of pluginDirs) {
    const dirName = path.basename(pluginDir);
    if (dirName === pluginRef) byDir = pluginDir;

    const pkg = await readJsonFile<PackageJson>(path.join(pluginDir, "package.json"));
    if (typeof pkg?.name === "string" && pkg.name === pluginRef) {
      return loadSourcePluginFromPath(pluginRef, pluginDir);
    }
  }

  if (byDir) return loadSourcePluginFromPath(pluginRef, byDir);

  throw new Error(
    `Could not resolve plugin '${pluginRef}'. Use package name, plugins/{cli,agents,web}/<dir>, or an absolute/relative path.`,
  );
}
