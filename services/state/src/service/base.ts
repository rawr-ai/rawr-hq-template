/**
 * @fileoverview Single service definition seam for the state package.
 *
 * @remarks
 * Author the state service boundary and its declarative service-wide concerns
 * once in this file:
 * - the canonical service declaration
 * - service-wide metadata defaults and policy vocabulary
 * - the bound service authoring surfaces exported to the rest of the package
 *
 * Keep this file as the one authoritative declarative service manifest.
 * Runtime telemetry behavior does not live here; required service middleware
 * extensions are authored in `src/service/middleware/*` and supplied at the
 * implementer seam.
 */
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
  entity?: "state";
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
    domain: "state",
    audience: "internal",
    entity: "state",
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
