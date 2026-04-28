import type { HqOpsResources } from "../../../shared/ports/resources";
import type { WorkspacePluginCatalogEntry } from "../../../shared/entities/workspace-plugin-catalog";
import { discoverWorkspacePluginCatalog } from "../../../shared/repositories/workspace-plugin-catalog-repository";
import type { LifecycleTarget, LifecycleType } from "../entities";
import { module } from "../module";
import { isAbsolutePath, relativePath, uniqSorted } from "../helpers/path-utils";

type PathOps = Pick<HqOpsResources["path"], "join" | "resolve">;

async function loadWorkspacePluginCatalogEntries(input: {
  workspaceRoot: string;
  resources: Pick<HqOpsResources, "fs" | "path">;
}): Promise<WorkspacePluginCatalogEntry[]> {
  return discoverWorkspacePluginCatalog({ workspaceRoot: input.workspaceRoot, resources: input.resources });
}

/**
 * Builds the canonical resolved-target payload after a target path is known.
 */
function targetResult(input: { target: string; type: LifecycleType }, workspaceRoot: string, absPath: string): {
  found: true;
  target: LifecycleTarget;
  candidates: string[];
} {
  return {
    found: true,
    candidates: [absPath],
    target: {
      input: input.target,
      absPath,
      relPath: relativePath(workspaceRoot, absPath),
      type: input.type,
    },
  };
}

/**
 * Canonicalizes projection-observed paths before target matching.
 */
function normalizeExistingPathSet(pathOps: PathOps, paths: string[] | undefined): Set<string> {
  return new Set((paths ?? []).map((p) => pathOps.resolve(p)));
}

/**
 * Resolves lifecycle targets through the HQ catalog before falling back to
 * observed filesystem candidates supplied by the CLI.
 */
export const resolveLifecycleTarget = module.resolveLifecycleTarget.handler(async ({ context, input }) => {
  const resources = context.deps.resources;
  const workspaceRoot = resources.path.resolve(input.workspaceRoot ?? context.scope.repoRoot);
  const cwd = resources.path.resolve(input.currentWorkingDirectory ?? workspaceRoot);
  const workspacePlugins = input.workspacePlugins ?? await loadWorkspacePluginCatalogEntries({ workspaceRoot, resources });
  const byPlugin = workspacePlugins.find(
    (plugin) => plugin.id === input.target || plugin.dirName === input.target || plugin.name === input.target,
  );
  if (byPlugin) return targetResult(input, workspaceRoot, resources.path.resolve(byPlugin.absPath));

  const candidates = uniqSorted([
    isAbsolutePath(input.target)
      ? resources.path.resolve(input.target)
      : resources.path.resolve(resources.path.join(workspaceRoot, input.target)),
    resources.path.resolve(resources.path.join(cwd, input.target)),
  ]);
  const existing = normalizeExistingPathSet(resources.path, input.existingPaths);
  const found = candidates.find((candidate) => existing.has(candidate));
  if (found) return targetResult(input, workspaceRoot, found);

  if (input.target.includes("/") || input.target.startsWith(".")) {
    return targetResult(
      input,
      workspaceRoot,
      candidates[0] ?? resources.path.resolve(resources.path.join(workspaceRoot, input.target)),
    );
  }

  return {
    found: false,
    candidates,
    reason: "target did not match a workspace plugin or observed path",
  };
});

