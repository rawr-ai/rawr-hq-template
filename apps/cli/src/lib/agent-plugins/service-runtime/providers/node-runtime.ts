import type { ContentAuthority } from "@rawr/agent-plugin-lifecycle/release";
import {
  CLAUDE_ADAPTER_PROTOCOL,
  CODEX_ADAPTER_PROTOCOL,
  createProviderOwnerRuntime,
  createResourceProviderRecordState,
  failure,
  issue,
  success,
  type NativeProviderMutationAction,
  type ProviderId,
  type ProviderLifecycleRuntime,
  type AgentProviderProjection,
  type ProviderTarget,
  type ProviderTargetMutator,
  type ProviderTargetReader,
  type ProviderUndoWriter,
  type NativeProviderAdapter,
  type NativeMemberRestorationPort,
  type NativeProviderObserver,
  type ProviderRecordState,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import type { ArtifactReader } from "@rawr/agent-plugin-lifecycle/ports/releases";
import { makeNodeArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository/providers/effect-platform-node";
import { makeNodeAgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records/providers/effect-platform-node";

import { LifecycleAuthorityBindingError } from "../../commands/binding";
import {
  applyingRecoveryBlockingFailure,
  CapsuleControllerWriterV1,
  createAgentPluginOwnerProtocolRegistryV1,
  openNodeCapsuleStateStoreV1,
} from "../../undo";
import { createNodeMechanicalEvidenceRuntime } from "../evidence/node-mechanical";
import {
  createNodeMarketplaceLocationResolver,
  createNodeNativeProviderAdapter,
  createNodeNativeProviderObserver,
} from "../../bindings/providers";
import { createProviderReleaseReader } from "./artifact-reader";
import {
  createProviderOwnerProtocolRegistration,
} from "./owner-protocol";
import { createProviderUndoWriterV1 } from "./provider-capsule";

export async function createNodeProviderLifecycleRuntime(options: Readonly<{
  roots: NodeProviderRecordRoots;
  artifactReader: ArtifactReader;
  artifactStoreRoot: Parameters<typeof createNodeMechanicalEvidenceRuntime>[0];
  capsuleRoot: Parameters<typeof openNodeCapsuleStateStoreV1>[0]["root"];
  providerExecutables: Readonly<Partial<Record<ProviderId, string>>>;
}>): Promise<ProviderLifecycleRuntime> {
  const state = createNodeProviderRecordState(options.roots);
  const adapter = createNodeNativeProviderAdapterResolver(state, options.providerExecutables);
  const observer = createNodeNativeProviderObserverResolver(options.providerExecutables);
  return await assembleRuntime(options, state, adapter, observer);
}

export interface NodeProviderRecordRoots {
  readonly controllerDataRoot: string;
  readonly providerProjectionRoot: string;
  readonly providerTargetStateRoot: string;
}

export type NodeProviderRecordState = ProviderRecordState & Readonly<{
  projectionRepositoryRoot: string;
}>;

/** One production resource owner shared by forward lifecycle and controller undo. */
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
): (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter & NativeMemberRestorationPort {
  const adapters = new Map<string, NativeProviderAdapter & NativeMemberRestorationPort>();
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

function createLazyProviderUndoWriter(
  state: NodeProviderRecordState,
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
  state: NodeProviderRecordState,
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter & NativeMemberRestorationPort,
  capsuleRoot: Parameters<typeof openNodeCapsuleStateStoreV1>[0]["root"],
): Promise<ProviderUndoWriter> {
  const ownerRuntime = createProviderOwnerRuntime({
    projections: state.projections,
    targets: state.targets,
    members: (provider, contentAuthority) => adapter(provider, contentAuthority),
  });
  const providerRegistration = createProviderOwnerProtocolRegistration(ownerRuntime);
  const registry = createAgentPluginOwnerProtocolRegistryV1({}, providerRegistration);
  const opened = await openNodeCapsuleStateStoreV1({ root: capsuleRoot, registry });
  if (opened.kind === "Rejected") throw new LifecycleAuthorityBindingError(opened.failure.message);
  const controller = new CapsuleControllerWriterV1({
    store: opened.store,
    registry,
  });
  const recovery = await controller.recoverApplying();
  const recoveryFailure = applyingRecoveryBlockingFailure(recovery);
  if (recoveryFailure !== null) {
    throw new LifecycleAuthorityBindingError(recoveryFailure.message);
  }
  return createProviderUndoWriterV1(controller);
}

async function assembleRuntime(
  options: Parameters<typeof createNodeProviderLifecycleRuntime>[0],
  state: NodeProviderRecordState,
  adapter: (provider: ProviderId, contentAuthority: ContentAuthority) => NativeProviderAdapter & NativeMemberRestorationPort,
  observer: (provider: ProviderId) => NativeProviderObserver,
): Promise<ProviderLifecycleRuntime> {
  const reader = createProviderReader(adapter, observer);
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
    projectionMaterializer: state.projections.projectionMaterializer,
    marketplaceMaterializer: state.projections.marketplaceMaterializer,
    priorProjections: state.projections.priorProjections,
    undoWriter,
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
