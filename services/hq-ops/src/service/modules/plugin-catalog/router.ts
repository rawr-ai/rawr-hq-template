/**
 * hq-ops: plugin-catalog module.
 *
 * This router owns plugin inventory and identity resolution for a workspace.
 * It is intentionally "catalog only": install/lifecycle side effects live in
 * sibling modules so callers can choose read vs write capabilities explicitly.
 */
import { assertUniqueCatalogIdentity, listWorkspacePluginPackageDirs, parsePluginPackage } from "./helpers/discovery";
import { module } from "./module";
import type { HqOpsResources } from "../../shared/ports/resources";
import type { WorkspacePluginCatalogEntry } from "./entities";

async function loadWorkspacePluginCatalog(input: {
  workspaceRoot?: string;
  defaultWorkspaceRoot: string;
  resources: Pick<HqOpsResources, "fs" | "path">;
}): Promise<{ workspaceRoot: string; plugins: WorkspacePluginCatalogEntry[] }> {
  const resources = input.resources;
  const workspaceRoot = resources.path.resolve(input.workspaceRoot ?? input.defaultWorkspaceRoot);
  const pluginDirs = await listWorkspacePluginPackageDirs(workspaceRoot, resources.fs, resources.path);
  const parsed = await Promise.all(pluginDirs.map((pluginDir) => parsePluginPackage(pluginDir, workspaceRoot, resources.fs, resources.path)));
  const plugins = parsed
    .filter((p): p is WorkspacePluginCatalogEntry => Boolean(p))
    .sort((a, b) => a.id.localeCompare(b.id));
  assertUniqueCatalogIdentity(plugins);
  return { workspaceRoot, plugins };
}

/**
 * Catalog listing procedure.
 *
 * The procedure owns workspace plugin inventory filtering so CLI commands and
 * app surfaces do not need to know the canonical root layout or rawr manifest
 * rules.
 */
const listWorkspacePlugins = module.listWorkspacePlugins.handler(async ({ context, input }) => {
  const catalog = await loadWorkspacePluginCatalog({
    workspaceRoot: input.workspaceRoot,
    defaultWorkspaceRoot: context.scope.repoRoot,
    resources: context.deps.resources,
  });
  const plugins = input.kind
    ? catalog.plugins.filter((plugin) => plugin.kind === input.kind)
    : catalog.plugins;
  return {
    workspaceRoot: catalog.workspaceRoot,
    plugins,
    excludedCount: catalog.plugins.length - plugins.length,
  };
});

/**
 * Catalog resolution procedure.
 *
 * It centralizes plugin id/name/dir matching and kind guardrails so web,
 * lifecycle, and install flows all interpret user targets the same way.
 */
const resolveWorkspacePlugin = module.resolveWorkspacePlugin.handler(async ({ context, input }) => {
  const catalog = await loadWorkspacePluginCatalog({
    workspaceRoot: input.workspaceRoot,
    defaultWorkspaceRoot: context.scope.repoRoot,
    resources: context.deps.resources,
  });
  const plugin = catalog.plugins.find((candidate) =>
    candidate.id === input.inputId || candidate.name === input.inputId || candidate.dirName === input.inputId
  );
  const knownPluginIds = catalog.plugins.map((candidate) => candidate.id);
  if (!plugin) {
    return {
      workspaceRoot: catalog.workspaceRoot,
      status: "not_found" as const,
      knownPluginIds,
    };
  }
  if (input.requiredKind && plugin.kind !== input.requiredKind) {
    return {
      workspaceRoot: catalog.workspaceRoot,
      status: "kind_mismatch" as const,
      actualKind: plugin.kind,
      knownPluginIds,
    };
  }
  return {
    workspaceRoot: catalog.workspaceRoot,
    status: "found" as const,
    plugin,
    actualKind: plugin.kind,
    knownPluginIds,
  };
});

/**
 * Router export for the HQ plugin catalog capability.
 */
export const router = module.router({
  listWorkspacePlugins,
  resolveWorkspacePlugin,
});
