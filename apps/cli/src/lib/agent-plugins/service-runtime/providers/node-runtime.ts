import type { ContentAuthority } from "@rawr/agent-plugin-lifecycle/release";
import {
  CLAUDE_ADAPTER_PROTOCOL,
  CODEX_ADAPTER_PROTOCOL,
  failure,
  issue,
  success,
  type NativeProviderMutationAction,
  type ProviderId,
  type ProviderLifecycleRuntime,
  type ProviderMarketplaceRegistration,
  type ProviderMarketplaceSourceReader,
  type AgentProviderProjection,
  type ProviderTarget,
  type ProviderTargetMutator,
  type ProviderTargetReader,
  type ProviderUndoWriter,
  type NativeProviderAdapter,
} from "@rawr/agent-plugin-lifecycle/ports/providers";
import type { ArtifactReader } from "@rawr/agent-plugin-lifecycle/ports/releases";

import { LifecycleAuthorityBindingError } from "../../commands/binding";
import {
  CapsuleControllerWriterV1,
  createAgentPluginOwnerProtocolRegistryV1,
  openNodeCapsuleStateStoreV1,
} from "../../undo";
import { createNodeMechanicalEvidenceRuntime } from "../evidence/node-mechanical";
import {
  createNodeMarketplaceLocationResolver,
  createNodeNativeProviderAdapter,
} from "../../bindings/providers";
import { createProviderReleaseReader } from "./artifact-reader";
import {
  createNodeProviderOwnerRuntime,
  openNodeProviderState,
  type NativeMemberRestorationPort,
  type NodeRuntimeRoots,
  type NodeProviderState,
} from "./node-state";
import { createProviderOwnerProtocolRegistration } from "./owner-protocol";
import { createProviderUndoWriterV1 } from "./provider-capsule";

export async function createNodeProviderLifecycleRuntime(options: Readonly<{
  roots: NodeRuntimeRoots;
  artifactReader: ArtifactReader;
  artifactStoreRoot: Parameters<typeof createNodeMechanicalEvidenceRuntime>[0];
  capsuleRoot: Parameters<typeof openNodeCapsuleStateStoreV1>[0]["root"];
  providerExecutables: Readonly<Partial<Record<ProviderId, string>>>;
}>): Promise<ProviderLifecycleRuntime> {
  const state = await openNodeProviderState(options.roots);
  const adapter = createNodeNativeProviderAdapterResolver(state, options.providerExecutables);
  return await assembleRuntime(options, state, adapter);
}

export function createNodeNativeProviderAdapterResolver(
  state: NodeProviderState,
  providerExecutables: Readonly<Partial<Record<ProviderId, string>>>,
): (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter & NativeMemberRestorationPort {
  const adapters = new Map<string, NativeProviderAdapter & NativeMemberRestorationPort>();
  const marketplaceSourcePort: ProviderMarketplaceSourceReader = {
    read: async (target: ProviderTarget, registration: ProviderMarketplaceRegistration) =>
      await state.projections.readMarketplace({ target, registration }),
  };
  const marketplaceSources = Object.freeze(marketplaceSourcePort);
  const marketplaceLocations = createNodeMarketplaceLocationResolver(state.layout.projection.root);
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
      marketplaceSources,
      marketplaceLocations,
    } as const;
    const created = createNodeNativeProviderAdapter({ ...common, provider });
    adapters.set(key, created);
    return created;
  };
  return adapter;
}

function createProviderReader(
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
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
      return await exactAdapter(adapter, target, contentAuthority).inspectCapabilities(target, contentAuthority);
    },
    async readInventory(target: ProviderTarget, contentAuthority?: ContentAuthority) {
      return await exactAdapter(adapter, target, contentAuthority).readInventory(target, contentAuthority);
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

function createLazyProviderUndoWriter(
  state: NodeProviderState,
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter & NativeMemberRestorationPort,
  capsuleRoot: Parameters<typeof openNodeCapsuleStateStoreV1>[0]["root"],
): ProviderUndoWriter {
  let resolved: Promise<ProviderUndoWriter> | undefined;
  const resolve = () => resolved ??= openProviderUndoWriter(state, adapter, capsuleRoot);
  return Object.freeze({
    async preflight(candidate: Parameters<ProviderUndoWriter["preflight"]>[0]) {
      return (await resolve()).preflight(candidate);
    },
    async begin(candidate: Parameters<ProviderUndoWriter["begin"]>[0]) {
      return (await resolve()).begin(candidate);
    },
  });
}

async function openProviderUndoWriter(
  state: NodeProviderState,
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter & NativeMemberRestorationPort,
  capsuleRoot: Parameters<typeof openNodeCapsuleStateStoreV1>[0]["root"],
): Promise<ProviderUndoWriter> {
  const ownerRuntime = createNodeProviderOwnerRuntime({
    projections: state.projections,
    targets: state.targets,
    members: (provider, contentAuthority) => adapter(provider, contentAuthority),
  });
  const providerRegistration = createProviderOwnerProtocolRegistration(ownerRuntime);
  const registry = createAgentPluginOwnerProtocolRegistryV1({}, providerRegistration);
  const opened = await openNodeCapsuleStateStoreV1({ root: capsuleRoot, registry });
  if (opened.kind === "Rejected") throw new LifecycleAuthorityBindingError(opened.failure.message);
  return createProviderUndoWriterV1(new CapsuleControllerWriterV1({
    store: opened.store,
    registry,
  }));
}

async function assembleRuntime(
  options: Parameters<typeof createNodeProviderLifecycleRuntime>[0],
  state: NodeProviderState,
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter & NativeMemberRestorationPort,
): Promise<ProviderLifecycleRuntime> {
  const reader = createProviderReader(adapter);
  const mutator = createProviderMutator(adapter);
  const undoWriter = createLazyProviderUndoWriter(state, adapter, options.capsuleRoot);
  const runtime: ProviderLifecycleRuntime = {
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
    projectionMaterializer: state.projections,
    marketplaceMaterializer: Object.freeze({
      materialize: (provider: ProviderId, registration: ProviderMarketplaceRegistration) =>
        state.projections.materializeMarketplace(provider, registration),
    }),
    priorProjections: state.projections,
    undoWriter,
    evidence: createNodeMechanicalEvidenceRuntime(options.artifactStoreRoot).provider,
  };
  return Object.freeze(runtime);
}

function exactAdapter(
  factory: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter,
  target: ProviderTarget,
  contentAuthority: ContentAuthority | undefined,
): NativeProviderAdapter {
  if (contentAuthority === undefined) {
    throw new LifecycleAuthorityBindingError("Native provider inspection requires verified content authority");
  }
  return factory(target.provider, contentAuthority);
}

function mutationAuthority(action: NativeProviderMutationAction): ContentAuthority {
  if (action.kind === "SetMarketplace") {
    const authority = action.registration?.marketplaceIdentity
      ?? action.priorRegistration?.marketplaceIdentity;
    if (authority === undefined) {
      throw new LifecycleAuthorityBindingError("Marketplace mutation has no admitted content authority");
    }
    return authority;
  }
  return action.kind === "RetireMember"
    ? action.prior.artifactAuthority.contentAuthority
    : action.member.artifactAuthority.contentAuthority;
}
