/**
 * @fileoverview Service definition manifest for the todo package.
 *
 * @remarks
 * This directory is the service base-construction layer:
 * - host-owned deps and initial context
 * - shared procedure metadata defaults
 * - the bound service authoring surfaces exported to the rest of the package
 * - baseline concern profiles imported from sibling files
 *
 * Keep this file as the assembly manifest. Rich concern logic belongs in the
 * sibling files under `src/service/base/`.
 */
import type {
  DbPool,
  ServiceContextOf,
  ServiceDepsOf,
  ServiceMetadataOf,
} from "../../orpc-sdk";
import { defineService } from "../../orpc-sdk";
import { analytics } from "./analytics";
import { observability } from "./observability";
import { policy } from "./policy";

/**
 * Host-owned time source used by task/tag creation and similar flows.
 */
export interface Clock {
  now(): string;
}

/**
 * Stable client scope for the todo package.
 */
export interface ServiceScope {
  workspaceId: string;
}

/**
 * Stable package configuration for the todo package.
 */
export interface ServiceConfig {
  readOnly: boolean;
  limits: {
    maxAssignmentsPerTask: number;
  };
}

/**
 * Invocation-scoped input for the todo package.
 */
export interface ServiceInvocation {
  traceId: string;
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
}> {}

/**
 * Initial service context.
 *
 * @remarks
 * Keep the semantic lane model explicit here. Construction-time bags are
 * `deps`, `scope`, and `config`; per-call input is `invocation`.
 */
export type ServiceContext = ServiceContextOf<
  ServiceDeps,
  ServiceScope,
  ServiceConfig,
  ServiceInvocation
>;

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
 * The `base` property assembles the baseline concern profiles imported from the
 * sibling files in this directory.
 */
const service = defineService<ServiceMetadata, ServiceContext>({
  metadata: {
    idempotent: true,
    domain: "todo",
    audience: "internal",
    audit: "basic",
    entity: "service",
  },
  base: {
    analytics,
    observability,
    policy,
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
 * Declare only the minimal required lane fragments or execution context
 * additions; do not restate the full `ServiceContext`.
 */
export const createServiceMiddleware = service.createMiddleware;

/**
 * Service-local provider builder.
 *
 * @remarks
 * Use this when service-authored middleware needs to add downstream execution
 * context. Service-local providers also write into `context.provided.*`; they
 * do not mutate or shadow the reserved semantic lanes.
 */
export const createServiceProvider = service.createProvider;

/**
 * Service-local implementer factory.
 *
 * @remarks
 * `src/service/impl.ts` imports the root contract and calls this once. Keeping
 * the factory here avoids repeating `ServiceContext` and baseline service
 * assembly options in every implementation file.
 */
export const createServiceImplementer = service.createImplementer;
