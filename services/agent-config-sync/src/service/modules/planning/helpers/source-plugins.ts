import { scanSourcePluginContent } from "../../../shared/source-content/helpers/source-plugin-content";
import type { AgentConfigSyncResources } from "../../../shared/resources";
import type {
  RawrPluginKind,
  SourceContent,
  SourcePlugin,
} from "../../../shared/entities";
import type { WorkspaceSkip, WorkspaceSyncable } from "../contract";
import { listWorkspacePluginDirs } from "./workspace-roots";

type PackageJson = {
  name?: unknown;
  version?: unknown;
  description?: unknown;
  rawr?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function normalizeRawrKind(input: unknown): RawrPluginKind | undefined {
  if (
    input === "toolkit" ||
    input === "agent" ||
    input === "web" ||
    input === "api" ||
    input === "workflows" ||
    input === "schedules"
  ) {
    return input;
  }
  return undefined;
}

export function hasAnyContent(content: SourceContent): boolean {
  return (
    content.workflowFiles.length > 0 ||
    content.skills.length > 0 ||
    content.scripts.length > 0 ||
    content.agentFiles.length > 0
  );
}

export async function loadSourcePluginFromPath(input: {
  ref: string;
  absPath: string;
  resources: AgentConfigSyncResources;
}): Promise<SourcePlugin> {
  const absPath = input.resources.path.resolve(input.absPath);
  const kind = await input.resources.files.statPathKind(absPath);
  if (kind !== "dir") {
    throw new Error(`Resolved path is not a plugin directory: ${absPath}`);
  }

  const packageJson = await input.resources.files.readJsonFile<PackageJson>(
    input.resources.path.join(absPath, "package.json"),
  );
  const rawr = asRecord(packageJson?.rawr);

  return {
    ref: input.ref,
    absPath,
    dirName: input.resources.path.basename(absPath),
    packageName: typeof packageJson?.name === "string" ? packageJson.name : undefined,
    version: typeof packageJson?.version === "string" ? packageJson.version : undefined,
    description: typeof packageJson?.description === "string" ? packageJson.description : undefined,
    rawrKind: normalizeRawrKind(rawr?.kind),
  };
}

export async function loadWorkspaceSourcePlugins(
  workspaceRoot: string,
  resources: AgentConfigSyncResources,
): Promise<{ plugins: SourcePlugin[]; skipped: WorkspaceSkip[] }> {
  const pluginDirs = await listWorkspacePluginDirs(workspaceRoot, resources);
  const plugins: SourcePlugin[] = [];
  const skipped: WorkspaceSkip[] = [];

  for (const absPath of pluginDirs) {
    const dirName = resources.path.basename(absPath);
    try {
      plugins.push(await loadSourcePluginFromPath({ ref: dirName, absPath, resources }));
    } catch (error) {
      skipped.push({
        dirName,
        absPath,
        reason: `scan failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return { plugins, skipped };
}

export async function resolveSourcePlugin(input: {
  pluginRef: string;
  cwd: string;
  workspaceRoot: string;
  resources: AgentConfigSyncResources;
}): Promise<SourcePlugin> {
  const pathCandidate = input.resources.path.resolve(input.cwd, input.pluginRef);
  if (await input.resources.files.pathExists(pathCandidate)) {
    return loadSourcePluginFromPath({
      ref: input.pluginRef,
      absPath: pathCandidate,
      resources: input.resources,
    });
  }

  const pluginDirs = await listWorkspacePluginDirs(input.workspaceRoot, input.resources);
  let pluginDirMatch: string | null = null;

  for (const pluginDir of pluginDirs) {
    const dirName = input.resources.path.basename(pluginDir);
    if (dirName === input.pluginRef) pluginDirMatch = pluginDir;

    const packageJson = await input.resources.files.readJsonFile<PackageJson>(
      input.resources.path.join(pluginDir, "package.json"),
    );
    if (typeof packageJson?.name === "string" && packageJson.name === input.pluginRef) {
      return loadSourcePluginFromPath({
        ref: input.pluginRef,
        absPath: pluginDir,
        resources: input.resources,
      });
    }
  }

  if (pluginDirMatch) {
    return loadSourcePluginFromPath({
      ref: input.pluginRef,
      absPath: pluginDirMatch,
      resources: input.resources,
    });
  }

  throw new Error(
    `Could not resolve plugin '${input.pluginRef}'. Use package name, canonical plugin dir, or an absolute/relative path.`,
  );
}

export async function scanSourcePlugin(input: {
  sourcePlugin: SourcePlugin;
  workspacePlugins: SourcePlugin[];
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  return scanSourcePluginContent(input);
}

export async function resolveAndScanSourcePlugin(input: {
  pluginRef: string;
  cwd: string;
  workspaceRoot: string;
  resources: AgentConfigSyncResources;
}): Promise<WorkspaceSyncable> {
  const sourcePlugin = await resolveSourcePlugin(input);
  const workspacePlugins = await loadWorkspaceSourcePlugins(input.workspaceRoot, input.resources);
  const content = await scanSourcePlugin({
    sourcePlugin,
    workspacePlugins: workspacePlugins.plugins,
    resources: input.resources,
  });
  return { sourcePlugin, content };
}
