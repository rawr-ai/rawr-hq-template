import { ORPCError } from "@orpc/client";
import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type { AgentPluginPackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output";
import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";
import { Effect, Layer } from "effect";
import { implementEffect } from "effect-orpc";
import { contract } from "./contract";
import type { NativeProviderSessionResolver } from "./model/dependencies/providers";

export interface LifecycleClock {
  readonly now: () => Date;
}

type InitialContext = {
  deps: {
    contentWorkspace: ContentWorkspaceNodeAsyncPort;
    clock: LifecycleClock;
    packageOutput: AgentPluginPackageOutputAsyncPort;
    providerNativeSessions: NativeProviderSessionResolver;
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
export type ReadyLifecycleContext = Service["ExecutionContext"];

export const base = implementEffect(contract, Layer.empty);
export const createServiceMiddleware = definition.createMiddleware;
export const createServiceBaselineMiddlewares = definition.createBaselineMiddlewares;
export const createServiceObservabilityMiddleware = definition.createObservabilityMiddleware;
export const createRequiredServiceObservabilityMiddleware =
  definition.createRequiredObservabilityMiddleware;
export const createServiceAnalyticsMiddleware = definition.createAnalyticsMiddleware;
export const createRequiredServiceAnalyticsMiddleware =
  definition.createRequiredAnalyticsMiddleware;
export const createServiceProvider = definition.createProvider;

export function awaitDependencyPromise<A>(operation: () => PromiseLike<A>) {
  return Effect.uninterruptible(
    Effect.tryPromise({
      try: operation,
      catch: (cause) => new ORPCError("INTERNAL_SERVER_ERROR", { cause }),
    })
  );
}
