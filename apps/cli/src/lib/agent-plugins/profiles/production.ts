import type { CreateClientOptions } from "@habitat-ai/rawr-agent-plugin-lifecycle/client";
import { createEmbeddedPlaceholderAnalyticsAdapter } from "@habitat-ai/rawr-hq-sdk/host-adapters/analytics/embedded-placeholder";
import { createEmbeddedPlaceholderLoggerAdapter } from "@habitat-ai/rawr-hq-sdk/host-adapters/logger/embedded-placeholder";
import { makeNodeAgentPluginPackageOutputResource } from "@habitat-ai/rawr-resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node";
import { makeNodeContentWorkspaceResource } from "@habitat-ai/rawr-resource-content-workspace/providers/git-effect-platform-node";
import { makeNodeClaudeNativeAgentProviderResource } from "@habitat-ai/rawr-resource-native-agent-provider/providers/claude-effect-platform-node";
import { makeNodeCodexNativeAgentProviderResource } from "@habitat-ai/rawr-resource-native-agent-provider/providers/codex-effect-platform-node";
import { makeNodeVersionedContentResource } from "@habitat-ai/rawr-resource-versioned-content/providers/git-effect-platform-node";

import type { NativeAgentProviderResourceFactories } from "../bindings/providers";

type LifecycleDeps = CreateClientOptions["deps"];
type DependencyFactory<TDependency> = () => TDependency;

/**
 * Cold app-owned selection of the concrete factories used by lifecycle
 * commands.
 *
 * @remarks
 * Importing this profile performs no resource construction or I/O. A validated
 * command materializes the selected factories once before constructing its
 * local lifecycle client.
 */
export type LifecycleProductionProfile = Readonly<{
  createLogger: DependencyFactory<LifecycleDeps["logger"]>;
  createAnalytics: DependencyFactory<LifecycleDeps["analytics"]>;
  createContentWorkspace: DependencyFactory<LifecycleDeps["contentWorkspace"]>;
  createClock: DependencyFactory<LifecycleDeps["clock"]>;
  createPackageOutput: DependencyFactory<LifecycleDeps["packageOutput"]>;
  nativeProviders: NativeAgentProviderResourceFactories;
  createVersionedContent: DependencyFactory<LifecycleDeps["versionedContent"]>;
}>;

/**
 * Exact production provider selection for the installed RAWR CLI.
 *
 * @remarks
 * The profile stores factory references only. Operation-owned resources retain
 * their existing acquisition and cleanup boundaries after materialization.
 */
export const productionLifecycleProfile: LifecycleProductionProfile = Object.freeze({
  createLogger: createEmbeddedPlaceholderLoggerAdapter,
  createAnalytics: createEmbeddedPlaceholderAnalyticsAdapter,
  createContentWorkspace: makeNodeContentWorkspaceResource,
  createClock: () => Object.freeze({ now: () => new Date() }),
  createPackageOutput: makeNodeAgentPluginPackageOutputResource,
  nativeProviders: Object.freeze({
    codex: makeNodeCodexNativeAgentProviderResource,
    claude: makeNodeClaudeNativeAgentProviderResource,
  }),
  createVersionedContent: makeNodeVersionedContentResource,
});
