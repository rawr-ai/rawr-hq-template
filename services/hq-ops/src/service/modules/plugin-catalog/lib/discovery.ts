import type { HqOpsResources } from "../../../shared/ports/resources";
import type {
  WorkspacePluginCatalogEntry,
  WorkspacePluginDiscoveryRoot,
} from "../entities";
import {
  commandPluginEligibility,
  hasWorkspacePluginContract,
  parseWorkspacePluginManifest,
  runtimeWebEligibility,
} from "./manifest";
import { packageDirName, relativePath } from "./path-utils";

type CatalogResources = Pick<HqOpsResources, "fs" | "path">;
type FsOps = Pick<HqOpsResources["fs"], "readDir" | "readText" | "stat">;
type PathOps = Pick<HqOpsResources["path"], "join" | "resolve">;

const SPLIT_ROOTS: Array<{ discoveryRoot: WorkspacePluginDiscoveryRoot; parts: string[] }> = [
  { discoveryRoot: "cli", parts: ["plugins", "cli"] },
  { discoveryRoot: "agents", parts: ["plugins", "agents"] },
  { discoveryRoot: "web", parts: ["plugins", "web"] },
  { discoveryRoot: "server/api", parts: ["plugins", "server", "api"] },
  { discoveryRoot: "async/workflows", parts: ["plugins", "async", "workflows"] },
  { discoveryRoot: "async/schedules", parts: ["plugins", "async", "schedules"] },
];

type WorkspacePluginDir = {
  absPath: string;
  discoveryRoot: WorkspacePluginDiscoveryRoot;
};

async function listLeafPluginDirsUnder(root: string, discoveryRoot: WorkspacePluginDiscoveryRoot, fsOps: FsOps): Promise<WorkspacePluginDir[]> {
  const dirents = await fsOps.readDir(root);
  if (!dirents) return [];
  return dirents
    .filter((dirent) => dirent.isDirectory)
    .filter((dirent) => !dirent.name.startsWith("."))
    .map((dirent) => ({ absPath: `${root}/${dirent.name}`, discoveryRoot }));
}

async function listWorkspacePluginPackageDirs(workspaceRoot: string, fsOps: FsOps, pathOps: PathOps): Promise<WorkspacePluginDir[]> {
  const out: WorkspacePluginDir[] = [];
  for (const root of SPLIT_ROOTS) {
    out.push(...(await listLeafPluginDirsUnder(pathOps.join(workspaceRoot, ...root.parts), root.discoveryRoot, fsOps)));
  }
  return out.sort((a, b) => a.absPath.localeCompare(b.absPath));
}

async function parsePluginPackage(
  pluginDir: WorkspacePluginDir,
  workspaceRoot: string,
  fsOps: FsOps,
  pathOps: PathOps,
): Promise<WorkspacePluginCatalogEntry | null> {
  const absPath = pluginDir.absPath;
  const packageJsonPath = pathOps.join(absPath, "package.json");
  if (!(await fsOps.stat(packageJsonPath))?.isFile) return null;

  const rawText = await fsOps.readText(packageJsonPath);
  if (!rawText) return null;

  let parsedPackageJson: unknown;
  try {
    parsedPackageJson = JSON.parse(rawText) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse plugin manifest ${packageJsonPath}: ${detail}`);
  }

  if (!hasWorkspacePluginContract(parsedPackageJson)) return null;

  const dirName = packageDirName(absPath);
  const parsed = parseWorkspacePluginManifest({
    manifest: parsedPackageJson,
    pkgJsonPath: packageJsonPath,
    discoveryRoot: pluginDir.discoveryRoot,
  });
  return {
    id: parsed.name ?? dirName,
    name: parsed.name,
    dirName,
    absPath,
    relPath: relativePath(workspaceRoot, absPath),
    packageJsonPath,
    discoveryRoot: pluginDir.discoveryRoot,
    kind: parsed.kind,
    capability: parsed.capability,
    commandPlugin: commandPluginEligibility(parsed.kind, parsedPackageJson),
    runtimeWeb: runtimeWebEligibility(parsed.kind, parsedPackageJson),
  };
}

function assertUniqueCatalogIdentity(plugins: WorkspacePluginCatalogEntry[]): void {
  const seenIds = new Map<string, WorkspacePluginCatalogEntry>();
  const seenDirNames = new Map<string, WorkspacePluginCatalogEntry>();

  for (const plugin of plugins) {
    const existingId = seenIds.get(plugin.id);
    if (existingId) {
      throw new Error(
        `Ambiguous workspace plugin catalog: duplicate plugin id "${plugin.id}" at ${existingId.relPath} and ${plugin.relPath}`,
      );
    }
    seenIds.set(plugin.id, plugin);

    const existingDirName = seenDirNames.get(plugin.dirName);
    if (existingDirName) {
      throw new Error(
        `Ambiguous workspace plugin catalog: duplicate plugin directory "${plugin.dirName}" at ${existingDirName.relPath} and ${plugin.relPath}`,
      );
    }
    seenDirNames.set(plugin.dirName, plugin);
  }
}

export async function discoverWorkspacePluginCatalog(input: {
  workspaceRoot?: string;
}, resources: CatalogResources, defaultWorkspaceRoot: string): Promise<{
  workspaceRoot: string;
  plugins: WorkspacePluginCatalogEntry[];
}> {
  const workspaceRoot = resources.path.resolve(input.workspaceRoot ?? defaultWorkspaceRoot);
  const pluginDirs = await listWorkspacePluginPackageDirs(workspaceRoot, resources.fs, resources.path);
  const plugins: WorkspacePluginCatalogEntry[] = [];
  for (const pluginDir of pluginDirs) {
    const plugin = await parsePluginPackage(pluginDir, workspaceRoot, resources.fs, resources.path);
    if (plugin) plugins.push(plugin);
  }
  assertUniqueCatalogIdentity(plugins);
  return { workspaceRoot, plugins: plugins.sort((a, b) => a.id.localeCompare(b.id)) };
}
