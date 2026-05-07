import type { SourceContent } from "../../entities";

/**
 * Merges provider overlays onto canonical source content by logical name.
 *
 * Overlay entries replace base entries with the same destination name, which
 * lets Codex and Claude customize content without duplicating scan logic.
 */
export function mergeSourceContent(base: SourceContent, overlay: SourceContent): SourceContent {
  const workflows = new Map(base.workflowFiles.map((workflow) => [workflow.name, workflow]));
  for (const workflow of overlay.workflowFiles) workflows.set(workflow.name, workflow);

  const skills = new Map(base.skills.map((skill) => [skill.name, skill]));
  for (const skill of overlay.skills) skills.set(skill.name, skill);

  const scripts = new Map(base.scripts.map((script) => [script.name, script]));
  for (const script of overlay.scripts) scripts.set(script.name, script);

  const agents = new Map(base.agentFiles.map((agent) => [agent.name, agent]));
  for (const agent of overlay.agentFiles) agents.set(agent.name, agent);

  const hooks = new Map((base.hooks ?? []).map((hook) => [hook.name, hook]));
  for (const hook of overlay.hooks ?? []) hooks.set(hook.name, hook);

  const hookConfigs = new Map((base.hookConfigs ?? []).map((hookConfig) => [hookConfig.name, hookConfig]));
  for (const hookConfig of overlay.hookConfigs ?? []) hookConfigs.set(hookConfig.name, hookConfig);

  const mcpServers = new Map((base.mcpServers ?? []).map((mcpServer) => [mcpServer.name, mcpServer]));
  for (const mcpServer of overlay.mcpServers ?? []) mcpServers.set(mcpServer.name, mcpServer);

  const settings = new Map((base.settings ?? []).map((setting) => [setting.name, setting]));
  for (const setting of overlay.settings ?? []) settings.set(setting.name, setting);

  const assets = new Map((base.assets ?? []).map((asset) => [asset.name, asset]));
  for (const asset of overlay.assets ?? []) assets.set(asset.name, asset);

  const orchestration = new Map((base.orchestration ?? []).map((spec) => [spec.name, spec]));
  for (const spec of overlay.orchestration ?? []) orchestration.set(spec.name, spec);

  return {
    workflowFiles: [...workflows.values()].sort((a, b) => a.name.localeCompare(b.name)),
    skills: [...skills.values()].sort((a, b) => a.name.localeCompare(b.name)),
    scripts: [...scripts.values()].sort((a, b) => a.name.localeCompare(b.name)),
    agentFiles: [...agents.values()].sort((a, b) => a.name.localeCompare(b.name)),
    hooks: [...hooks.values()].sort((a, b) => a.name.localeCompare(b.name)),
    hookConfigs: [...hookConfigs.values()].sort((a, b) => a.name.localeCompare(b.name)),
    mcpServers: [...mcpServers.values()].sort((a, b) => a.name.localeCompare(b.name)),
    settings: [...settings.values()].sort((a, b) => a.name.localeCompare(b.name)),
    assets: [...assets.values()].sort((a, b) => a.name.localeCompare(b.name)),
    orchestration: [...orchestration.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };
}
