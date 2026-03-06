/**
 * @fileoverview Service definition for the todo package.
 *
 * @remarks
 * This file is the service-definition center of gravity:
 * - host-owned deps and initial context
 * - shared procedure metadata defaults
 * - the bound authoring surfaces exported to the rest of the package
 *
 * Keep concrete service facts here. `src/service/impl.ts` owns middleware
 * stacking; `src/orpc/*` owns the reusable SDK machinery behind these exports.
 */
import type { DbPool, ServiceContextOf, ServiceDepsOf, ServiceMetadataOf } from "../orpc-sdk";
import { defineService } from "../orpc-sdk";

/**
 * Host-owned time source used by task/tag creation and similar flows.
 */
export interface Clock {
  now(): string;
}

/**
 * Host-owned runtime toggles used by package-global policy middleware.
 */
export interface Runtime {
  readOnly: boolean;
}

/**
 * Host-owned dependencies for the todo service.
 *
 * @remarks
 * This is the explicit dependency contract at the service boundary.
 * Baseline deps vs service deps stays a type-authoring distinction only.
 */
export interface ServiceDeps extends ServiceDepsOf<{
  dbPool: DbPool;
  clock: Clock;
  runtime: Runtime;
}> {}

/**
 * Initial service context.
 *
 * @remarks
 * Keep request-scoped, non-dependency input here. Middleware-produced execution
 * context belongs downstream, not in this type.
 */
export type ServiceContext = ServiceContextOf<ServiceDeps, {
  workspaceId?: string;
  requestId?: string;
}>;

/**
 * Service-specific procedure metadata.
 *
 * @remarks
 * Keep this small and operational. These are the metadata fields service-local
 * middleware and policy can reasonably depend on.
 */
export type ServiceMetadata = ServiceMetadataOf<{
  audit?: "none" | "basic" | "full";
  entity?: "service" | "task" | "tag" | "assignment";
}>;

/**
 * Bound service authoring surface.
 *
 * @remarks
 * `defineService(...)` binds the service-local authoring surfaces once:
 * contract authoring, service middleware authoring, and implementer creation.
 */
const service = defineService<ServiceMetadata, ServiceContext>({
  metadata: {
    idempotent: true,
    domain: "todo",
    audience: "internal",
    audit: "basic",
    entity: "service",
  },
  implementer: {
    telemetry: { defaultDomain: "todo" },
    analytics: { app: "todo" },
  },
});

/**
 * Contract authoring surface for module contracts.
 */
export const ocBase = service.oc;

/**
 * Service-local middleware builder.
 *
 * @remarks
 * Use this for service-authored middleware.
 * Declare only the minimal required context fragment under `deps`; do not
 * restate the full `ServiceContext`.
 */
export const createServiceMiddleware = service.createMiddleware;

/**
 * Service-local implementer factory.
 *
 * @remarks
 * `src/service/impl.ts` imports the root contract and calls this once. Keeping
 * the factory here avoids repeating `ServiceContext` and baseline implementer
 * options in every implementation file.
 */
export const createServiceImplementer = service.createImplementer;
