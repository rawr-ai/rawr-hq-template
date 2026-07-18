import { NodeContext } from "@effect/platform-node";
import {
  createResourceClaudeProviderAdapter,
  createResourceClaudeProviderObserver,
  createResourceCodexProviderAdapter,
  createResourceCodexProviderObserver,
  type ClaudeNativeResourceSession,
  type CodexNativeResourceSession,
  type NativeMemberRestorationPort,
  type NativeProviderAdapter,
  type NativeProviderObserver,
  type NativeProviderResourcePort,
  type NativeResourceSessionInput,
  type ProviderId,
  type ProviderMarketplaceSource,
  type ResourceClaudeProviderAdapterOptions,
  type ResourceCodexProviderAdapterOptions,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { MAX_RELEASE_SET_PAYLOAD_BYTES } from "@rawr/agent-plugin-lifecycle/bindings/releases";
import type {
  ArtifactObjectAddress,
  ArtifactReadLimits,
  ArtifactTreeLocation,
  ArtifactTreeLocationObservation,
} from "@rawr/resource-agent-plugin-artifact-repository";
import {
  artifactRepositoryResource,
  runNodeArtifactRepository,
} from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import type {
  ClaudeNativeAgentProviderSession,
  CodexNativeAgentProviderSession,
} from "@rawr/resource-native-agent-provider";
import { claudeEffectPlatformNodeProvider } from "@rawr/resource-native-agent-provider/providers/claude-effect-platform-node";
import { codexEffectPlatformNodeProvider } from "@rawr/resource-native-agent-provider/providers/codex-effect-platform-node";
import { Effect } from "effect";

import { LifecycleAuthorityBindingError } from "../../commands/binding";

const MARKETPLACE_TREE_LIMITS: ArtifactReadLimits = Object.freeze({
  maxEntries: 200_000,
  maxBytes: MAX_RELEASE_SET_PAYLOAD_BYTES,
});
const MARKETPLACE_NAMESPACE: ArtifactObjectAddress["namespace"] = Object.freeze(["marketplaces"]);

export type NodeNativeProviderAdapter = NativeProviderAdapter & NativeMemberRestorationPort;

export type NodeNativeProviderBindingOptions = Omit<
  ResourceCodexProviderAdapterOptions & ResourceClaudeProviderAdapterOptions,
  "resource"
> & Readonly<{
  provider: ProviderId;
  marketplaceLocations: NodeMarketplaceLocationResolver;
}>;

export interface NodeMarketplaceLocationResolver {
  readonly locate: (source: ProviderMarketplaceSource) => Promise<ArtifactTreeLocation>;
}

interface NodeMarketplaceTreeLocator {
  readonly locateTree: (input: Readonly<{
    address: ArtifactObjectAddress;
    limits: ArtifactReadLimits;
  }>) => Promise<ArtifactTreeLocationObservation>;
}

/** Resolves one admitted projection tree without exposing its location to service state. */
export function createNodeMarketplaceLocationResolver(
  projectionRoot: string,
  treeLocator: NodeMarketplaceTreeLocator = nodeMarketplaceTreeLocator,
): NodeMarketplaceLocationResolver {
  return Object.freeze({
    async locate(source: ProviderMarketplaceSource): Promise<ArtifactTreeLocation> {
      const address: ArtifactObjectAddress = Object.freeze({
        repositoryRoot: projectionRoot,
        namespace: MARKETPLACE_NAMESPACE,
        objectId: source.projectionDigest,
      });
      const observation = await treeLocator.locateTree({
        address,
        limits: MARKETPLACE_TREE_LIMITS,
      });
      if (observation.kind === "Present") return observation.location;
      if (observation.kind === "Missing") {
        throw new LifecycleAuthorityBindingError(
          `Marketplace projection ${source.projectionDigest} is not materialized`,
        );
      }
      throw new LifecycleAuthorityBindingError(
        `Marketplace projection ${source.projectionDigest} failed mechanical admission: ${observation.issues
          .map((entry) => entry.detail)
          .join("; ")}`,
      );
    },
  });
}

/** Selects one Effect Platform provider; all lifecycle interpretation stays in the service. */
export function createNodeNativeProviderAdapter(
  options: NodeNativeProviderBindingOptions,
): NodeNativeProviderAdapter {
  const common = Object.freeze({
    resource: createNodeNativeProviderResource(options.marketplaceLocations),
    executablePath: options.executablePath,
    contentAuthority: options.contentAuthority,
    marketplaceSources: options.marketplaceSources,
  });
  return options.provider === "codex"
    ? createResourceCodexProviderAdapter(common)
    : createResourceClaudeProviderAdapter(common);
}

/** Binds provider inspection without exposing content ownership or mutation. */
export function createNodeNativeProviderObserver(options: Readonly<{
  provider: ProviderId;
  executablePath: string;
}>): NativeProviderObserver {
  const common = Object.freeze({
    resource: createNodeNativeProviderResource(readOnlyMarketplaceLocations),
    executablePath: options.executablePath,
  });
  return options.provider === "codex"
    ? createResourceCodexProviderObserver(common)
    : createResourceClaudeProviderObserver(common);
}

export function createNodeNativeProviderResource(
  marketplaceLocations: NodeMarketplaceLocationResolver,
): NativeProviderResourcePort {
  return Object.freeze({
    acquireCodex: async (input: NativeResourceSessionInput) => adaptCodexSession(
      await runNodeProvider(codexEffectPlatformNodeProvider.acquire(input)),
      marketplaceLocations,
    ),
    acquireClaude: async (input: NativeResourceSessionInput) => adaptClaudeSession(
      await runNodeProvider(claudeEffectPlatformNodeProvider.acquire(input)),
      marketplaceLocations,
    ),
  });
}

function adaptCodexSession(
  session: CodexNativeAgentProviderSession,
  marketplaceLocations: NodeMarketplaceLocationResolver,
): CodexNativeResourceSession {
  const adapted: CodexNativeResourceSession = {
    provider: session.provider,
    executablePath: session.executablePath,
    home: session.home,
    probe: () => runNodeProvider(session.probe()),
    listMarketplaces: () => runNodeProvider(session.listMarketplaces()),
    readMarketplace: (input) => runNodeProvider(session.readMarketplace(input)),
    addMarketplace: async (source) => runNodeProvider(
      session.addMarketplace(await marketplaceLocations.locate(source)),
    ),
    removeMarketplace: (input) => runNodeProvider(session.removeMarketplace(input)),
    listPlugins: () => runNodeProvider(session.listPlugins()),
    readPlugin: (input) => runNodeProvider(session.readPlugin(input)),
    addPlugin: (input) => runNodeProvider(session.addPlugin(input)),
    removePlugin: (input) => runNodeProvider(session.removePlugin(input)),
    inspectAppServer: () => runNodeProvider(session.inspectAppServer()),
    readConfiguration: () => runNodeProvider(session.readConfiguration()),
    setMarketplaceSource: async (input) => runNodeProvider(session.setMarketplaceSource({
      identity: input.identity,
      source: await marketplaceLocations.locate(input.source),
    })),
    setPluginEnabled: (input) => runNodeProvider(session.setPluginEnabled(input)),
  };
  return Object.freeze(adapted);
}

function adaptClaudeSession(
  session: ClaudeNativeAgentProviderSession,
  marketplaceLocations: NodeMarketplaceLocationResolver,
): ClaudeNativeResourceSession {
  const adapted: ClaudeNativeResourceSession = {
    provider: session.provider,
    executablePath: session.executablePath,
    home: session.home,
    probe: () => runNodeProvider(session.probe()),
    listMarketplaces: () => runNodeProvider(session.listMarketplaces()),
    readMarketplace: (input) => runNodeProvider(session.readMarketplace(input)),
    addMarketplace: async (source) => runNodeProvider(
      session.addMarketplace(await marketplaceLocations.locate(source)),
    ),
    removeMarketplace: (input) => runNodeProvider(session.removeMarketplace(input)),
    listPlugins: () => runNodeProvider(session.listPlugins()),
    readPlugin: (input) => runNodeProvider(session.readPlugin(input)),
    installPlugin: (input) => runNodeProvider(session.installPlugin(input)),
    enablePlugin: (input) => runNodeProvider(session.enablePlugin(input)),
    disablePlugin: (input) => runNodeProvider(session.disablePlugin(input)),
    uninstallPlugin: (input) => runNodeProvider(session.uninstallPlugin(input)),
    readConfiguration: () => runNodeProvider(session.readConfiguration()),
  };
  return Object.freeze(adapted);
}

const nodeMarketplaceTreeLocator: NodeMarketplaceTreeLocator = Object.freeze({
  async locateTree(input: Parameters<NodeMarketplaceTreeLocator["locateTree"]>[0]) {
    const located = await runNodeArtifactRepository(artifactRepositoryResource.locateTree(input));
    if (!located.ok) {
      throw new LifecycleAuthorityBindingError(
        `Marketplace projection location failed: ${located.failure.detail}`,
      );
    }
    return located.value;
  },
});

const readOnlyMarketplaceLocations: NodeMarketplaceLocationResolver = Object.freeze({
  async locate(): Promise<never> {
    throw new LifecycleAuthorityBindingError("Read-only provider observation cannot locate mutation input");
  },
});

function runNodeProvider<A, E>(
  operation: Effect.Effect<A, E, NodeContext.NodeContext>,
): Promise<A> {
  return Effect.runPromise(operation.pipe(Effect.provide(NodeContext.layer)));
}
