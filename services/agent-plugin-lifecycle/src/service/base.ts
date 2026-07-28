import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type { AgentPluginPackageOutputResource } from "@rawr/resource-agent-plugin-package-output";
import type { ContentWorkspaceResource } from "@rawr/resource-content-workspace";
import type { NativeAgentProviderResources } from "@rawr/resource-native-agent-provider";
import type { VersionedContentResource } from "@rawr/resource-versioned-content";
import { Layer } from "effect";
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";

export interface LifecycleClock {
  readonly now: () => Date;
}

type InitialContext = {
  deps: {
    contentWorkspace: ContentWorkspaceResource<never>;
    clock: LifecycleClock;
    packageOutput: AgentPluginPackageOutputResource<never>;
    nativeProviders: NativeAgentProviderResources;
    versionedContent: VersionedContentResource<never>;
  };
  scope: {};
  config: {};
};

type InvocationContext = {
  traceId: string;
  commandId: string;
};

type ProcedureMetadata = {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "releases" | "vendors" | "packaging" | "providers" | "governance";
};

export const policy = {
  events: {},
} as const;

const definition = defineService<{
  initialContext: InitialContext;
  invocationContext: InvocationContext;
  metadata: ProcedureMetadata;
}>({
  metadataDefaults: {
    idempotent: true,
    domain: "agent-plugin-lifecycle",
    audience: "internal",
    audit: "basic",
    entity: "service",
  },
  baseline: {
    policy,
  },
});

export type Service = ServiceOf<typeof definition>;
export type InitialLifecycleContext = Service["ORPCInitialContext"];

/**
 * Effect-aware implementer rooted in the service's declared initial context.
 *
 * @remarks
 * This is the service's sole Effect-oRPC implementation lineage. Downstream
 * service composition attaches completed named middleware; every module then
 * closes its branch with the bounded terminal context curation.
 */
export const base = implementEffect(contract, Layer.empty).$context<InitialLifecycleContext>();

/** SDK-owned baseline builder, separate from native context middleware authorship. */
export const createServiceBaselineMiddlewares = definition.createBaselineMiddlewares;

const baseline = createServiceBaselineMiddlewares();

/** SDK-owned observability baseline attached once at the service boundary. */
export const baselineObservability = baseline.observability;

/** SDK-owned analytics baseline attached once at the service boundary. */
export const baselineAnalytics = baseline.analytics;

/** SDK-owned required observability extension builder, not a context factory. */
export const createRequiredServiceObservabilityMiddleware =
  definition.createRequiredObservabilityMiddleware;

/** SDK-owned required analytics extension builder, not a context factory. */
export const createRequiredServiceAnalyticsMiddleware =
  definition.createRequiredAnalyticsMiddleware;
