/**
 * hq-ops: plugin-catalog module.
 *
 * This router owns plugin inventory and identity resolution for a workspace.
 * It is intentionally "catalog only": install/lifecycle side effects live in
 * sibling modules so callers can choose read vs write capabilities explicitly.
 */
import { discoverWorkspacePluginCatalog } from "./helpers/discovery";
import { module } from "./module";

/**
 * Catalog listing procedure.
 *
 * The procedure owns workspace plugin inventory filtering so CLI commands and
 * app surfaces do not need to know the canonical root layout or rawr manifest
 * rules.
 */
const listWorkspacePlugins = module.listWorkspacePlugins.handler(async ({ context, input }) => {
  const catalog = await discoverWorkspacePluginCatalog(
    { workspaceRoot: input.workspaceRoot },
    context.deps.resources,
    context.scope.repoRoot,
  );
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
  const catalog = await discoverWorkspacePluginCatalog(
    { workspaceRoot: input.workspaceRoot },
    context.deps.resources,
    context.scope.repoRoot,
  );
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
