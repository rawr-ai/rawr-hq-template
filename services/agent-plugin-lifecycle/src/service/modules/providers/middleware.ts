import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";
import type { AgentProviderRecordsAsyncPort } from "@rawr/resource-agent-provider-records";

import {
  createServiceAnalyticsMiddleware,
  createServiceObservabilityMiddleware,
  createServiceProvider,
} from "../../base";
import type { CurrentMainSelectionReader } from "../../model/dependencies/current-main";
import type {
  NativeProviderExecutablePaths,
  NativeProviderResourcePort,
} from "../../model/dependencies/providers";
import type { ArtifactStore } from "../../model/dependencies/releases";
import type { MechanicalEvidenceStore } from "../../shared/release";
import type { VerifiedReleaseReader } from "./model/repositories/artifact";
import type { CanonicalNativeRuntime } from "./model/repositories/canonical-native";
import type { MechanicalEvidencePublisher } from "./model/repositories/evidence";
import type {
  ProviderTargetMutator,
  ProviderTargetReader,
} from "./model/repositories/provider";
import type {
  ProviderMarketplaceMaterializer,
  ProviderProjectionMaterializer,
  TargetIdentityReader,
  TargetIdentityWriter,
  TargetReceiptReader,
  TargetReceiptWriter,
} from "./model/repositories/state";
import { createResourceProviderReleaseReader } from "./repository/resource-artifact";
import {
  createResourceCanonicalNativeObserverResolver,
  createResourceCanonicalNativeRuntime,
  createResourceNativeProviderAdapterResolver,
  createResourceNativeProviderObserverResolver,
  createResourceProviderTargetMutator,
  createResourceProviderTargetReader,
} from "./repository/resource-context";
import { createResourceMechanicalEvidencePublisher } from "./repository/resource-evidence";
import { createResourceMarketplaceLocationResolver } from "./repository/resource-marketplace-location";
import { createResourceProviderRecordState } from "./repository/resource-record-storage";

export const resources = createServiceProvider<{
  deps: {
    artifactRepository: ArtifactRepositoryAsyncPort;
    providerRecords: AgentProviderRecordsAsyncPort;
    providerNativeResource: NativeProviderResourcePort;
    providerExecutables: NativeProviderExecutablePaths;
    providerProjectionRepositoryRoot: string;
  };
  provided: {
    artifactStore: ArtifactStore;
    currentMain: CurrentMainSelectionReader;
    mechanicalEvidenceStore: MechanicalEvidenceStore;
  };
}>().middleware<{
  native: CanonicalNativeRuntime;
  releases: VerifiedReleaseReader;
  provider: ProviderTargetReader;
  providerMutator: ProviderTargetMutator;
  receipts: TargetReceiptReader;
  receiptWriter: TargetReceiptWriter;
  identities: TargetIdentityReader;
  identityWriter: TargetIdentityWriter;
  projectionMaterializer: ProviderProjectionMaterializer;
  marketplaceMaterializer: ProviderMarketplaceMaterializer;
  evidence: MechanicalEvidencePublisher;
}>(async ({ context, next }) => {
  const state = createResourceProviderRecordState({
    records: context.deps.providerRecords,
    trees: context.deps.artifactRepository,
    projectionRepositoryRoot: context.deps.providerProjectionRepositoryRoot,
  });
  const marketplaceLocations = createResourceMarketplaceLocationResolver({
    repository: context.deps.artifactRepository,
    projectionRepositoryRoot: context.deps.providerProjectionRepositoryRoot,
  });
  const adapter = createResourceNativeProviderAdapterResolver(
    context.deps.providerExecutables,
    context.deps.providerNativeResource,
    state.projections.marketplaceSources,
    marketplaceLocations,
  );
  const observer = createResourceNativeProviderObserverResolver(
    context.deps.providerExecutables,
    context.deps.providerNativeResource,
  );
  const canonicalObserver = createResourceCanonicalNativeObserverResolver(
    context.deps.providerExecutables,
    context.deps.providerNativeResource,
  );
  return next({
    native: createResourceCanonicalNativeRuntime(adapter, canonicalObserver),
    releases: createResourceProviderReleaseReader(context.provided.artifactStore),
    provider: createResourceProviderTargetReader(adapter, observer),
    providerMutator: createResourceProviderTargetMutator(adapter),
    receipts: state.targets.receipts,
    receiptWriter: state.targets.receipts,
    identities: state.targets.identities,
    identityWriter: state.targets.identities,
    projectionMaterializer: state.projections.projectionMaterializer,
    marketplaceMaterializer: state.projections.marketplaceMaterializer,
    evidence: createResourceMechanicalEvidencePublisher(context.provided.mechanicalEvidenceStore),
  });
});

export const observability = createServiceObservabilityMiddleware({
  spanAttributes: ({ context }) => ({
    invocation_trace_id: context.invocation.traceId,
    invocation_command_id: context.invocation.commandId,
  }),
});

export const analytics = createServiceAnalyticsMiddleware({
  payload: ({ context }) => ({
    analytics_trace_id: context.invocation.traceId,
    analytics_command_id: context.invocation.commandId,
  }),
});
