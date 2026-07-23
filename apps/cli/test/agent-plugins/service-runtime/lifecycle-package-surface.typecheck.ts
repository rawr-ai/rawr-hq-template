// @ts-expect-error Retired export host bindings cannot remain package-reachable.
import * as retiredExportBindingSurface from "@rawr/agent-plugin-lifecycle/bindings/exports";
// @ts-expect-error Lifecycle host bindings are not a public package axis.
import * as retiredBindingSurface from "@rawr/agent-plugin-lifecycle/bindings/providers";
import type { Config, CreateClientOptions, Deps, Scope } from "@rawr/agent-plugin-lifecycle/client";
import { type NativeProviderSessionResolver } from "@rawr/agent-plugin-lifecycle/host";
// @ts-expect-error Retired export module ports cannot remain package-reachable.
import * as retiredExportPortSurface from "@rawr/agent-plugin-lifecycle/ports/exports";
// @ts-expect-error Lifecycle module ports are not a public package axis.
import * as retiredPortSurface from "@rawr/agent-plugin-lifecycle/ports/providers";
import { type Router, router } from "@rawr/agent-plugin-lifecycle/router";
import { type Contract, contract } from "@rawr/agent-plugin-lifecycle/service/contract";
// @ts-expect-error Contract types are exposed only through the owner-qualified contract subpath.
import * as retiredTypesSurface from "@rawr/agent-plugin-lifecycle/types";

const lifecycleContract: Contract = contract;
void lifecycleContract;
void retiredTypesSurface;
const lifecycleRouter: Router = router;
void lifecycleRouter;
declare const lifecycleConfig: Config;
declare const lifecycleBoundary: CreateClientOptions;
declare const lifecycleScope: Scope;
void lifecycleConfig;
void lifecycleBoundary;
void lifecycleScope;
void retiredBindingSurface;
void retiredPortSurface;
void retiredExportBindingSurface;
void retiredExportPortSurface;

type ProviderCurrentMainIsAbsent = "providerCurrentMain" extends keyof Deps ? never : true;
const providerCurrentMainIsAbsent: ProviderCurrentMainIsAbsent = true;
void providerCurrentMainIsAbsent;

type CallerSemanticArtifactDepsAreAbsent =
  Extract<
    keyof Deps,
    "releaseArtifacts" | "releaseEvidence" | "providerArtifactRepository" | "providerEvidenceStore"
  > extends never
    ? true
    : never;
const callerSemanticArtifactDepsAreAbsent: CallerSemanticArtifactDepsAreAbsent = true;
void callerSemanticArtifactDepsAreAbsent;

type NativeSessionHostPortIsExact =
  Deps["providerNativeSessions"] extends NativeProviderSessionResolver
    ? NativeProviderSessionResolver extends Deps["providerNativeSessions"]
      ? true
      : never
    : never;
const nativeSessionHostPortIsExact: NativeSessionHostPortIsExact = true;
void nativeSessionHostPortIsExact;
