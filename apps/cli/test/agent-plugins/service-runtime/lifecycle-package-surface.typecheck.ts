import { createResourceArtifactStore } from "@rawr/agent-plugin-lifecycle/bindings/releases";
import { createGovernanceCurrentMainSelectionReader } from "@rawr/agent-plugin-lifecycle/bindings/governance";

// @ts-expect-error Release source repositories are service-module implementations, not host bindings.
import { createResourceContentWorkspaceSnapshotReader as retiredReleaseSourceFactory } from "@rawr/agent-plugin-lifecycle/bindings/releases";
// @ts-expect-error Staged source repositories are service-module implementations, not host bindings.
import { createResourceStagedContentWorkspaceObservationReader as retiredStagedReleaseSourceFactory } from "@rawr/agent-plugin-lifecycle/bindings/releases";
// @ts-expect-error The vendor module no longer exposes a public port subpath.
import * as retiredVendorPort from "@rawr/agent-plugin-lifecycle/ports/vendors";
// @ts-expect-error The releases module no longer exposes a public port subpath.
import * as retiredReleasePort from "@rawr/agent-plugin-lifecycle/ports/releases";
// @ts-expect-error Packaging resource projection is service-module-owned, not a host binding.
import * as retiredPackagingBinding from "@rawr/agent-plugin-lifecycle/bindings/packaging";
// @ts-expect-error The packaging module no longer exposes a public port subpath.
import * as retiredPackagingPort from "@rawr/agent-plugin-lifecycle/ports/packaging";
// @ts-expect-error Governance's exact-Git repository is module-owned, not a host binding.
import { createResourceExactGitReader as retiredGovernanceFactory } from "@rawr/agent-plugin-lifecycle/bindings/governance";
// @ts-expect-error The governance module no longer exposes a public port subpath.
import * as retiredGovernancePort from "@rawr/agent-plugin-lifecycle/ports/governance";
// @ts-expect-error Provider callers cannot inject a semantic current-main resolver.
import { createCurrentMainSelectionReader as retiredProviderResolverFactory } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Provider callers cannot name or implement a governance resolver port.
import type { GovernanceCurrentMainResolver as RetiredGovernanceResolver } from "@rawr/agent-plugin-lifecycle/bindings/providers";
// @ts-expect-error Service-private module internals are not package exports.
import type { BuildResult } from "@rawr/agent-plugin-lifecycle/service/modules/releases/model/dto/release-lifecycle";

void createResourceArtifactStore;
void createGovernanceCurrentMainSelectionReader;
void retiredReleaseSourceFactory;
void retiredStagedReleaseSourceFactory;
void retiredVendorPort;
void retiredReleasePort;
void retiredPackagingBinding;
void retiredPackagingPort;
void retiredGovernanceFactory;
void retiredGovernancePort;
void retiredProviderResolverFactory;
declare const retiredGovernanceResolver: RetiredGovernanceResolver;
void retiredGovernanceResolver;
declare const buildResult: BuildResult;
void buildResult;
