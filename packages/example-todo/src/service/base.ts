/**
 * @fileoverview Service definition for the todo package.
 *
 * @remarks
 * This is the single authored service-definition surface:
 * - `ServiceDeps` / `ServiceContext`
 * - `ServiceMetadata`
 * - `ocBase` for contract authoring
 * - `createServiceMiddleware` for service-local middleware authoring
 * - `createServiceImplementer` for central contract implementation
 *
 * Modules should derive runtime behavior from the central implementer in
 * `src/service/impl.ts`. This file owns the host boundary contract and shared
 * metadata defaults, not the middleware chain itself.
 *
 * Keep this file domain-authored (concrete values live here). The SDK factory
 * implementation lives under `../orpc/*`.
 */
import type {
  DbPool,
  ServiceContextOf,
  ServiceDepsOf,
  ServiceMetadataOf,
} from "../orpc-sdk";
import { defineService } from "../orpc-sdk";

/**
 * Service-specific metadata extension (wireframe).
 *
 * @remarks
 * This is a realistic example of "domain-driven" metadata that a service might
 * standardize so baseline middleware (telemetry/audit/policy) can tag behavior
 * consistently without every module inventing a new shape.
 *
 * This package does not *use* these fields yet; they're here to help us shape
 * the eventual shared SDK API around what `service/base.ts` needs to express.
 */
export type ServiceMetadata = ServiceMetadataOf<{
  audit?: "none" | "basic" | "full";
  entity?: "service" | "task" | "tag" | "assignment";
}>;

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
 * Host-owned dependencies for this service.
 *
 * @remarks
 * This is the single authored dependency contract for the service.
 * Keep baseline deps vs service deps as a type-authoring distinction only.
 */
export interface ServiceDeps extends ServiceDepsOf<{
  dbPool: DbPool;
  clock: Clock;
  runtime: Runtime;
}> {}

/**
 * Initial (extended) context for this service.
 */
export type ServiceContext = ServiceContextOf<ServiceDeps, {
  workspaceId?: string;
  requestId?: string;
}>;

/**
 * Bound service authoring surface.
 *
 * @remarks
 * This is a single call to `defineService(...)`, not a second invocation layer.
 * The trailing `()` belongs to that function call itself. The returned object is
 * then used to expose the service-facing authoring surfaces below.
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
 * Declarative setup for contract authoring.
 */
export const ocBase = service.oc;

/**
 * Service-local middleware builder.
 *
 * @remarks
 * Use this for service-authored middleware so:
 * - the required context shape mirrors runtime shape directly
 * - required dependencies stay explicitly declared under `deps`
 * - service metadata is always typed/available on `procedure["~orpc"].meta`
 * - zero-config middleware can call this helper with no type argument
 *
 * This does *not* carry the full service context automatically; middleware
 * should still declare only the minimal required context fragment it actually
 * needs.
 */
export const createServiceMiddleware = service.createMiddleware;

/**
 * Service-local implementer factory.
 *
 * @remarks
 * Use this in `src/service/impl.ts` to bind the root contract to the service
 * context and baseline implementer configuration in one place.
 */
export const createServiceImplementer = service.createImplementer;
