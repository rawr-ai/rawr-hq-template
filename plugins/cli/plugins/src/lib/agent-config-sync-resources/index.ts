export { ensureClaudeMarketplace, installAndEnableClaudePlugin, writeKnownMarketplacesForTests, defaultClaudePluginsDir, defaultExec, type ClaudeInstallAction, type ExecFn } from "./claude-cli";
export { packageCoworkPlugin, type CoworkPackageResult } from "./cowork-package";
export { effectiveContentForProvider, resolveDefaultCoworkOutDir } from "./effective-content";
export { clearPluginContentLayoutCacheForTests, resolvePluginContentLayout, type NormalizedInclude, type PluginContentLayout, type PluginContentManifestV1 } from "./plugin-content";
export { readPluginYaml, type PluginYamlV1 } from "./plugin-yaml";
export { resolveSourcePlugin } from "./resolve-source-plugin";
export { scanCanonicalContentAtRoot } from "./scan-canonical-content";
export { scanComposedToolsContent, type ToolsComposeConfig } from "./scan-tools-composed";
export { scanSourcePlugin } from "./scan-source-plugin";
export { resolveSourceScopeForPath, scopeAllows } from "./source-scope";
export { planSyncAll } from "./sync-all";
export { resolveTargets, type TargetHomes } from "./targets";
export { createNodeAgentConfigSyncResources } from "./resources";
export type {
  AgentConfigSyncDestinationConfig,
  AgentConfigSyncHostResolvedConfig,
  AgentConfigSyncProvider,
  AgentConfigSyncProviderConfig,
  HostSourceContent,
  HostSourcePlugin,
  RawrPluginKind,
} from "./types";
export {
  findWorkspaceRoot,
  listWorkspacePluginDirs,
  loadSourcePluginFromPath,
} from "./workspace";
