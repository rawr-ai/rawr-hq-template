import path from "node:path";

import type { NormalizedInclude } from "./plugin-content";
import { readPluginYaml } from "./plugin-yaml";
import { scanCanonicalContentAtRoot } from "./scan-canonical-content";
import type { SourceContent, SourcePlugin } from "./types";
import { findWorkspaceRoot, listWorkspacePluginDirs, loadSourcePluginFromPath } from "./workspace";

const includeAll: NormalizedInclude = { workflows: true, skills: true, scripts: true, agents: true };

function namespaceForToolkit(toolkitDirName: string): string {
  // Keep it stable and filesystem-safe; dirName is already the on-disk slug.
  return toolkitDirName;
}

function assertUnique(kind: string, names: string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) throw new Error(`tools composition produced duplicate ${kind}: ${name}`);
    seen.add(name);
  }
}

export type ToolsComposeConfig = {
  toolkits: "all" | string[];
};

export async function scanComposedToolsContent(input: { toolsPlugin: SourcePlugin; config?: ToolsComposeConfig }): Promise<SourceContent> {
  const { toolsPlugin, config } = input;

  const yaml = await readPluginYaml(toolsPlugin.absPath);
  const yamlImports = yaml.config?.imports?.toolkits;
  const effectiveConfig: ToolsComposeConfig | undefined =
    config ??
    (yamlImports
      ? { toolkits: yamlImports === "all" ? "all" : yamlImports }
      : undefined);

  const workspaceRoot = await findWorkspaceRoot(toolsPlugin.absPath);
  if (!workspaceRoot) {
    throw new Error(`Unable to locate workspace root for tools plugin at ${toolsPlugin.absPath}`);
  }

  const pluginDirs = await listWorkspacePluginDirs(workspaceRoot);
  const toolkits: SourcePlugin[] = [];

  for (const absPath of pluginDirs) {
    const dirName = path.basename(absPath);
    const sourcePlugin = (await loadSourcePluginFromPath(dirName, absPath)) as SourcePlugin;
    if (sourcePlugin.rawrKind !== "toolkit") continue;
    toolkits.push(sourcePlugin);
  }

  toolkits.sort((a, b) => a.dirName.localeCompare(b.dirName));

  const selected =
    effectiveConfig?.toolkits === undefined || effectiveConfig.toolkits === "all"
      ? toolkits
      : toolkits.filter(
          (t) =>
            (effectiveConfig.toolkits as string[]).includes(t.dirName) ||
            (t.packageName ? (effectiveConfig.toolkits as string[]).includes(t.packageName) : false),
        );

  const content: SourceContent = { workflowFiles: [], skills: [], scripts: [], agentFiles: [] };

  for (const toolkit of selected) {
    const t = namespaceForToolkit(toolkit.dirName);
    const agentPackRoot = path.join(toolkit.absPath, "agent-pack");
    const toolkitContent = await scanCanonicalContentAtRoot(agentPackRoot, includeAll);

    for (const w of toolkitContent.workflowFiles) {
      content.workflowFiles.push({ name: `${t}--${w.name}`, absPath: w.absPath });
    }
    for (const s of toolkitContent.skills) {
      content.skills.push({ name: `toolkit-${t}-${s.name}`, absPath: s.absPath });
    }
    for (const a of toolkitContent.agentFiles) {
      content.agentFiles.push({ name: `${t}--${a.name}`, absPath: a.absPath });
    }
    for (const sc of toolkitContent.scripts) {
      content.scripts.push({ name: `${t}--${sc.name}`, absPath: sc.absPath });
    }
  }

  content.workflowFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.skills.sort((a, b) => a.name.localeCompare(b.name));
  content.agentFiles.sort((a, b) => a.name.localeCompare(b.name));
  content.scripts.sort((a, b) => a.name.localeCompare(b.name));

  assertUnique("workflow", content.workflowFiles.map((w) => w.name));
  assertUnique("skill", content.skills.map((s) => s.name));
  assertUnique("agent", content.agentFiles.map((a) => a.name));
  assertUnique("script", content.scripts.map((s) => s.name));

  return content;
}
