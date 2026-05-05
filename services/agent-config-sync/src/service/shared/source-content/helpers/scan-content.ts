import type { AgentConfigSyncResources } from "../../resources";
import type { ContentFile, OrchestrationSpec, SourceContent } from "../../entities";
import type { NormalizedPluginContentInclude } from "../entities";

/**
 * Scans a canonical source-content root into the service's normalized content
 * model. This owns layout interpretation for workflows, skills, scripts, and
 * agents instead of leaving CLI resources to duplicate directory policy.
 */
export async function scanCanonicalContentAtRoot(input: {
  rootAbsPath: string;
  include: NormalizedPluginContentInclude;
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  const workflowsDir = input.resources.path.join(input.rootAbsPath, "workflows");
  const skillsDir = input.resources.path.join(input.rootAbsPath, "skills");
  const scriptsDir = input.resources.path.join(input.rootAbsPath, "scripts");
  const agentsDir = input.resources.path.join(input.rootAbsPath, "agents");
  const hooksDir = input.resources.path.join(input.rootAbsPath, "hooks");
  const mcpDir = input.resources.path.join(input.rootAbsPath, "mcp");
  const settingsDir = input.resources.path.join(input.rootAbsPath, "settings");
  const assetsDir = input.resources.path.join(input.rootAbsPath, "assets");

  const content: SourceContent = {
    workflowFiles: [],
    skills: [],
    scripts: [],
    agentFiles: [],
    hooks: [],
    hookConfigs: [],
    mcpServers: [],
    settings: [],
    assets: [],
    orchestration: [],
  };

  if (input.include.workflows && (await input.resources.files.pathExists(workflowsDir))) {
    for (const dirent of await input.resources.files.readDir(workflowsDir)) {
      if (dirent.isDirectory || !dirent.name.endsWith(".md")) continue;
      content.workflowFiles.push({
        name: dirent.name.slice(0, -3),
        absPath: input.resources.path.join(workflowsDir, dirent.name),
      });
    }
  }

  if (input.include.skills && (await input.resources.files.pathExists(skillsDir))) {
    for (const dirent of await input.resources.files.readDir(skillsDir)) {
      if (!dirent.isDirectory) continue;
      const skillDir = input.resources.path.join(skillsDir, dirent.name);
      if (!(await input.resources.files.pathExists(input.resources.path.join(skillDir, "SKILL.md")))) continue;
      content.skills.push({ name: dirent.name, absPath: skillDir });
    }
  }

  if (input.include.scripts && (await input.resources.files.pathExists(scriptsDir))) {
    for (const dirent of await input.resources.files.readDir(scriptsDir)) {
      if (dirent.isDirectory) continue;
      content.scripts.push({
        name: dirent.name,
        absPath: input.resources.path.join(scriptsDir, dirent.name),
      });
    }
  }

  if (input.include.agents && (await input.resources.files.pathExists(agentsDir))) {
    for (const dirent of await input.resources.files.readDir(agentsDir)) {
      if (dirent.isDirectory || !dirent.name.endsWith(".md")) continue;
      content.agentFiles.push({
        name: dirent.name.slice(0, -3),
        absPath: input.resources.path.join(agentsDir, dirent.name),
      });
    }
  }

  if (input.include.hooks) {
    const hookFiles = await scanFilesRecursive({
      rootAbsPath: hooksDir,
      resources: input.resources,
    });
    content.hookConfigs = hookFiles.filter((hook) => isHookConfigFile(hook.name));
    content.hooks = await selectHookMaterial({
      hookFiles,
      hookConfigs: content.hookConfigs,
      hooksDir,
      resources: input.resources,
    });
  }

  if (input.include.mcpServers) {
    content.mcpServers = await scanFilesRecursive({
      rootAbsPath: mcpDir,
      resources: input.resources,
    });
    const rootMcpJson = input.resources.path.join(input.rootAbsPath, ".mcp.json");
    if (await input.resources.files.pathExists(rootMcpJson)) {
      content.mcpServers.push({ name: ".mcp.json", absPath: rootMcpJson });
    }
  }

  if (input.include.settings) {
    content.settings = await scanFilesRecursive({
      rootAbsPath: settingsDir,
      resources: input.resources,
    });
  }

  if (input.include.assets) {
    content.assets = await scanFilesRecursive({
      rootAbsPath: assetsDir,
      resources: input.resources,
    });
  }

  if (input.include.orchestration) {
    content.orchestration = await scanOrchestration({ content, resources: input.resources });
  }

  content.workflowFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.skills.sort((a, b) => a.name.localeCompare(b.name));
  content.scripts.sort((a, b) => a.name.localeCompare(b.name));
  content.agentFiles.sort((a, b) => a.name.localeCompare(b.name));
  (content.hooks ??= []).sort((a, b) => a.name.localeCompare(b.name));
  (content.hookConfigs ??= []).sort((a, b) => a.name.localeCompare(b.name));
  (content.mcpServers ??= []).sort((a, b) => a.name.localeCompare(b.name));
  (content.settings ??= []).sort((a, b) => a.name.localeCompare(b.name));
  (content.assets ??= []).sort((a, b) => a.name.localeCompare(b.name));
  (content.orchestration ??= []).sort((a, b) => a.name.localeCompare(b.name));

  return content;
}

function isHookConfigFile(name: string): boolean {
  return name === "hooks.json" || name.endsWith("/hooks.json");
}

async function selectHookMaterial(input: {
  hookFiles: ContentFile[];
  hookConfigs: ContentFile[];
  hooksDir: string;
  resources: AgentConfigSyncResources;
}): Promise<ContentFile[]> {
  const candidates = input.hookFiles.filter((hook) => !isHookConfigFile(hook.name));
  if (candidates.length === 0) return [];

  const candidateByName = new Map(candidates.map((hook) => [normalizeRelativePath(hook.name), hook]));
  const selected = new Map<string, ContentFile>();

  for (const command of await readHookCommands(input.hookConfigs, input.resources)) {
    for (const hook of candidates) {
      if (commandReferencesHook(command, hook, input.hooksDir, input.resources)) {
        selected.set(normalizeRelativePath(hook.name), hook);
      }
    }
  }

  if (selected.size === 0) {
    for (const hook of candidates) {
      if (await hasRuntimeHookSignature(hook, input.resources)) selected.set(normalizeRelativePath(hook.name), hook);
    }
  }

  for (const hook of [...selected.values()]) {
    await addLocalHookDependencies({
      hook,
      selected,
      candidateByName,
      resources: input.resources,
    });
  }

  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function readHookCommands(
  hookConfigs: ContentFile[],
  resources: AgentConfigSyncResources,
): Promise<string[]> {
  const commands: string[] = [];
  for (const config of hookConfigs) {
    const parsed = await resources.files.readJsonFile<unknown>(config.absPath);
    collectCommandStrings(parsed, commands);
  }
  return commands;
}

function collectCommandStrings(value: unknown, commands: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectCommandStrings(item, commands);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, child] of Object.entries(value)) {
    if (key === "command" && typeof child === "string") commands.push(child);
    else collectCommandStrings(child, commands);
  }
}

function commandReferencesHook(
  command: string,
  hook: ContentFile,
  hooksDir: string,
  resources: AgentConfigSyncResources,
): boolean {
  const rel = normalizeRelativePath(hook.name);
  const basename = resources.path.basename(rel);
  const absPath = normalizeRelativePath(hook.absPath);
  const absFromHooksDir = normalizeRelativePath(resources.path.join(hooksDir, rel));
  const normalizedCommand = normalizeRelativePath(command);
  const references = [
    rel,
    basename,
    `./${rel}`,
    `hooks/${rel}`,
    `./hooks/${rel}`,
    `\${CODEX_PLUGIN_ROOT}/hooks/${rel}`,
    `\${CLAUDE_PLUGIN_ROOT}/hooks/${rel}`,
    absPath,
    absFromHooksDir,
  ];
  return references.some((reference) => normalizedCommand.includes(reference));
}

async function addLocalHookDependencies(input: {
  hook: ContentFile;
  selected: Map<string, ContentFile>;
  candidateByName: Map<string, ContentFile>;
  resources: AgentConfigSyncResources;
}): Promise<void> {
  const text = await input.resources.files.readTextFile(input.hook.absPath);
  if (!text) return;

  for (const specifier of collectRelativeModuleSpecifiers(text)) {
    const resolved = resolveHookModuleSpecifier({
      importerName: input.hook.name,
      specifier,
      candidateByName: input.candidateByName,
      pathOps: input.resources.path,
    });
    if (!resolved) continue;
    const key = normalizeRelativePath(resolved.name);
    if (input.selected.has(key)) continue;
    input.selected.set(key, resolved);
    await addLocalHookDependencies({
      hook: resolved,
      selected: input.selected,
      candidateByName: input.candidateByName,
      resources: input.resources,
    });
  }
}

function collectRelativeModuleSpecifiers(text: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier?.startsWith(".")) specifiers.push(specifier);
    }
  }
  return [...new Set(specifiers)].sort();
}

function resolveHookModuleSpecifier(input: {
  importerName: string;
  specifier: string;
  candidateByName: Map<string, ContentFile>;
  pathOps: AgentConfigSyncResources["path"];
}): ContentFile | undefined {
  const importerDir = input.pathOps.dirname(input.importerName);
  const base = normalizeRelativePath(input.pathOps.normalize(input.pathOps.join(importerDir, input.specifier)));
  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".json"].map((ext) => `${base}${ext}`),
    ...[".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".json"].map((ext) => `${base}/index${ext}`),
  ];
  for (const candidate of candidates) {
    const hook = input.candidateByName.get(normalizeRelativePath(candidate));
    if (hook) return hook;
  }
  return undefined;
}

async function hasRuntimeHookSignature(hook: ContentFile, resources: AgentConfigSyncResources): Promise<boolean> {
  const runtimeExtensions = new Set([
    ".cjs",
    ".js",
    ".jsx",
    ".mjs",
    ".py",
    ".sh",
    ".ts",
    ".tsx",
  ]);
  if (runtimeExtensions.has(resources.path.extname(hook.name).toLowerCase())) return true;

  const text = await resources.files.readTextFile(hook.absPath);
  return Boolean(text?.startsWith("#!"));
}

function normalizeRelativePath(value: string): string {
  return value.replaceAll("\\", "/");
}

async function scanFilesRecursive(input: {
  rootAbsPath: string;
  resources: AgentConfigSyncResources;
}): Promise<ContentFile[]> {
  const rootKind = await input.resources.files.statPathKind(input.rootAbsPath);
  if (rootKind !== "dir") return [];

  const files: ContentFile[] = [];
  async function walk(absDir: string): Promise<void> {
    for (const dirent of await input.resources.files.readDir(absDir)) {
      const absPath = input.resources.path.join(absDir, dirent.name);
      if (dirent.isDirectory) {
        await walk(absPath);
        continue;
      }
      files.push({
        name: input.resources.path.relative(input.rootAbsPath, absPath),
        absPath,
      });
    }
  }

  await walk(input.rootAbsPath);
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

async function scanOrchestration(input: {
  content: SourceContent;
  resources: AgentConfigSyncResources;
}): Promise<OrchestrationSpec[]> {
  const specs: OrchestrationSpec[] = [];

  async function maybeAddSpec(sourceKind: OrchestrationSpec["sourceKind"], file: ContentFile, readPath: string): Promise<void> {
    const raw = await input.resources.files.readTextFile(readPath);
    if (!raw) return;

    const skillInvocations = [...raw.matchAll(/Skill\s*\(\s*skill:\s*["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((value): value is string => Boolean(value));
    const taskSpawns = [...raw.matchAll(/Task\s*\(([^)]*)\)/g)]
      .map((match, index) => {
        const body = match[1] ?? "";
        const named = body.match(/(?:subagent_type|agent|role)\s*:\s*["']([^"']+)["']/);
        return named?.[1] ?? `task-${index + 1}`;
      });
    const todoState = /\bTodoWrite\b/.test(raw);

    if (skillInvocations.length === 0 && taskSpawns.length === 0 && !todoState) return;
    specs.push({
      name: `${sourceKind}:${file.name}`,
      absPath: readPath,
      provider: "claude",
      sourceKind,
      skillInvocations,
      taskSpawns,
      todoState,
    });
  }

  for (const workflow of input.content.workflowFiles) {
    await maybeAddSpec("workflow", workflow, workflow.absPath);
  }
  for (const skill of input.content.skills) {
    await maybeAddSpec("skill", skill, input.resources.path.join(skill.absPath, "SKILL.md"));
  }
  for (const agent of input.content.agentFiles) {
    await maybeAddSpec("agent", agent, agent.absPath);
  }

  return specs;
}
