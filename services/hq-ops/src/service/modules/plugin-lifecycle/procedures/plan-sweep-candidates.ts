import type { HqOpsResources } from "../../../shared/ports/resources";
import type { WorkspacePluginCatalogEntry, WorkspacePluginKind } from "../../../shared/entities/workspace-plugin-catalog";
import { discoverWorkspacePluginCatalog } from "../../../shared/repositories/workspace-plugin-catalog-repository";
import type { LifecycleType } from "../entities";
import { module } from "../module";
import { isAbsolutePath, toPosix } from "../helpers/path-utils";

type PathOps = Pick<HqOpsResources["path"], "join" | "resolve">;
type FsOps = Pick<HqOpsResources["fs"], "readDir" | "stat">;

async function loadWorkspacePluginCatalogEntries(input: {
  workspaceRoot: string;
  resources: Pick<HqOpsResources, "fs" | "path">;
}): Promise<WorkspacePluginCatalogEntry[]> {
  return discoverWorkspacePluginCatalog({ workspaceRoot: input.workspaceRoot, resources: input.resources });
}

/**
 * Maps catalog plugin kind to the lifecycle category used by sweep/check flows.
 */
function inferTypeFromPluginKind(kind: WorkspacePluginKind): LifecycleType {
  if (kind === "toolkit") return "cli";
  if (kind === "web") return "web";
  if (kind === "agent") return "agent";
  if (kind === "workflows" || kind === "schedules") return "workflow";
  return "composed";
}

/**
 * Infers lifecycle category from explicit paths that are not catalog plugins.
 */
function inferTypeFromPath(absPath: string): LifecycleType {
  const normalized = toPosix(absPath);
  if (normalized.includes("/plugins/cli/")) return "cli";
  if (normalized.includes("/plugins/web/")) return "web";
  if (normalized.includes("/plugins/agents/")) return "agent";
  if (normalized.includes("/plugins/async/workflows/")) return "workflow";
  if (normalized.includes("/plugins/async/schedules/")) return "workflow";
  return "composed";
}

/**
 * Small filesystem existence helper used by sweep planning.
 */
async function pathExists(fsOps: FsOps, p: string): Promise<boolean> {
  return Boolean(await fsOps.stat(p));
}

/**
 * Computes service-owned quality issues for sweep candidates.
 */
async function collectSweepCandidateIssues(absPath: string, fsOps: FsOps, pathOps: PathOps): Promise<string[]> {
  const issues: string[] = [];
  if (!(await pathExists(fsOps, pathOps.join(absPath, "README.md")))) issues.push("missing README.md");

  const testDir = pathOps.join(absPath, "test");
  if (!(await pathExists(fsOps, testDir))) {
    issues.push("missing test/ directory");
    return issues;
  }

  const entries = await fsOps.readDir(testDir);
  if (!entries) {
    issues.push("missing test/ directory");
    return issues;
  }

  let hasTests = false;
  for (const entry of entries) {
    if (entry.isDirectory || !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) continue;
    if ((await fsOps.stat(pathOps.join(testDir, entry.name)))?.isFile) {
      hasTests = true;
      break;
    }
  }

  if (!hasTests) issues.push("missing test files in test/");
  return issues;
}

/**
 * Resolves explicit sweep targets against catalog identity before path fallback.
 */
function resolveExplicitSweepTarget(
  target: string,
  workspaceRoot: string,
  catalogPlugins: WorkspacePluginCatalogEntry[],
  pathOps: PathOps,
): { absPath: string; type: LifecycleType } {
  const plugin = catalogPlugins.find((candidate) =>
    candidate.id === target ||
    candidate.name === target ||
    candidate.dirName === target ||
    candidate.absPath === target ||
    candidate.relPath === target
  );
  if (plugin) return { absPath: plugin.absPath, type: inferTypeFromPluginKind(plugin.kind) };

  const absPath = isAbsolutePath(target) ? pathOps.resolve(target) : pathOps.resolve(pathOps.join(workspaceRoot, target));
  return { absPath, type: inferTypeFromPath(absPath) };
}

/**
 * Plans lifecycle sweep work from catalog inventory or explicit user targets.
 */
export const planSweepCandidates = module.planSweepCandidates.handler(async ({ context, input }) => {
  const resources = context.deps.resources;
  const workspaceRoot = resources.path.resolve(input.workspaceRoot ?? context.scope.repoRoot);
  const catalogPlugins = await loadWorkspacePluginCatalogEntries({ workspaceRoot, resources });
  const explicitTargets = input.explicitTargets ?? [];
  const candidates: Array<{ target: string; type: LifecycleType; issues: string[] }> = [];

  if (explicitTargets.length > 0) {
    for (const target of explicitTargets) {
      const resolved = resolveExplicitSweepTarget(target, workspaceRoot, catalogPlugins, resources.path);
      if (!(await pathExists(resources.fs, resolved.absPath))) continue;
      const issues = await collectSweepCandidateIssues(resolved.absPath, resources.fs, resources.path);
      if (issues.length === 0) continue;
      candidates.push({ target: resolved.absPath, type: resolved.type, issues });
    }
  } else {
    for (const plugin of catalogPlugins) {
      const issues = await collectSweepCandidateIssues(plugin.absPath, resources.fs, resources.path);
      if (issues.length === 0) continue;
      candidates.push({ target: plugin.absPath, type: inferTypeFromPluginKind(plugin.kind), issues });
    }
  }

  const sorted = candidates.sort((a, b) => a.target.localeCompare(b.target));
  const limit = Math.max(1, Math.trunc(input.limit ?? 20));
  return {
    workspaceRoot,
    candidates: sorted,
    queued: sorted.slice(0, limit),
  };
});

