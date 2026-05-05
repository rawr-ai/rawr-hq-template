import type { AgentConfigSyncPathResources } from "../resources";

/**
 * Codex runtime path policy.
 *
 * @remarks
 * Codex keeps config, hooks, and custom agents under the selected Codex home,
 * but current skill discovery reads user skills from ~/.agents/skills.
 */

export function getCodexRetiredRootSkillsDir(codexHome: string, pathOps: AgentConfigSyncPathResources): string {
  return pathOps.join(codexHome, "skills");
}

export function getCodexRuntimeSkillsDir(codexHome: string, pathOps: AgentConfigSyncPathResources): string {
  const basename = pathOps.basename(codexHome);
  const userRoot = basename === ".codex" || basename === ".codex-rawr"
    ? pathOps.dirname(codexHome)
    : codexHome;
  return pathOps.join(userRoot, ".agents", "skills");
}

export function getCodexManagedMcpDir(
  codexHome: string,
  pluginName: string,
  pathOps: AgentConfigSyncPathResources,
): string {
  return pathOps.join(codexHome, "mcp", "rawr", pluginName);
}
