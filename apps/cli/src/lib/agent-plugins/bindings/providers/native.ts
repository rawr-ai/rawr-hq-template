import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
  NativeAgentProviderFailure,
  NativeAgentProviderResource,
  NativeAgentProviderResources,
} from "@rawr/resource-native-agent-provider";
import { makeNodeClaudeNativeAgentProviderResource } from "@rawr/resource-native-agent-provider/providers/claude-effect-platform-node";
import { makeNodeCodexNativeAgentProviderResource } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";
import { Effect } from "effect";

type ProviderExecutables = Readonly<Partial<Record<"claude" | "codex", string>>>;

/**
 * Constructs the app-owned closed catalog of ready native provider resources.
 *
 * @remarks
 * A missing executable remains a typed failing resource so the catalog cannot
 * become partial or infer another provider at operation time.
 */
export function createNodeNativeAgentProviderResources(
  providerExecutables: ProviderExecutables
): NativeAgentProviderResources {
  return Object.freeze({
    codex:
      providerExecutables.codex === undefined
        ? unboundCodexResource()
        : makeNodeCodexNativeAgentProviderResource({
            executablePath: providerExecutables.codex,
          }),
    claude:
      providerExecutables.claude === undefined
        ? unboundClaudeResource()
        : makeNodeClaudeNativeAgentProviderResource({
            executablePath: providerExecutables.claude,
          }),
  });
}

function unboundCodexResource(): NativeAgentProviderResource<
  CodexNativeAgentProviderSession,
  never
> {
  return Object.freeze({
    acquire: () => Effect.fail(unboundFailure("codex")),
  });
}

function unboundClaudeResource(): NativeAgentProviderResource<
  ClaudeNativeAgentProviderSession,
  never
> {
  return Object.freeze({
    acquire: () => Effect.fail(unboundFailure("claude")),
  });
}

function unboundFailure(provider: "claude" | "codex"): NativeAgentProviderFailure {
  return Object.freeze({
    _tag: "NativeAgentProviderFailure",
    provider,
    operation: "acquire",
    reason: "Missing",
    commandPhase: "not-started",
    detail: `Native ${provider} executable is not bound`,
  });
}
