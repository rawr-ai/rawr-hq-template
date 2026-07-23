import { ORPCError } from "@orpc/client";
import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type { AgentPluginPackageOutputAsyncPort } from "@rawr/resource-agent-plugin-package-output";
import type { ContentWorkspaceNodeAsyncPort } from "@rawr/resource-content-workspace";
import { Effect } from "effect";
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

const service = defineService<{
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

export type Service = ServiceOf<typeof service>;
export type ReadyLifecycleContext = Service["ExecutionContext"];

export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createServiceBaselineMiddlewares = service.createBaselineMiddlewares;
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;
export const createRequiredServiceObservabilityMiddleware =
  service.createRequiredObservabilityMiddleware;
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;
export const createServiceProvider = service.createProvider;

export function awaitDependencyPromise<A>(operation: () => PromiseLike<A>) {
  return Effect.uninterruptible(
    Effect.tryPromise({
      try: operation,
      catch: (cause) => new ORPCError("INTERNAL_SERVER_ERROR", { cause }),
    })
  );
}
