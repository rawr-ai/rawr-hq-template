import type { HqOpsResources } from "../ports/resources";
import {
  FORBIDDEN_LEGACY_RAWR_KEYS,
  WORKSPACE_PLUGIN_KINDS,
  type PluginCapabilityEligibility,
  type WorkspacePluginCatalogEntry,
  type WorkspacePluginDiscoveryRoot,
  type WorkspacePluginKind,
} from "../entities/workspace-plugin-catalog";

type CatalogResources = Pick<HqOpsResources, "fs" | "path">;
type FsOps = Pick<HqOpsResources["fs"], "readDir" | "readText" | "stat">;
type PathOps = Pick<HqOpsResources["path"], "join" | "resolve">;

const EXPECTED_KIND_BY_ROOT: Record<WorkspacePluginDiscoveryRoot, WorkspacePluginKind> = {
  cli: "toolkit",
  agents: "agent",
  web: "web",
  "server/api": "api",
  "async/workflows": "workflows",
  "async/schedules": "schedules",
};

/**
 * Narrows unknown JSON values before manifest policy reads nested rawr fields.
 */
function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function throwContractError(pkgJsonPath: string, message: string): never {
  throw new Error(`Plugin manifest contract violation at ${pkgJsonPath}: ${message}`);
}

function assertNoForbiddenLegacyKeys(rawr: Record<string, unknown>, pkgJsonPath: string): void {
  for (const key of FORBIDDEN_LEGACY_RAWR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rawr, key)) throwContractError(pkgJsonPath, `forbidden rawr.${key} is present`);
  }
}

/**
 * Identifies package.json files that claim to participate in the HQ plugin
 * contract; plain packages under plugin roots are ignored by catalog discovery.
 */
function hasWorkspacePluginContract(manifest: unknown): boolean {
  return isObjectRecord(manifest) && "rawr" in manifest;
}

/**
 * Enforces the HQ plugin manifest contract and root-to-kind mapping.
 *
 * The catalog treats invalid rawr metadata as a repository health problem
 * rather than trying to guess intent at projection time.
 */
function parseWorkspacePluginManifest(input: {
  manifest: unknown;
  pkgJsonPath: string;
  discoveryRoot: WorkspacePluginDiscoveryRoot;
}): { name?: string; kind: WorkspacePluginKind; capability: string } {
  if (!isObjectRecord(input.manifest)) throwContractError(input.pkgJsonPath, "manifest must be a JSON object");
  const rawr = input.manifest.rawr;
  if (!isObjectRecord(rawr)) throwContractError(input.pkgJsonPath, "required rawr object is missing");
  assertNoForbiddenLegacyKeys(rawr, input.pkgJsonPath);

  const rawKind = toOptionalString(rawr.kind);
  if (!rawKind) throwContractError(input.pkgJsonPath, "required rawr.kind is missing");
  if (!WORKSPACE_PLUGIN_KINDS.includes(rawKind as WorkspacePluginKind)) {
    throwContractError(input.pkgJsonPath, `invalid rawr.kind "${rawKind}"`);
  }

  const kind = rawKind as WorkspacePluginKind;
  const expected = EXPECTED_KIND_BY_ROOT[input.discoveryRoot];
  if (kind !== expected) throwContractError(input.pkgJsonPath, `rawr.kind must be "${expected}" for plugins/${input.discoveryRoot}/*`);

  const capability = toOptionalString(rawr.capability)?.trim();
  if (!capability) throwContractError(input.pkgJsonPath, "required rawr.capability is missing");
  return { name: toOptionalString(input.manifest.name), kind, capability };
}

function hasOclifCommandWiring(pkgJson: unknown): boolean {
  if (!isObjectRecord(pkgJson)) return false;
  const oclif = isObjectRecord(pkgJson.oclif) ? pkgJson.oclif : null;
  const typescript = oclif && isObjectRecord(oclif.typescript) ? oclif.typescript : null;
  return typeof oclif?.commands === "string"
    && oclif.commands.length > 0
    && typeof typescript?.commands === "string"
    && typescript.commands.length > 0;
}

function hasRuntimeExports(pkgJson: unknown): boolean {
  if (!isObjectRecord(pkgJson)) return false;
  const exportsField = isObjectRecord(pkgJson.exports) ? pkgJson.exports : null;
  return Boolean(exportsField?.["./server"] || exportsField?.["./web"]);
}

/**
 * Determines whether a toolkit plugin can be linked as an oclif command plugin.
 */
function commandPluginEligibility(kind: WorkspacePluginKind, pkgJson: unknown): PluginCapabilityEligibility {
  if (kind !== "toolkit") return { eligible: false, reason: "not a toolkit plugin" };
  if (!hasOclifCommandWiring(pkgJson)) return { eligible: false, reason: "toolkit plugin missing package.json#oclif command wiring" };
  return { eligible: true, reason: "has package.json#oclif command wiring" };
}

/**
 * Determines whether a web plugin exposes runtime entrypoints HQ can enable.
 */
function runtimeWebEligibility(kind: WorkspacePluginKind, pkgJson: unknown): PluginCapabilityEligibility {
  if (kind !== "web") return { eligible: false, reason: "not a web plugin" };
  if (!hasRuntimeExports(pkgJson)) return { eligible: false, reason: "plugin package has no runtime exports (./server or ./web)" };
  return { eligible: true, reason: "has runtime exports (./server or ./web)" };
}

function toPosix(p: string): string {
  return p.replace(/\\\\/g, "/");
}

/**
 * Computes a display-safe relative path without depending on Node path flavor.
 */
function relativePath(from: string, to: string): string {
  const fromParts = toPosix(from).split("/").filter(Boolean);
  const toParts = toPosix(to).split("/").filter(Boolean);
  let shared = 0;
  while (shared < fromParts.length && shared < toParts.length && fromParts[shared] === toParts[shared]) shared += 1;
  return [
    ...new Array(Math.max(0, fromParts.length - shared)).fill(".."),
    ...toParts.slice(shared),
  ].join("/");
}

function packageDirName(absPath: string): string {
  return toPosix(absPath).split("/").filter(Boolean).at(-1) ?? absPath;
}

/**
 * The HQ workspace plugin layout.
 *
 * This is deliberately service-local domain knowledge: discovery roots imply
 * plugin kind and capability interpretation, so they cannot live in a neutral
 * shared package without leaking plugin-management behavior back out of HQ Ops.
 */
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

/**
 * Reads one configured plugin root and returns only immediate package
 * directories; nested interpretation belongs to each plugin package manifest.
 */
async function listLeafPluginDirsUnder(root: string, discoveryRoot: WorkspacePluginDiscoveryRoot, fsOps: FsOps): Promise<WorkspacePluginDir[]> {
  const dirents = await fsOps.readDir(root);
  if (!dirents) return [];
  return dirents
    .filter((dirent) => dirent.isDirectory)
    .filter((dirent) => !dirent.name.startsWith("."))
    .map((dirent) => ({ absPath: `${root}/${dirent.name}`, discoveryRoot }));
}

/**
 * Expands the canonical HQ plugin layout into concrete package directories.
 */
async function listWorkspacePluginPackageDirs(workspaceRoot: string, fsOps: FsOps, pathOps: PathOps): Promise<WorkspacePluginDir[]> {
  const out: WorkspacePluginDir[] = [];
  for (const root of SPLIT_ROOTS) {
    out.push(...(await listLeafPluginDirsUnder(pathOps.join(workspaceRoot, ...root.parts), root.discoveryRoot, fsOps)));
  }
  return out.sort((a, b) => a.absPath.localeCompare(b.absPath));
}

/**
 * Turns one package.json into a catalog entry after enforcing the workspace
 * plugin manifest contract and deriving command/web eligibility.
 */
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

/**
 * Fails closed when two packages could resolve to the same user-facing target.
 *
 * Lifecycle and web commands depend on catalog resolution being unambiguous; a
 * duplicate id or directory name would otherwise make CLI behavior depend on
 * traversal order.
 */
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

/**
 * Discovers the canonical workspace plugin catalog for a workspace root.
 *
 * @remarks
 * This is a repository boundary (filesystem inventory + manifest parsing),
 * shared by catalog, install, and lifecycle procedures. Routers own the
 * capability flow; this repository owns the mechanics of turning a workspace
 * directory into a validated inventory.
 */
export async function discoverWorkspacePluginCatalog(input: {
  workspaceRoot: string;
  resources: CatalogResources;
}): Promise<WorkspacePluginCatalogEntry[]> {
  const workspaceRoot = input.resources.path.resolve(input.workspaceRoot);
  const pluginDirs = await listWorkspacePluginPackageDirs(workspaceRoot, input.resources.fs, input.resources.path);
  const parsed = await Promise.all(pluginDirs.map((pluginDir) =>
    parsePluginPackage(pluginDir, workspaceRoot, input.resources.fs, input.resources.path)
  ));
  const plugins = parsed
    .filter((p): p is WorkspacePluginCatalogEntry => Boolean(p))
    .sort((a, b) => a.id.localeCompare(b.id));
  assertUniqueCatalogIdentity(plugins);
  return plugins;
}
