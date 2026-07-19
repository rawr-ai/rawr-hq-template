import {
  createResourceArtifactStore,
  type ResourceArtifactRepositoryOptions,
  type ResourceMechanicalEvidenceRepositoryOptions,
} from "@rawr/agent-plugin-lifecycle/bindings/releases";
import {
  createMechanicalEvidenceHandle,
  type ArtifactRef,
} from "@rawr/agent-plugin-lifecycle/release";
import type { Deps } from "@rawr/agent-plugin-lifecycle/client";
import type { ArtifactRepositoryAsyncPort } from "@rawr/resource-agent-plugin-artifact-repository";

// @ts-expect-error Governance current-main selection is composed inside the service.
import * as retiredGovernanceBinding from "@rawr/agent-plugin-lifecycle/bindings/governance";

// @ts-expect-error Release source repositories are service-module implementations, not host bindings.
import { createResourceContentWorkspaceSnapshotReader as retiredReleaseSourceFactory } from "@rawr/agent-plugin-lifecycle/bindings/releases";
// @ts-expect-error Staged source repositories are service-module implementations, not host bindings.
import { createResourceStagedContentWorkspaceObservationReader as retiredStagedReleaseSourceFactory } from "@rawr/agent-plugin-lifecycle/bindings/releases";
// @ts-expect-error Pure release algebra is exported only from the release surface.
import { createMechanicalEvidenceHandle as retiredBindingEvidenceHandle } from "@rawr/agent-plugin-lifecycle/bindings/releases";
// @ts-expect-error Shared release types are exported only from the release surface.
import type { ArtifactRef as RetiredBindingArtifactRef } from "@rawr/agent-plugin-lifecycle/bindings/releases";
// @ts-expect-error Module domain types are inferred from the client, not exported from host bindings.
import type { BuildResult as RetiredBindingBuildResult } from "@rawr/agent-plugin-lifecycle/bindings/releases";
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
// @ts-expect-error Service-private module internals are not package exports.
import type { BuildResult } from "@rawr/agent-plugin-lifecycle/service/modules/releases/model/dto/release-lifecycle";

void createResourceArtifactStore;
void createMechanicalEvidenceHandle;
declare const artifactRef: ArtifactRef;
declare const artifactOptions: ResourceArtifactRepositoryOptions;
declare const evidenceOptions: ResourceMechanicalEvidenceRepositoryOptions;
void artifactRef;
void artifactOptions;
void evidenceOptions;
void retiredGovernanceBinding;
void retiredReleaseSourceFactory;
void retiredStagedReleaseSourceFactory;
void retiredBindingEvidenceHandle;
declare const retiredBindingArtifactRef: RetiredBindingArtifactRef;
declare const retiredBindingBuildResult: RetiredBindingBuildResult;
void retiredBindingArtifactRef;
void retiredBindingBuildResult;
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

type ReleaseBindingValueKey = keyof typeof import("@rawr/agent-plugin-lifecycle/bindings/releases");
type ExpectedReleaseBindingValueKey =
  | "createResourceArtifactReader"
  | "createResourceArtifactStore"
  | "createResourceMechanicalEvidenceReader"
  | "createResourceMechanicalEvidenceStore";
type ReleaseBindingValuesAreExact =
  Exclude<ReleaseBindingValueKey, ExpectedReleaseBindingValueKey> extends never
    ? Exclude<ExpectedReleaseBindingValueKey, ReleaseBindingValueKey> extends never
      ? true
      : never
    : never;
const releaseBindingValuesAreExact: ReleaseBindingValuesAreExact = true;
void releaseBindingValuesAreExact;
