import {
  createMechanicalEvidenceHandle,
  type ArtifactRef,
} from "@rawr/agent-plugin-lifecycle/release";
import type { Deps } from "@rawr/agent-plugin-lifecycle/client";
import {
  createResourceCompleteTargetIdentityReader,
  type CompleteTargetIdentityReader,
} from "@rawr/agent-plugin-lifecycle/bindings/providers";
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";

// @ts-expect-error Artifact and evidence projections are composed inside the service.
import * as retiredReleaseBinding from "@rawr/agent-plugin-lifecycle/bindings/releases";
// @ts-expect-error Governance current-main selection is composed inside the service.
import * as retiredGovernanceBinding from "@rawr/agent-plugin-lifecycle/bindings/governance";
// @ts-expect-error The vendor module no longer exposes a public port subpath.
import * as retiredVendorPort from "@rawr/agent-plugin-lifecycle/ports/vendors";
// @ts-expect-error The releases module no longer exposes a public port subpath.
import * as retiredReleasePort from "@rawr/agent-plugin-lifecycle/ports/releases";
// @ts-expect-error Packaging resource projection is service-module-owned, not a host binding.
import * as retiredPackagingBinding from "@rawr/agent-plugin-lifecycle/bindings/packaging";
// @ts-expect-error The packaging module no longer exposes a public port subpath.
import * as retiredPackagingPort from "@rawr/agent-plugin-lifecycle/ports/packaging";
// @ts-expect-error The governance module no longer exposes a public port subpath.
import * as retiredGovernancePort from "@rawr/agent-plugin-lifecycle/ports/governance";
// @ts-expect-error The providers module no longer exposes a public port subpath.
import * as retiredProviderPort from "@rawr/agent-plugin-lifecycle/ports/providers";
// @ts-expect-error Provider dependencies flow directly through service context, not an aggregate runtime.
import type { ProviderLifecycleRuntime as RetiredProviderLifecycleRuntime } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Provider callers cannot inject a semantic current-main resolver.
import { createCurrentMainSelectionReader as retiredProviderResolverFactory } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Provider callers cannot name or implement a governance resolver port.
import type { GovernanceCurrentMainResolver as RetiredGovernanceResolver } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Provider domain parsers remain owned by the service module.
import { parseProviderDeploymentRequest as retiredProviderParser } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Provider record-state composition remains owned by service middleware.
import { createResourceProviderRecordState as retiredProviderRecordFactory } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native provider adapters remain owned by the provider module.
import { createResourceCodexProviderAdapter as retiredCodexAdapterFactory } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native provider host ports are inferred from the private client boundary.
import type { NativeProviderResourcePort as RetiredNativeProviderResourcePort } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Codex resource sessions are private host-context dependencies.
import type { CodexNativeResourceSession as RetiredCodexNativeResourceSession } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Claude resource sessions are private host-context dependencies.
import type { ClaudeNativeResourceSession as RetiredClaudeNativeResourceSession } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native resource session inputs are private host-context dependencies.
import type { NativeResourceSessionInput as RetiredNativeResourceSessionInput } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native executable paths are private host-context dependencies.
import type { NativeProviderExecutablePaths as RetiredNativeProviderExecutablePaths } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native capability probes are private host-context dependencies.
import type { NativeResourceCapabilityProbe as RetiredNativeResourceCapabilityProbe } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native JSON observations are private host-context dependencies.
import type { NativeResourceJsonObservation as RetiredNativeResourceJsonObservation } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native marketplace reads are private host-context dependencies.
import type { NativeResourceMarketplaceReadInput as RetiredNativeResourceMarketplaceReadInput } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native package entries are private host-context dependencies.
import type { NativeResourcePackageEntry as RetiredNativeResourcePackageEntry } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native package observations are private host-context dependencies.
import type { NativeResourcePackageObservation as RetiredNativeResourcePackageObservation } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native package read limits are private host-context dependencies.
import type { NativeResourcePackageReadLimits as RetiredNativeResourcePackageReadLimits } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native plugin reads are private host-context dependencies.
import type { NativeResourcePluginReadInput as RetiredNativeResourcePluginReadInput } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native provider failures belong to the resource contract, not the lifecycle service facade.
import type { NativeProviderResourceFailure as RetiredNativeProviderResourceFailure } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Native provider failure taxonomy belongs to the resource contract.
import type { NativeProviderResourceFailureKind as RetiredNativeProviderResourceFailureKind } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Service-private module internals are not package exports.
import type { BuildResult } from "@rawr/agent-plugin-lifecycle/service/modules/releases/model/dto/release-lifecycle";

void createMechanicalEvidenceHandle;
declare const artifactRef: ArtifactRef;
void artifactRef;
type CompleteIdentityReaderReturnIsExact = ReturnType<
  typeof createResourceCompleteTargetIdentityReader
> extends CompleteTargetIdentityReader
  ? CompleteTargetIdentityReader extends ReturnType<typeof createResourceCompleteTargetIdentityReader>
    ? true
    : never
  : never;
const completeIdentityReaderReturnIsExact: CompleteIdentityReaderReturnIsExact = true;
void completeIdentityReaderReturnIsExact;
void retiredReleaseBinding;
void retiredGovernanceBinding;
void retiredVendorPort;
void retiredReleasePort;
void retiredPackagingBinding;
void retiredPackagingPort;
void retiredGovernancePort;
void retiredProviderPort;
declare const retiredProviderLifecycleRuntime: RetiredProviderLifecycleRuntime;
void retiredProviderLifecycleRuntime;
void retiredProviderResolverFactory;
declare const retiredGovernanceResolver: RetiredGovernanceResolver;
void retiredGovernanceResolver;
void retiredProviderParser;
void retiredProviderRecordFactory;
void retiredCodexAdapterFactory;
type RetiredNativeProviderHostSurface = readonly [
  RetiredNativeProviderResourcePort,
  RetiredCodexNativeResourceSession,
  RetiredClaudeNativeResourceSession,
  RetiredNativeResourceSessionInput,
  RetiredNativeProviderExecutablePaths,
  RetiredNativeResourceCapabilityProbe,
  RetiredNativeResourceJsonObservation,
  RetiredNativeResourceMarketplaceReadInput,
  RetiredNativeResourcePackageEntry,
  RetiredNativeResourcePackageObservation,
  RetiredNativeResourcePackageReadLimits,
  RetiredNativeResourcePluginReadInput,
  RetiredNativeProviderResourceFailure,
  RetiredNativeProviderResourceFailureKind,
];
declare const retiredNativeProviderHostSurface: RetiredNativeProviderHostSurface;
void retiredNativeProviderHostSurface;
declare const buildResult: BuildResult;
void buildResult;

type ProviderCurrentMainIsAbsent = "providerCurrentMain" extends keyof Deps ? never : true;
const providerCurrentMainIsAbsent: ProviderCurrentMainIsAbsent = true;
void providerCurrentMainIsAbsent;

type CallerSemanticArtifactDepsAreAbsent = Extract<
  keyof Deps,
  | "releaseArtifacts"
  | "releaseEvidence"
  | "providerArtifactRepository"
  | "providerEvidenceStore"
> extends never ? true : never;
const callerSemanticArtifactDepsAreAbsent: CallerSemanticArtifactDepsAreAbsent = true;
void callerSemanticArtifactDepsAreAbsent;

type RawArtifactRepositoryIsRequired = Deps["artifactRepository"] extends ArtifactRepositoryAsyncPort
  ? ArtifactRepositoryAsyncPort extends Deps["artifactRepository"]
    ? true
    : never
  : never;
const rawArtifactRepositoryIsRequired: RawArtifactRepositoryIsRequired = true;
void rawArtifactRepositoryIsRequired;

type ArtifactRepositoryRootIsRequired = Deps["artifactRepositoryRoot"] extends string
  ? string extends Deps["artifactRepositoryRoot"]
    ? true
    : never
  : never;
const artifactRepositoryRootIsRequired: ArtifactRepositoryRootIsRequired = true;
void artifactRepositoryRootIsRequired;

type CallerExportArtifactReaderIsAbsent = "artifactReader" extends keyof Deps["exports"]
  ? never
  : true;
const callerExportArtifactReaderIsAbsent: CallerExportArtifactReaderIsAbsent = true;
void callerExportArtifactReaderIsAbsent;
