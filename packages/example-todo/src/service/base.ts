/**
 * @fileoverview Single service definition seam for the todo package.
 *
 * @remarks
 * Author the todo service boundary and its service-wide baseline concerns once
 * in this file:
 * - support types like `Clock`
 * - the canonical service declaration
 * - service-wide baseline metadata, policy, observability, and analytics
 * - the bound service authoring surfaces exported to the rest of the package
 *
 * Keep this file as the one authoritative service manifest. Module- and
 * procedure-local behavior still belongs in module `setup.ts` / `router.ts`
 * files. Lower-level construction primitives remain in `src/orpc-sdk.ts`.
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
    policy: {
      events: {
        readOnlyRejected: "todo.policy.read_only_rejected",
        assignmentLimitReached: "todo.policy.assignment_limit_reached",
      },
    },
    observability: {
      attributes: ({ context }) => {
        return {
          workspace_id: context.scope.workspaceId,
          read_only: context.config.readOnly,
          invocation_trace_id: context.invocation.traceId,
        };
      },
      logFields: ({ context, spanTraceId }) => {
        return {
          spanTraceId,
          invocationTraceId: context.invocation.traceId,
          workspaceId: context.scope.workspaceId,
          readOnly: context.config.readOnly,
        };
      },
      startedEventFields: ({ context }) => {
        return {
          workspaceId: context.scope.workspaceId,
          traceId: context.invocation.traceId,
        };
      },
      succeededEventFields: ({ context }) => {
        return {
          workspaceId: context.scope.workspaceId,
        };
      },
      onFailed: ({ span, context, pathLabel, error, policyEvents }) => {
        if (error.code === "READ_ONLY_MODE" && policyEvents?.readOnlyRejected) {
          span?.addEvent(policyEvents.readOnlyRejected, {
            path: pathLabel,
            workspaceId: context.scope.workspaceId,
          });
        }

        if (error.code === "ASSIGNMENT_LIMIT_REACHED" && policyEvents?.assignmentLimitReached) {
          span?.addEvent(policyEvents.assignmentLimitReached, {
            path: pathLabel,
            workspaceId: context.scope.workspaceId,
          });
        }
      },
    },
    analytics: {},
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
 * concerns defined in this file.
 *
 * Typical attachment points:
 * - module-level additions in module `setup.ts` files
 * - procedure-level additions in module `router.ts` files
 *
 * Do not use this to recreate the default service-wide baseline middleware
 * already declared here. Declare only the minimal required lane fragments or
 * execution context additions; do not restate the full `Service["Context"]`.
 */
export const createServiceMiddleware = service.createMiddleware;

/**
 * Service-local additive observability middleware builder.
 *
 * @remarks
 * Use this for module- or procedure-level observability additions on top of
 * the automatic service-wide baseline declared in this file.
 *
 * This builder is additive-only:
 * - it can add local fields, events, and hooks
 * - it must not recreate the baseline lifecycle shell
 * - it must not rename baseline event streams
 */
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;

/**
 * Service-local additive analytics middleware builder.
 *
 * @remarks
 * Use this for module- or procedure-level analytics additions on top of the
 * automatic service-wide baseline declared in this file.
 *
 * This builder is additive-only:
 * - it contributes local analytics payload deltas
 * - it does not emit a second baseline analytics stream
 * - it does not rename the baseline analytics event
 */
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;

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
 * `src/service/impl.ts` imports the root contract and calls this once. The
 * returned implementer already includes the service-wide baseline concerns
 * defined in this file.
 */
export const createServiceImplementer = service.createImplementer;
