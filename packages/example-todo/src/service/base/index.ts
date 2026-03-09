/**
 * @fileoverview Service definition manifest for the todo package.
 *
 * @remarks
 * This directory is the service base-construction layer:
 * - shared service-base types
 * - shared procedure metadata defaults
 * - the bound service authoring surfaces exported to the rest of the package
 * - baseline concern profiles imported from sibling files
 *
 * Keep this file as the assembly manifest. Rich concern logic belongs in the
 * sibling files under `src/service/base/`.
 */
import { defineService } from "../../orpc-sdk";
import { analytics } from "./analytics";
import { observability } from "./observability";
import { policy } from "./policy";
export type {
  Clock,
  Service,
} from "./types";
import type { Service } from "./types";

/**
 * Bound service authoring surface.
 *
 * @remarks
 * `defineService(...)` binds the service-local authoring surfaces once:
 * contract authoring, service middleware authoring, and implementer creation.
 * The `base` property assembles the baseline concern profiles imported from the
 * sibling files in this directory, and `createServiceImplementer(...)`
 * auto-attaches those service-wide defaults for every procedure. Keep baseline
 * concern behavior there and keep this file focused on assembly.
 */
const service = defineService<Service>({
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
 * Use this for additive service-authored middleware outside the baseline
 * profiles in this directory.
 *
 * Typical attachment points:
 * - module-level additions in module `setup.ts` files
 * - procedure-level additions in module `router.ts` files
 *
 * Do not use this to recreate the default service-wide baseline middleware
 * already declared under `service/base/`.
 * Declare only the minimal required lane fragments or execution context
 * additions; do not restate the full `ServiceContext`.
 */
export const createServiceMiddleware = service.createMiddleware;

/**
 * Service-local additive observability middleware builder.
 *
 * @remarks
 * Use this for module- or procedure-level observability additions on top of
 * the automatic service-wide baseline declared in this directory.
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
 * automatic service-wide baseline declared in this directory.
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
 * assembly options in every implementation file. The returned implementer
 * already includes the baseline concern profiles from this directory.
 */
export const createServiceImplementer = service.createImplementer;
