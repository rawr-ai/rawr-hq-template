import { ORPCError } from "@orpc/client";
import { os } from "@orpc/server";
import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type { AgentPluginPackageOutputResource } from "@rawr/resource-agent-plugin-package-output";
import type { ContentWorkspaceResource } from "@rawr/resource-content-workspace";
import type { VersionedContentResource } from "@rawr/resource-versioned-content";
import { Effect, Layer } from "effect";
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
import type { NativeProviderSessionResolver } from "./model/dependencies/providers";

export interface LifecycleClock {
  readonly now: () => Date;
}

type InitialContext = {
  deps: {
    contentWorkspace: ContentWorkspaceResource<never>;
    clock: LifecycleClock;
    packageOutput: AgentPluginPackageOutputResource<never>;
    providerNativeSessions: NativeProviderSessionResolver;
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
 * service and module implementers only attach completed middleware values.
 */
export const base = implementEffect(contract, Layer.empty).$context<InitialLifecycleContext>();

const middleware = os.$context<InitialLifecycleContext>();

/**
 * Returns the one native middleware authoring surface seeded with the complete
 * lifecycle service context.
 *
 * @remarks
 * This surface can author middleware but cannot expose the contract implementer,
 * router composition, or Effect execution authority carried by `base`.
 */
export function createMiddleware() {
  return middleware;
}

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

export function awaitDependencyPromise<A>(operation: () => PromiseLike<A>) {
  return Effect.uninterruptible(
    Effect.tryPromise({
      try: operation,
      catch: (cause) => new ORPCError("INTERNAL_SERVER_ERROR", { cause }),
    })
  );
}
