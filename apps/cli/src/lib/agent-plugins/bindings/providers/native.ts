import { NodeContext } from "@effect/platform-node";
import {
  createResourceClaudeProviderAdapter,
  createResourceCodexProviderAdapter,
  type ClaudeNativeResourceSession,
  type CodexNativeResourceSession,
  type NativeMemberRestorationPort,
  type NativeProviderAdapter,
  type NativeProviderResourcePort,
  type ProviderId,
  type ResourceClaudeProviderAdapterOptions,
  type ResourceCodexProviderAdapterOptions,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
} from "@rawr/resource-native-agent-provider";
import { claudeEffectPlatformNodeProvider } from "@rawr/resource-native-agent-provider/providers/claude-effect-platform-node";
import { codexEffectPlatformNodeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";
import { Effect } from "effect";

export type NodeNativeProviderAdapter = NativeProviderAdapter & NativeMemberRestorationPort;

export type NodeNativeProviderBindingOptions = Omit<
  ResourceCodexProviderAdapterOptions & ResourceClaudeProviderAdapterOptions,
  "resource"
> & Readonly<{ provider: ProviderId }>;

/** Selects one Effect Platform provider; all lifecycle interpretation stays in the service. */
export function createNodeNativeProviderAdapter(
  options: NodeNativeProviderBindingOptions,
): NodeNativeProviderAdapter {
  const common = Object.freeze({
    resource: nodeNativeProviderResource,
    executablePath: options.executablePath,
    marketplaceSourceRoot: options.marketplaceSourceRoot,
    contentAuthority: options.contentAuthority,
    marketplaceSources: options.marketplaceSources,
    projectionSources: options.projectionSources,
  });
  return options.provider === "codex"
    ? createResourceCodexProviderAdapter(common)
    : createResourceClaudeProviderAdapter(common);
}

const nativeProviderResource: NativeProviderResourcePort = {
  acquireCodex: async (input) => adaptCodexSession(await runNodeProvider(
    codexEffectPlatformNodeProvider.acquire(input),
  )),
  acquireClaude: async (input) => adaptClaudeSession(await runNodeProvider(
    claudeEffectPlatformNodeProvider.acquire(input),
  )),
};

export const nodeNativeProviderResource = Object.freeze(nativeProviderResource);

function adaptCodexSession(session: CodexNativeAgentProviderSession): CodexNativeResourceSession {
  const adapted: CodexNativeResourceSession = {
    provider: session.provider,
    executablePath: session.executablePath,
    home: session.home,
    probe: () => runNodeProvider(session.probe()),
    listMarketplaces: () => runNodeProvider(session.listMarketplaces()),
    addMarketplace: (input) => runNodeProvider(session.addMarketplace(input)),
    removeMarketplace: (input) => runNodeProvider(session.removeMarketplace(input)),
    listPlugins: () => runNodeProvider(session.listPlugins()),
    readPackage: (input) => runNodeProvider(session.readPackage(input)),
    addPlugin: (input) => runNodeProvider(session.addPlugin(input)),
    removePlugin: (input) => runNodeProvider(session.removePlugin(input)),
    inspectAppServer: () => runNodeProvider(session.inspectAppServer()),
    readConfiguration: () => runNodeProvider(session.readConfiguration()),
    setMarketplaceSource: (input) => runNodeProvider(session.setMarketplaceSource(input)),
    setPluginEnabled: (input) => runNodeProvider(session.setPluginEnabled(input)),
  };
  return Object.freeze(adapted);
}

function adaptClaudeSession(session: ClaudeNativeAgentProviderSession): ClaudeNativeResourceSession {
  const adapted: ClaudeNativeResourceSession = {
    provider: session.provider,
    executablePath: session.executablePath,
    home: session.home,
    probe: () => runNodeProvider(session.probe()),
    listMarketplaces: () => runNodeProvider(session.listMarketplaces()),
    addMarketplace: (input) => runNodeProvider(session.addMarketplace(input)),
    removeMarketplace: (input) => runNodeProvider(session.removeMarketplace(input)),
    listPlugins: () => runNodeProvider(session.listPlugins()),
    readPackage: (input) => runNodeProvider(session.readPackage(input)),
    installPlugin: (input) => runNodeProvider(session.installPlugin(input)),
    enablePlugin: (input) => runNodeProvider(session.enablePlugin(input)),
    disablePlugin: (input) => runNodeProvider(session.disablePlugin(input)),
    uninstallPlugin: (input) => runNodeProvider(session.uninstallPlugin(input)),
    readConfiguration: () => runNodeProvider(session.readConfiguration()),
  };
  return Object.freeze(adapted);
}

function runNodeProvider<A, E>(
  operation: Effect.Effect<A, E, NodeContext.NodeContext>,
): Promise<A> {
  return Effect.runPromise(operation.pipe(Effect.provide(NodeContext.layer)));
}
