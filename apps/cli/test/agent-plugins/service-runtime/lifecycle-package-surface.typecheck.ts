// @ts-expect-error The package has no bare-root public face.
import * as retiredRootSurface from "@habitat-ai/rawr-agent-plugin-lifecycle";
// @ts-expect-error Retired export host bindings cannot remain package-reachable.
import * as retiredExportBindingSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/bindings/exports";
// @ts-expect-error Lifecycle host bindings are not a public package axis.
import * as retiredBindingSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/bindings/providers";
import {
  type Client,
  type Contract,
  type CreateClientOptions,
  contract,
  createClient,
  MAX_RELEASE_INPUT_ENVELOPE_BYTES,
  MAX_RELEASE_MEMBERS,
  parseContentAuthority,
  parseCurrentMainRecordInput,
  parseGitCommitId,
  parseGitTreeId,
  parsePluginId,
  parseReleaseRelativePath,
  parseRepositoryIdentity,
} from "@habitat-ai/rawr-agent-plugin-lifecycle/client";
// @ts-expect-error Lifecycle host bindings are not a public package axis.
import * as retiredHostSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/host";
// @ts-expect-error Raw input parsing belongs to the client face, not a parallel facade.
import * as retiredInputSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/input";
// @ts-expect-error Retired export module ports cannot remain package-reachable.
import * as retiredExportPortSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/ports/exports";
// @ts-expect-error Lifecycle module ports are not a public package axis.
import * as retiredPortSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/ports/providers";
// @ts-expect-error Release construction is private to the lifecycle service.
import * as retiredReleaseSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/release";
// @ts-expect-error The executable router stays private behind client construction.
import * as retiredRouterSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/router";
// @ts-expect-error The contract is re-exported only through the client face.
import * as retiredContractSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/service/contract";
// @ts-expect-error Contract types are exposed only through the public client face.
import * as retiredTypesSurface from "@habitat-ai/rawr-agent-plugin-lifecycle/types";
import type { NativeAgentProviderResources } from "@habitat-ai/rawr-resource-native-agent-provider";

const lifecycleContract: Contract = contract;
void lifecycleContract;
const constructLifecycleClient: (options: CreateClientOptions) => Client = createClient;
void constructLifecycleClient;
void MAX_RELEASE_INPUT_ENVELOPE_BYTES;
void MAX_RELEASE_MEMBERS;
void parseContentAuthority;
void parseCurrentMainRecordInput;
void parseGitCommitId;
void parseGitTreeId;
void parsePluginId;
void parseReleaseRelativePath;
void parseRepositoryIdentity;

type LifecycleClientSurface = typeof import("@habitat-ai/rawr-agent-plugin-lifecycle/client");
type RetiredContextAliasesAreAbsent =
  Extract<keyof LifecycleClientSurface, "Config" | "Deps" | "Scope"> extends never ? true : never;
const retiredContextAliasesAreAbsent: RetiredContextAliasesAreAbsent = true;
void retiredContextAliasesAreAbsent;

void retiredBindingSurface;
void retiredPortSurface;
void retiredHostSurface;
void retiredRootSurface;
void retiredInputSurface;
void retiredRouterSurface;
void retiredContractSurface;
void retiredExportBindingSurface;
void retiredExportPortSurface;
void retiredReleaseSurface;
void retiredTypesSurface;

type LifecycleDeps = CreateClientOptions["deps"];

declare const lifecycleDeps: LifecycleDeps;

const extraScopeIsRejected: CreateClientOptions = {
  deps: lifecycleDeps,
  // @ts-expect-error Lifecycle scope is an exact empty context lane.
  scope: { repository: "unexpected" },
  config: {},
};
void extraScopeIsRejected;

const extraConfigIsRejected: CreateClientOptions = {
  deps: lifecycleDeps,
  scope: {},
  // @ts-expect-error Lifecycle config is an exact empty context lane.
  config: { retries: 1 },
};
void extraConfigIsRejected;

type ProviderCurrentMainIsAbsent = "providerCurrentMain" extends keyof LifecycleDeps ? never : true;
const providerCurrentMainIsAbsent: ProviderCurrentMainIsAbsent = true;
void providerCurrentMainIsAbsent;

type CallerSemanticArtifactDepsAreAbsent =
  Extract<
    keyof LifecycleDeps,
    "releaseArtifacts" | "releaseEvidence" | "providerArtifactRepository" | "providerEvidenceStore"
  > extends never
    ? true
    : never;
const callerSemanticArtifactDepsAreAbsent: CallerSemanticArtifactDepsAreAbsent = true;
void callerSemanticArtifactDepsAreAbsent;

type NativeProviderResourcesAreExact =
  LifecycleDeps["nativeProviders"] extends NativeAgentProviderResources
    ? NativeAgentProviderResources extends LifecycleDeps["nativeProviders"]
      ? true
      : never
    : never;
const nativeProviderResourcesAreExact: NativeProviderResourcesAreExact = true;
void nativeProviderResourcesAreExact;
