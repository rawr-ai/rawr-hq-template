import type { NativeAgentProviderResources } from "@rawr/resource-native-agent-provider";
import { makeNodeClaudeNativeAgentProviderResource } from "@rawr/resource-native-agent-provider/providers/claude-effect-platform-node";
import { makeNodeCodexNativeAgentProviderResource } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";

/**
 * Constructs the app-owned closed catalog of ready native provider resources.
 *
 * @remarks
 * Concrete providers resolve the operator's ordinary `codex` and `claude`
 * commands only when an explicit provider home is acquired.
 */
export function createNodeNativeAgentProviderResources(): NativeAgentProviderResources {
  return Object.freeze({
    codex: makeNodeCodexNativeAgentProviderResource(),
    claude: makeNodeClaudeNativeAgentProviderResource(),
  });
}
