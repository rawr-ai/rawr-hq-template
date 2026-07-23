import { NodeServices } from "@effect/platform-node";
import type {
  ClaudeNativeProviderSession as ClaudePromiseSession,
  CodexNativeProviderSession as CodexPromiseSession,
  NativeProviderSession,
  NativeProviderSessionResolver,
} from "@rawr/agent-plugin-lifecycle/host";
import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
  NativeAgentProviderFailure,
  NativeMarketplaceSource,
  NativeProviderPluginFilesReadInput,
  NativeProviderPluginSelectorInput,
} from "@rawr/resource-native-agent-provider";
import { claudeEffectPlatformNodeProvider } from "@rawr/resource-native-agent-provider/providers/claude-effect-platform-node";
import { codexEffectPlatformNodeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";
import { Effect, Result } from "effect";

type NativeProviderTarget = Parameters<NativeProviderSessionResolver["acquire"]>[0];
type ProviderExecutables = Readonly<Partial<Record<"claude" | "codex", string>>>;

/** Lowers the exact native Effect resources into the service's Promise-facing sessions. */
export function createNodeNativeProviderSessionResolver(
  providerExecutables: ProviderExecutables
): NativeProviderSessionResolver {
  return Object.freeze({
    acquire: async (target: NativeProviderTarget): Promise<NativeProviderSession> => {
      const executablePath = providerExecutables[target.provider];
      if (executablePath === undefined) {
        throw new Error(`Native ${target.provider} executable is not bound`);
      }
      const input = Object.freeze({ executablePath, home: target.home });
      if (target.provider === "codex") {
        return adaptCodexSession(
          await runNodeProvider(codexEffectPlatformNodeProvider.acquire(input))
        );
      }
      return adaptClaudeSession(
        await runNodeProvider(claudeEffectPlatformNodeProvider.acquire(input))
      );
    },
  });
}

function adaptCodexSession(session: CodexNativeAgentProviderSession): CodexPromiseSession {
  return Object.freeze({
    provider: session.provider,
    executablePath: session.executablePath,
    home: session.home,
    probe: () => runNodeProvider(session.probe()),
    inventory: () => runNodeProvider(session.inventory()),
    readPluginFiles: (input: NativeProviderPluginFilesReadInput) =>
      runNodeProvider(session.readPluginFiles(input)),
    addMarketplace: (source: NativeMarketplaceSource) =>
      runNodeProvider(session.addMarketplace(source)),
    removeMarketplace: (input: Readonly<{ identity: string }>) =>
      runNodeProvider(session.removeMarketplace(input)),
    installPlugin: (input: NativeProviderPluginSelectorInput) =>
      runNodeProvider(session.installPlugin(input)),
    removePlugin: (input: NativeProviderPluginSelectorInput) =>
      runNodeProvider(session.removePlugin(input)),
  });
}

function adaptClaudeSession(session: ClaudeNativeAgentProviderSession): ClaudePromiseSession {
  return Object.freeze({
    provider: session.provider,
    executablePath: session.executablePath,
    home: session.home,
    probe: () => runNodeProvider(session.probe()),
    inventory: () => runNodeProvider(session.inventory()),
    readPluginFiles: (input: NativeProviderPluginFilesReadInput) =>
      runNodeProvider(session.readPluginFiles(input)),
    addMarketplace: (source: NativeMarketplaceSource) =>
      runNodeProvider(session.addMarketplace(source)),
    removeMarketplace: (input: Readonly<{ identity: string }>) =>
      runNodeProvider(session.removeMarketplace(input)),
    installPlugin: (input: NativeProviderPluginSelectorInput) =>
      runNodeProvider(session.installPlugin(input)),
    removePlugin: (input: NativeProviderPluginSelectorInput) =>
      runNodeProvider(session.removePlugin(input)),
    enablePlugin: (input: NativeProviderPluginSelectorInput) =>
      runNodeProvider(session.enablePlugin(input)),
  });
}

async function runNodeProvider<A>(
  operation: Effect.Effect<A, NativeAgentProviderFailure, NodeServices.NodeServices>
): Promise<A> {
  const result = await Effect.runPromise(
    operation.pipe(Effect.result, Effect.provide(NodeServices.layer))
  );
  if (Result.isFailure(result)) throw result.failure;
  return result.success;
}
