import type { NativeAgentProviderResources } from "@habitat-ai/rawr-resource-native-agent-provider";

/**
 * Exact factories selected by an app for the closed native provider catalog.
 */
export type NativeAgentProviderResourceFactories = Readonly<{
  codex: () => NativeAgentProviderResources["codex"];
  claude: () => NativeAgentProviderResources["claude"];
}>;

/**
 * Materializes the app-selected closed catalog of native provider resources.
 *
 * @remarks
 * Provider resources remain cold after construction. They resolve the
 * operator's ordinary `codex` and `claude` commands only when a service
 * operation acquires an explicit provider home.
 */
export function createNativeAgentProviderResources(
  factories: NativeAgentProviderResourceFactories
): NativeAgentProviderResources {
  return Object.freeze({
    codex: factories.codex(),
    claude: factories.claude(),
  });
}
