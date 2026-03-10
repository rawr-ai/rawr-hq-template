/**
 * @fileoverview Single service definition seam for the todo package.
 *
 * @remarks
 * Author the todo service boundary and its declarative service-wide concerns once
 * in this file:
 * - support types like `Clock`
 * - the canonical service declaration
 * - service-wide metadata defaults and policy vocabulary
 * - the bound service authoring surfaces exported to the rest of the package
 *
 * Keep this file as the one authoritative declarative service manifest.
 * Runtime telemetry behavior does not live here; required service telemetry is
 * authored in `src/service/middleware/*` and supplied at the implementer seam.
 * Module- and procedure-local behavior still belongs in module `setup.ts` /
 * `router.ts` files. Lower-level construction primitives remain in
 * `src/orpc-sdk.ts`.
 *
 * @agents
 * Read this file to understand what the service is. Do not add runtime
 * observability or analytics behavior here; that belongs in
 * `src/service/middleware/*`.
 */
import {
  defineService,
  type DbPool,
  type ServiceOf,
} from "../orpc-sdk";

/**
 * Host-owned time source used by task/tag creation and similar flows.
 */
export interface Clock {
  now(): string;
}

/**
 * Construction-time context supplied when the in-process client is created.
 *
 * @remarks
 * These lanes are always available downstream in procedure context.
 */
type InitialContext = {
  deps: {
    dbPool: DbPool;
    clock: Clock;
  };
  scope: {
    workspaceId: string;
  };
  config: {
    readOnly: boolean;
    limits: {
      maxAssignmentsPerTask: number;
    };
  };
};

/**
 * Per-call context supplied at invocation time through the router client.
 *
 * @remarks
 * This becomes `context.invocation` inside procedures.
 */
type InvocationContext = {
  traceId: string;
};

/**
 * Static procedure metadata authored by the service.
 *
 * @remarks
 * This is not runtime context.
 */
type ProcedureMetadata = {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "task" | "tag" | "assignment";
};

/**
 * Declarative service-wide policy vocabulary.
 *
 * @remarks
 * Policy names are static service semantics that runtime observability may
 * consume. They are distinct from caller-facing errors and from telemetry
 * behavior itself.
 */
export const policy = {
  events: {
    readOnlyRejected: "todo.policy.read_only_rejected",
    assignmentLimitReached: "todo.policy.assignment_limit_reached",
  },
} as const;

/**
 * Bound todo service definition.
 *
 * @remarks
 * Declare the full service boundary once here through three semantic groups:
 * - `initialContext`: construction-time context supplied by the client up front
 * - `invocationContext`: per-call context supplied at invocation time
 * - `metadata`: static procedure metadata authored by the service
 *
 * The SDK preserves the stable helper seam internally while deriving the
 * composed `Deps`, `Metadata`, and `Context` types from this one declaration.
 */
const service = defineService<{
  initialContext: InitialContext;
  invocationContext: InvocationContext;
  metadata: ProcedureMetadata;
}>({
  metadataDefaults: {
    idempotent: true,
    domain: "todo",
    audience: "internal",
    audit: "basic",
    entity: "service",
  },
  baseline: {
    policy,
  },
});

/**
 * Canonical service type projected from the defined service value.
 */
export type Service = ServiceOf<typeof service>;

/**
 * Contract authoring surface for module contracts.
 */
export const ocBase = service.oc;

/**
 * Service-local middleware builder.
 *
 * @remarks
 * Use this for additive service-authored middleware outside the baseline
 * declarative concerns defined in this file.
 *
 * Typical attachment points:
 * - module-level additions in module `setup.ts` files
 * - procedure-level additions in module `router.ts` files
 *
 * Do not use this to recreate the required service-wide telemetry middleware
 * attached in `src/service/impl.ts`. Declare only the minimal required lane
 * fragments or execution context additions; do not restate the full
 * `Service["Context"]`.
 */
export const createServiceMiddleware = service.createMiddleware;

/**
 * Service-local additive observability middleware builder.
 *
 * @remarks
 * Use this for module- or procedure-level observability additions on top of
 * the required service-wide observability middleware attached in
 * `src/service/impl.ts`.
 *
 * This builder is additive-only:
 * - it can add local fields, events, and hooks
 * - it must not recreate the baseline lifecycle shell
 * - it must not rename baseline event streams
 */
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;

/**
 * Required service-wide observability middleware builder.
 *
 * @remarks
 * Use this only for the one required service-wide observability middleware
 * attached in `src/service/impl.ts`. It is not interchangeable with additive
 * observability middleware and cannot depend on provider-added `provided.*`
 * execution context.
 */
export const createRequiredServiceObservabilityMiddleware = service.createRequiredObservabilityMiddleware;

/**
 * Service-local additive analytics middleware builder.
 *
 * @remarks
 * Use this for module- or procedure-level analytics additions on top of the
 * required service-wide analytics middleware attached in `src/service/impl.ts`.
 *
 * This builder is additive-only:
 * - it contributes local analytics payload deltas
 * - it does not emit a second baseline analytics stream
 * - it does not rename the baseline analytics event
 */
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;

/**
 * Required service-wide analytics middleware builder.
 *
 * @remarks
 * Use this only for the one required service-wide analytics middleware
 * attached in `src/service/impl.ts`. It contributes service-global analytics
 * payload to the one canonical analytics emission path and is not
 * interchangeable with additive analytics middleware.
 */
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;

/**
 * Service-local provider builder.
 *
 * @remarks
 * Use this when service-authored middleware needs to add downstream execution
 * context. Service-local providers write into `context.provided.*`; they do
 * not mutate or shadow the reserved semantic lanes.
 */
export const createServiceProvider = service.createProvider;

/**
 * Service-local implementer factory.
 *
 * @remarks
 * `src/service/impl.ts` imports the root contract and calls this once,
 * supplying the required service-wide telemetry middleware. The returned
 * implementer already includes SDK baseline telemetry and then auto-attaches
 * the required service telemetry in canonical order.
 */
export const createServiceImplementer = service.createImplementer;
