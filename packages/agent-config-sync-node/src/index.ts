export { createNodeAgentConfigSyncResources } from "./resources";
export { installAndEnableClaudePlugin, ensureClaudeMarketplace, defaultClaudePluginsDir } from "./claude-cli";
export { installCodexMarketplacePlugins, resolveCodexBin } from "./codex-cli";
export { resolveInstallScope } from "./install-scope";
export { packageCodexPlugin } from "./codex-package";
export { packageCoworkPlugin } from "./cowork-package";
export type { ClaudeInstallAction, ExecFn } from "./claude-cli";
export type { CodexInstallAction, CodexInstallResult } from "./codex-cli";
export type { InstallScope } from "./install-scope";
export type { CodexPackageResult } from "./codex-package";
export type { CoworkPackageResult } from "./cowork-package";
export type {
  AgentConfigSyncDestinationConfig,
  AgentConfigSyncHostResolvedConfig,
  AgentConfigSyncProvider,
  AgentConfigSyncProviderConfig,
  HostSourceContent,
  HostSourcePlugin,
  SourceContent,
  SourcePlugin,
} from "./types";
