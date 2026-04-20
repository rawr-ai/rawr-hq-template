import { parse as parseYaml } from "yaml";
import type { AgentConfigSyncResources } from "../../resources";
import type { SourceContent, SourcePlugin } from "../../entities";
import type { NormalizedPluginContentInclude } from "../entities";
import { scanCanonicalContentAtRoot } from "./scan-content";

/**
 * Narrows parsed YAML so tool composition can read plugin.yaml defensively.
 */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/**
 * Reads the optional plugin.yaml toolkit import list for the composed tools
 * plugin. Undefined means "use the default composition policy"; "all" imports
 * every toolkit plugin.
 */
async function readPluginYamlToolkits(input: {
  pluginAbsPath: string;
  resources: AgentConfigSyncResources;
}): Promise<"all" | string[] | undefined> {
  const filePath = input.resources.path.join(input.pluginAbsPath, "plugin.yaml");
  const raw = await input.resources.files.readTextFile(filePath);
  if (raw === null) return undefined;
  const parsed = parseYaml(raw);
  const config = asRecord(parsed);
  if (config?.version !== 1) {
    throw new Error(`Invalid plugin.yaml in ${filePath}: expected version: 1`);
  }
  const imports = asRecord(config.imports);
  const toolkits = imports?.toolkits;
  if (toolkits === "all") return "all";
  if (Array.isArray(toolkits) && toolkits.every((item) => typeof item === "string" && item.length > 0)) {
    return [...toolkits];
  }
  if (toolkits === undefined) return undefined;
  throw new Error(`Invalid plugin.yaml imports.toolkits in ${filePath}`);
}

/**
 * Fails closed when composed content would produce ambiguous destination names.
 */
function assertUnique(kind: string, names: string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) throw new Error(`tools composition produced duplicate ${kind}: ${name}`);
    seen.add(name);
  }
}

/**
 * Builds effective source content for the composed tools plugin from selected
 * toolkit plugins. This is agent-config-sync policy because it determines what
 * gets mirrored into Codex/Claude homes.
 */
export async function scanComposedToolkitContent(input: {
  toolsPlugin: SourcePlugin;
  workspacePlugins: SourcePlugin[];
  resources: AgentConfigSyncResources;
}): Promise<SourceContent> {
  const yamlImports = await readPluginYamlToolkits({
    pluginAbsPath: input.toolsPlugin.absPath,
    resources: input.resources,
  });
  const toolkits = input.workspacePlugins
    .filter((sourcePlugin) => sourcePlugin.rawrKind === "toolkit")
    .sort((a, b) => a.dirName.localeCompare(b.dirName));
  const selectedToolkits =
    yamlImports === undefined || yamlImports === "all"
      ? toolkits
      : toolkits.filter((toolkit) =>
          yamlImports.includes(toolkit.dirName) ||
          (toolkit.packageName ? yamlImports.includes(toolkit.packageName) : false),
        );

  const content: SourceContent = {
    workflowFiles: [],
    skills: [],
    scripts: [],
    agentFiles: [],
  };
  const includeAll: NormalizedPluginContentInclude = {
    workflows: true,
    skills: true,
    scripts: true,
    agents: true,
  };

  for (const toolkit of selectedToolkits) {
    const toolkitContent = await scanCanonicalContentAtRoot({
      rootAbsPath: input.resources.path.join(toolkit.absPath, "agent-pack"),
      include: includeAll,
      resources: input.resources,
    });

    for (const workflow of toolkitContent.workflowFiles) {
      content.workflowFiles.push({ name: `${toolkit.dirName}--${workflow.name}`, absPath: workflow.absPath });
    }
    for (const skill of toolkitContent.skills) {
      content.skills.push({ name: `toolkit-${toolkit.dirName}-${skill.name}`, absPath: skill.absPath });
    }
    for (const agent of toolkitContent.agentFiles) {
      content.agentFiles.push({ name: `${toolkit.dirName}--${agent.name}`, absPath: agent.absPath });
    }
    for (const script of toolkitContent.scripts) {
      content.scripts.push({ name: `${toolkit.dirName}--${script.name}`, absPath: script.absPath });
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
