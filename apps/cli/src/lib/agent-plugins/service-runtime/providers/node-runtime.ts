import type { ContentAuthority } from "@rawr/agent-plugin-lifecycle/release";
import type { Deps } from "@rawr/agent-plugin-lifecycle/client";
import {
  CLAUDE_ADAPTER_PROTOCOL,
  CODEX_ADAPTER_PROTOCOL,
  createResourceProviderRecordState,
  failure,
  issue,
  success,
  type NativeProviderMutationAction,
  type CanonicalNativeMutationAction,
  type ProviderId,
  type ProviderLifecycleRuntime,
  type AgentProviderProjection,
  type ProviderTarget,
  type ProviderTargetMutator,
  type ProviderTargetReader,
  type NativeProviderAdapter,
  type NativeProviderObserver,
  type CanonicalNativeObserver,
  type ProviderRecordState,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import { makeNodeAgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records/providers/effect-platform-node";

import { LifecycleAuthorityBindingError } from "../../commands/binding";
import { createNodeMechanicalEvidenceRuntime } from "../evidence/node-mechanical";
import {
  createNodeMarketplaceLocationResolver,
  createNodeCanonicalNativeObserver,
  createNodeNativeProviderAdapter,
  createNodeNativeProviderObserver,
} from "../../bindings/providers";
import { createProviderReleaseReader } from "./artifact-reader";

type ArtifactReader = Pick<Deps["releaseArtifacts"], "read">;

export function createNodeProviderLifecycleRuntime(options: Readonly<{
  currentMain: ProviderLifecycleRuntime["currentMain"];
  state: NodeProviderRecordState;
  artifactReader: ArtifactReader;
  artifactStoreRoot: Parameters<typeof createNodeMechanicalEvidenceRuntime>[0];
  providerExecutables: Readonly<Partial<Record<ProviderId, string>>>;
}>): ProviderLifecycleRuntime {
  const adapter = createNodeNativeProviderAdapterResolver(options.state, options.providerExecutables);
  const observer = createNodeNativeProviderObserverResolver(options.providerExecutables);
  const canonicalObserver = createNodeCanonicalNativeObserverResolver(
    options.providerExecutables,
  );
  return assembleRuntime(options, adapter, observer, canonicalObserver);
}

export interface NodeProviderRecordRoots {
  readonly controllerDataRoot: string;
  readonly providerProjectionRoot: string;
  readonly providerTargetStateRoot: string;
}

export type NodeProviderRecordState = ProviderRecordState & Readonly<{
  projectionRepositoryRoot: string;
}>;

/** One production resource owner for forward provider lifecycle. */
export function createNodeProviderRecordState(
  roots: NodeProviderRecordRoots,
): NodeProviderRecordState {
  const state = createResourceProviderRecordState({
    records: makeNodeAgentProviderRecordsAsyncPort({
      controllerDataRoot: roots.controllerDataRoot,
      projectionRoot: roots.providerProjectionRoot,
      targetRecordsRoot: roots.providerTargetStateRoot,
    }),
    trees: makeNodeArtifactRepositoryAsyncPort(),
    projectionRepositoryRoot: roots.providerProjectionRoot,
  });
  return Object.freeze({
    ...state,
    projectionRepositoryRoot: roots.providerProjectionRoot,
  });
}

export function createNodeNativeProviderAdapterResolver(
  state: NodeProviderRecordState,
  providerExecutables: Readonly<Partial<Record<ProviderId, string>>>,
): (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter {
  const adapters = new Map<string, NativeProviderAdapter>();
  const marketplaceLocations = createNodeMarketplaceLocationResolver(state.projectionRepositoryRoot);
  const adapter = (provider: ProviderId, contentAuthority: ContentAuthority) => {
    const key = `${provider}\0${contentAuthority}`;
    const existing = adapters.get(key);
    if (existing !== undefined) return existing;
    const executablePath = providerExecutables[provider];
    if (executablePath === undefined) {
      throw new LifecycleAuthorityBindingError(`${provider} requires an explicit provider executable binding`);
    }
    const common = {
      executablePath,
      contentAuthority,
      marketplaceSources: state.projections.marketplaceSources,
      marketplaceLocations,
    } as const;
    const created = createNodeNativeProviderAdapter({ ...common, provider });
    adapters.set(key, created);
    return created;
  };
  return adapter;
}

function createNodeNativeProviderObserverResolver(
  providerExecutables: Readonly<Partial<Record<ProviderId, string>>>,
): (provider: ProviderId) => NativeProviderObserver {
  const observers = new Map<ProviderId, NativeProviderObserver>();
  return (provider) => {
    const existing = observers.get(provider);
    if (existing !== undefined) return existing;
    const executablePath = providerExecutables[provider];
    if (executablePath === undefined) {
      throw new LifecycleAuthorityBindingError(`${provider} requires an explicit provider executable binding`);
    }
    const created = createNodeNativeProviderObserver({ provider, executablePath });
    observers.set(provider, created);
    return created;
  };
}

function createNodeCanonicalNativeObserverResolver(
  providerExecutables: Readonly<Partial<Record<ProviderId, string>>>,
): (provider: ProviderId, contentAuthority: ContentAuthority) => CanonicalNativeObserver {
  const observers = new Map<string, CanonicalNativeObserver>();
  return (provider, contentAuthority) => {
    const key = `${provider}\0${contentAuthority}`;
    const existing = observers.get(key);
    if (existing !== undefined) return existing;
    const executablePath = providerExecutables[provider];
    if (executablePath === undefined) {
      throw new LifecycleAuthorityBindingError(
        `${provider} requires an explicit provider executable binding`,
      );
    }
    const created = createNodeCanonicalNativeObserver({
      provider,
      executablePath,
      contentAuthority,
    });
    observers.set(key, created);
    return created;
  };
}

function createProviderReader(
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
  observer: (provider: ProviderId) => NativeProviderObserver,
): ProviderTargetReader {
  const providerReader: ProviderTargetReader = {
    projectionAdapterProtocol(target: ProviderTarget) {
      return target.provider === "codex"
        ? success(CODEX_ADAPTER_PROTOCOL)
        : target.provider === "claude"
          ? success(CLAUDE_ADAPTER_PROTOCOL)
          : failure([issue("UNSUPPORTED_PROVIDER", "target.provider", "Unsupported native provider")]);
    },
    async inspectCapabilities(target: ProviderTarget, contentAuthority?: ContentAuthority) {
      return await inspectionAdapter(adapter, observer, target, contentAuthority).inspectCapabilities(target);
    },
    async readInventory(target: ProviderTarget, contentAuthority?: ContentAuthority) {
      return await inspectionAdapter(adapter, observer, target, contentAuthority).readInventory(target);
    },
    async verifyProjection(target: ProviderTarget, projection: AgentProviderProjection) {
      return await adapter(target.provider, projection.artifactAuthority.contentAuthority)
        .verifyProjection(target, projection);
    },
  };
  return Object.freeze(providerReader);
}

function createProviderMutator(
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
): ProviderTargetMutator {
  const providerMutator: ProviderTargetMutator = {
    async apply(action: NativeProviderMutationAction) {
      const authority = mutationAuthority(action);
      return await adapter(action.target.provider, authority).apply(action);
    },
  };
  return Object.freeze(providerMutator);
}

function assembleRuntime(
  options: Parameters<typeof createNodeProviderLifecycleRuntime>[0],
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
  observer: (provider: ProviderId) => NativeProviderObserver,
  canonicalObserver: (
    provider: ProviderId,
    contentAuthority: ContentAuthority,
  ) => CanonicalNativeObserver,
): ProviderLifecycleRuntime {
  const { state } = options;
  const reader = createProviderReader(adapter, observer);
  const mutator = createProviderMutator(adapter);
  const canonicalNative: ProviderLifecycleRuntime["canonicalNative"] = Object.freeze({
    async inspectCapabilities(target: ProviderTarget, contentAuthority: ContentAuthority) {
      return await adapter(target.provider, contentAuthority).inspectCapabilities(target);
    },
    async observe(target: ProviderTarget, contentAuthority: ContentAuthority) {
      return await canonicalObserver(target.provider, contentAuthority).observe(
        target,
        contentAuthority,
      );
    },
    async apply(action: CanonicalNativeMutationAction) {
      const authority = canonicalMutationAuthority(action);
      return await adapter(action.target.provider, authority).applyCanonical(action);
    },
  });
  const runtime: ProviderLifecycleRuntime = {
    currentMain: options.currentMain,
    canonicalNative,
    releases: createProviderReleaseReader(options.artifactReader),
    provider: reader,
    providerMutator: mutator,
    receipts: state.targets.receipts,
    receiptWriter: state.targets.receipts,
    identities: Object.freeze({
      read: state.targets.identities.read,
      readAll: state.targets.completeIdentities.readAll,
    }),
    identityWriter: state.targets.identities,
    projectionMaterializer: state.projections.projectionMaterializer,
    marketplaceMaterializer: state.projections.marketplaceMaterializer,
    evidence: createNodeMechanicalEvidenceRuntime(options.artifactStoreRoot).provider,
  };
  return Object.freeze(runtime);
}

function inspectionAdapter(
  factory: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
  observer: (provider: ProviderId) => NativeProviderObserver,
  target: ProviderTarget,
  contentAuthority: ContentAuthority | undefined,
): NativeProviderObserver {
  return contentAuthority === undefined
    ? observer(target.provider)
    : factory(target.provider, contentAuthority);
}

function mutationAuthority(action: NativeProviderMutationAction): ContentAuthority {
  if (action.kind === "SetMarketplace") {
    const authority = action.registration?.marketplaceIdentity
      ?? (action.expected.kind === "present" ? action.expected.state.marketplaceIdentity : undefined);
    if (authority === undefined) {
      throw new LifecycleAuthorityBindingError("Marketplace mutation has no admitted content authority");
    }
    return authority;
  }
  return action.member.artifactAuthority.contentAuthority;
}

function canonicalMutationAuthority(action: CanonicalNativeMutationAction): ContentAuthority {
  if (action.kind === "RetireConfiguredExposure") {
    return action.exposure.providerSourceIdentity;
  }
  return mutationAuthority(action);
}
