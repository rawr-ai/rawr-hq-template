/**
 * @fileoverview Single service definition seam for the HQ Ops package.
 *
 * @remarks
 * Author the HQ Ops service boundary and its declarative service-wide concerns
 * once in this file:
 * - the canonical service declaration
 * - service-wide metadata defaults and policy vocabulary
 * - the bound service authoring surfaces exported to the rest of the package
 *
 * Keep this file as the one authoritative declarative service manifest.
 * Runtime observability behavior does not live here; required service
 * middleware extensions are authored in `src/service/middleware/*` and supplied
 * at the implementer seam. Module- and procedure-local behavior still belongs
 * in module `module.ts` / `router.ts` files. Lower-level construction
 * primitives come from `@rawr/hq-sdk`.
 *
 * @agents
 * Read this file to understand what the service is. Do not add runtime
 * observability or analytics behavior here; that belongs in
 * `src/service/middleware/*`.
 */
import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type { HqOpsResources } from "./shared/ports/resources";

/**
 * Construction-time context supplied when the in-process client is created.
 *
 * @remarks
 * This is the service's declared stable input surface:
 * - `deps`: stable host-owned prerequisites and capabilities
 * - `scope`: stable business/client-instance identity
 * - `config`: stable package behavior/configuration
 *
 * These lanes are always present in downstream execution context. Provider-
 * derived execution resources do not belong here and instead arrive later under
 * `context.provided.*`.
 */
type InitialContext = {
  deps: {
    resources: HqOpsResources;
  };
  scope: {
    repoRoot: string;
  };
  config: {};
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
 * This is not execution context.
 */
type ProcedureMetadata = {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "config" | "repoState" | "journal" | "security" | "pluginInstall" | "pluginLifecycle";
};

/**
 * Declarative service-wide policy vocabulary.
 *
 * @remarks
 * U02 reserves the vocabulary seam without adding service-specific policy
 * events yet.
 */
export const policy = {
  events: {},
} as const;

/**
 * Bound HQ Ops service definition.
 *
 * @remarks
 * Declare the full service boundary once here through three semantic groups:
 * - `initialContext`: declared stable lanes supplied by the client up front
 * - `invocationContext`: per-call context supplied at invocation time
 * - `metadata`: static procedure metadata authored by the service
 */
const service = defineService<{
  initialContext: InitialContext;
  invocationContext: InvocationContext;
  metadata: ProcedureMetadata;
}>({
  metadataDefaults: {
    idempotent: true,
    domain: "hq-ops",
    audience: "internal",
    audit: "basic",
    entity: "service",
  },
  baseline: {
    policy,
  },
});

/** Canonical service type projected from the defined service value. */
export type Service = ServiceOf<typeof service>;

/** Contract authoring surface for module contracts. */
export const ocBase = service.oc;

/**
 * Service-local middleware builder.
 *
 * @remarks
 * Use this for additive service-authored middleware outside the baseline
 * declarative concerns defined in this file.
 */
export const createServiceMiddleware = service.createMiddleware;

/**
 * Service-local additive observability middleware builder.
 *
 * @remarks
 * Use this for module- or procedure-level observability additions on top of
 * the required service observability extension attached in `src/service/impl.ts`.
 */
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;

/**
 * Required service-wide observability middleware builder.
 *
 * @remarks
 * Use this only for the one required service-wide observability middleware
 * attached in `src/service/impl.ts`.
 */
export const createRequiredServiceObservabilityMiddleware = service.createRequiredObservabilityMiddleware;

/**
 * Service-local additive analytics middleware builder.
 *
 * @remarks
 * Use this for module- or procedure-level analytics additions on top of the
 * required service analytics extension attached in `src/service/impl.ts`.
 */
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;

/**
 * Required service-wide analytics middleware builder.
 *
 * @remarks
 * Use this only for the one required service-wide analytics middleware
 * attached in `src/service/impl.ts`.
 */
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;

/**
 * Service-local provider builder.
 *
 * @remarks
 * Use this when service-authored middleware needs to add downstream execution
 * context. Service-local providers write into `context.provided.*`; they do not
 * mutate or shadow the reserved semantic lanes.
 */
export const createServiceProvider = service.createProvider;

/**
 * Service-local implementer factory.
 *
 * @remarks
 * `src/service/impl.ts` imports the root contract and calls this once,
 * supplying the required service middleware extensions.
 */
export const createServiceImplementer = service.createImplementer;
