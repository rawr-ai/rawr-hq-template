import { defineService, type ServiceOf } from "@rawr/hq-sdk";

type InitialContext = {
  deps: {};
  scope: {
    repoRoot: string;
  };
  config: {};
};

type InvocationContext = {
  traceId: string;
};

type ProcedureMetadata = {
  entity?: "workflow";
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
    domain: "coordination",
    audience: "internal",
    entity: "workflow",
  },
  baseline: {
    policy,
  },
});

export type Service = ServiceOf<typeof service>;

export const ocBase = service.oc;
export const createRequiredServiceObservabilityMiddleware = service.createRequiredObservabilityMiddleware;
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;
export const createServiceImplementer = service.createImplementer;
