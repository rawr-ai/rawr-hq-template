/**
 * @fileoverview Single service definition seam for the agent-config-sync package.
 *
 * @remarks
 * This file declares the stable service boundary and exports the bound service
 * authoring surfaces used everywhere else in the package.
 */
import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type { ExecutionRuntime } from "./shared/ports/execution-runtime";
import type { PlanningRuntime } from "./shared/ports/planning-runtime";
import type { RetirementRuntime } from "./shared/ports/retirement-runtime";
import type { UndoRuntime } from "./shared/ports/undo-runtime";

type InitialContext = {
  deps: {
    planningRuntime?: PlanningRuntime;
    executionRuntime?: ExecutionRuntime;
    retirementRuntime?: RetirementRuntime;
    undoRuntime?: UndoRuntime;
  };
  scope: {
    repoRoot: string;
  };
  config: {};
};

type InvocationContext = {
  traceId: string;
};

type ProcedureMetadata = {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "planning" | "execution" | "retirement" | "undo";
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
    domain: "agent-config-sync",
    audience: "internal",
    audit: "basic",
    entity: "service",
  },
  baseline: {
    policy,
  },
});

export type Service = ServiceOf<typeof service>;

export const ocBase = service.oc;
export const createServiceMiddleware = service.createMiddleware;
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;
export const createRequiredServiceObservabilityMiddleware = service.createRequiredObservabilityMiddleware;
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;
export const createServiceProvider = service.createProvider;
export const createServiceImplementer = service.createImplementer;
