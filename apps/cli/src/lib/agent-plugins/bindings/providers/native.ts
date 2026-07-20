import { NodeContext } from "@effect/platform-node";
import type { Deps } from "@rawr/agent-plugin-lifecycle/client";
import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
  NativeAgentProviderFailure,
} from "@rawr/resource-native-agent-provider";
import { claudeEffectPlatformNodeProvider } from "@rawr/resource-native-agent-provider/providers/claude-effect-platform-node";
import { codexEffectPlatformNodeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";
import { Effect } from "effect";

type NativeProviderResourcePort = Deps["providerNativeResource"];
type NativeResourceSessionInput = Parameters<NativeProviderResourcePort["acquireCodex"]>[0];
type CodexNativeResourceSession = Awaited<ReturnType<NativeProviderResourcePort["acquireCodex"]>>;
type ClaudeNativeResourceSession = Awaited<ReturnType<NativeProviderResourcePort["acquireClaude"]>>;

/** Lowers the two native Effect Platform resources into the service's raw Promise port. */
export function createNodeNativeProviderResource(): NativeProviderResourcePort {
  return Object.freeze({
    acquireCodex: async (input: NativeResourceSessionInput) => adaptCodexSession(
      await runNodeProvider(codexEffectPlatformNodeProvider.acquire(input)),
    ),
    acquireClaude: async (input: NativeResourceSessionInput) => adaptClaudeSession(
      await runNodeProvider(claudeEffectPlatformNodeProvider.acquire(input)),
    ),
  });
}

function adaptCodexSession(
  session: CodexNativeAgentProviderSession,
): CodexNativeResourceSession {
  const adapted: CodexNativeResourceSession = {
    provider: session.provider,
    executablePath: session.executablePath,
    home: session.home,
    probe: () => runNodeProvider(session.probe()),
    listMarketplaces: () => runNodeProvider(session.listMarketplaces()),
    readMarketplace: (input) => runNodeProvider(session.readMarketplace(input)),
    addMarketplace: (source) => runNodeProvider(session.addMarketplace(source)),
    removeMarketplace: (input) => runNodeProvider(session.removeMarketplace(input)),
    listPlugins: () => runNodeProvider(session.listPlugins()),
    readPlugin: (input) => runNodeProvider(session.readPlugin(input)),
    addPlugin: (input) => runNodeProvider(session.addPlugin(input)),
    removePlugin: (input) => runNodeProvider(session.removePlugin(input)),
    inspectAppServer: () => runNodeProvider(session.inspectAppServer()),
    readConfiguration: () => runNodeProvider(session.readConfiguration()),
    setMarketplaceSource: (input) => runNodeProvider(session.setMarketplaceSource(input)),
  };
  return Object.freeze(adapted);
}

function adaptClaudeSession(
  session: ClaudeNativeAgentProviderSession,
): ClaudeNativeResourceSession {
  const adapted: ClaudeNativeResourceSession = {
    provider: session.provider,
    executablePath: session.executablePath,
    home: session.home,
    probe: () => runNodeProvider(session.probe()),
    listMarketplaces: () => runNodeProvider(session.listMarketplaces()),
    readMarketplace: (input) => runNodeProvider(session.readMarketplace(input)),
    addMarketplace: (source) => runNodeProvider(session.addMarketplace(source)),
    removeMarketplace: (input) => runNodeProvider(session.removeMarketplace(input)),
    listPlugins: () => runNodeProvider(session.listPlugins()),
    readPlugin: (input) => runNodeProvider(session.readPlugin(input)),
    installPlugin: (input) => runNodeProvider(session.installPlugin(input)),
    enablePlugin: (input) => runNodeProvider(session.enablePlugin(input)),
    uninstallPlugin: (input) => runNodeProvider(session.uninstallPlugin(input)),
    readConfiguration: () => runNodeProvider(session.readConfiguration()),
  };
  return Object.freeze(adapted);
}

async function runNodeProvider<A>(
  operation: Effect.Effect<A, NativeAgentProviderFailure, NodeContext.NodeContext>,
): Promise<A> {
  const result = await Effect.runPromise(operation.pipe(
    Effect.either,
    Effect.provide(NodeContext.layer),
  ));
  if (result._tag === "Left") {
    throw result.left;
  }
  return result.right;
}
