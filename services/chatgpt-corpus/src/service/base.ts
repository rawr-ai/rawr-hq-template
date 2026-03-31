import { defineService, type ServiceOf } from "@rawr/hq-sdk";

type InitialContext = {
  deps: {};
  scope: {};
  config: {};
};

type InvocationContext = {
  traceId: string;
};

type ProcedureMetadata = {
  entity?: "chatgpt-corpus";
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
    domain: "chatgpt-corpus",
    audience: "internal",
    entity: "chatgpt-corpus",
  },
  baseline: {
    policy,
  },
});

export type Service = ServiceOf<typeof service>;

export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;
export const createRequiredServiceObservabilityMiddleware = service.createRequiredObservabilityMiddleware;
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;
export const createServiceProvider = service.createProvider;
export const createServiceImplementer = service.createImplementer;
