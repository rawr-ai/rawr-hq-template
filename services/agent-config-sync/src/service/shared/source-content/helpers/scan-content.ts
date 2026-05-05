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
    content.hooks = hookFiles.filter((hook) => !isHookConfigFile(hook.name) && !isHookDocumentationFile(hook.name));
    content.hookConfigs = hookFiles.filter((hook) => isHookConfigFile(hook.name));
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

function isHookDocumentationFile(name: string): boolean {
  const basename = name.split(/[\\/]/).pop()?.toLowerCase() ?? name.toLowerCase();
  return basename.endsWith(".md");
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
