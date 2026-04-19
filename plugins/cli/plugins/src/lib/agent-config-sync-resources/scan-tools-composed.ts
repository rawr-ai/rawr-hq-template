import path from "node:path";

import type { NormalizedInclude } from "./plugin-content";
import { readPluginYaml } from "./plugin-yaml";
import { scanCanonicalContentAtRoot } from "./scan-canonical-content";
import type { HostSourceContent, HostSourcePlugin } from "./types";
import {
  findWorkspaceRoot,
  listWorkspacePluginDirs,
  loadSourcePluginFromPath,
} from "./workspace";

const includeAll: NormalizedInclude = {
  workflows: true,
  skills: true,
  scripts: true,
  agents: true,
};

function namespaceForToolkit(toolkitDirName: string): string {
  return toolkitDirName;
}

function assertUnique(kind: string, names: string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      throw new Error(`tools composition produced duplicate ${kind}: ${name}`);
    }
    seen.add(name);
  }
}

export type ToolsComposeConfig = {
  toolkits: "all" | string[];
};

export async function scanComposedToolsContent(input: {
  toolsPlugin: HostSourcePlugin;
  config?: ToolsComposeConfig;
}): Promise<HostSourceContent> {
  const yaml = await readPluginYaml(input.toolsPlugin.absPath);
  const yamlImports = yaml.config?.imports?.toolkits;
  const effectiveConfig =
    input.config ??
    (yamlImports
      ? { toolkits: yamlImports === "all" ? "all" : yamlImports }
      : undefined);

  const workspaceRoot = await findWorkspaceRoot(input.toolsPlugin.absPath);
  if (!workspaceRoot) {
    throw new Error(
      `Unable to locate workspace root for tools plugin at ${input.toolsPlugin.absPath}`,
    );
  }

  const pluginDirs = await listWorkspacePluginDirs(workspaceRoot);
  const toolkits: HostSourcePlugin[] = [];

  for (const pluginDir of pluginDirs) {
    const dirName = path.basename(pluginDir);
    const sourcePlugin = await loadSourcePluginFromPath(dirName, pluginDir);
    if (sourcePlugin.rawrKind !== "toolkit") continue;
    toolkits.push(sourcePlugin);
  }

  toolkits.sort((a, b) => a.dirName.localeCompare(b.dirName));

  const selectedToolkits =
    effectiveConfig?.toolkits === undefined || effectiveConfig.toolkits === "all"
      ? toolkits
      : toolkits.filter((toolkit) => {
          const requested = effectiveConfig.toolkits as string[];
          return (
            requested.includes(toolkit.dirName) ||
            (toolkit.packageName ? requested.includes(toolkit.packageName) : false)
          );
        });

  const content: HostSourceContent = {
    workflowFiles: [],
    skills: [],
    scripts: [],
    agentFiles: [],
  };

  for (const toolkit of selectedToolkits) {
    const namespace = namespaceForToolkit(toolkit.dirName);
    const agentPackRoot = path.join(toolkit.absPath, "agent-pack");
    const toolkitContent = await scanCanonicalContentAtRoot(agentPackRoot, includeAll);

    for (const workflow of toolkitContent.workflowFiles) {
      content.workflowFiles.push({
        name: `${namespace}--${workflow.name}`,
        absPath: workflow.absPath,
      });
    }
    for (const skill of toolkitContent.skills) {
      content.skills.push({
        name: `toolkit-${namespace}-${skill.name}`,
        absPath: skill.absPath,
      });
    }
    for (const agent of toolkitContent.agentFiles) {
      content.agentFiles.push({
        name: `${namespace}--${agent.name}`,
        absPath: agent.absPath,
      });
    }
    for (const script of toolkitContent.scripts) {
      content.scripts.push({
        name: `${namespace}--${script.name}`,
        absPath: script.absPath,
      });
    }
  }

  content.workflowFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.skills.sort((a, b) => a.name.localeCompare(b.name));
  content.agentFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.scripts.sort((a, b) => a.name.localeCompare(b.name));

  assertUnique("workflow", content.workflowFiles.map((workflow) => workflow.name));
  assertUnique("skill", content.skills.map((skill) => skill.name));
  assertUnique("agent", content.agentFiles.map((agent) => agent.name));
  assertUnique("script", content.scripts.map((script) => script.name));

  return content;
}
