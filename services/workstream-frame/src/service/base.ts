/**
 * @fileoverview Single service definition seam for the workstream-frame package.
 *
 * @remarks
 * A work stream is a frame with an ordered set of boundaries. Work is pushed
 * through the frame by an iterator; whatever does not fit a boundary is peeled
 * off into a derived item and re-admitted as input. That derived item is the
 * feedback loop, and it is the whole point of the model.
 *
 * This service owns that domain: stream identity, the frame's shape, item
 * admission, advance, peel-off, and resolution. It does not own storage
 * mechanics — those belong to the `semantic-ledger` resource and its providers.
 *
 * Keep this file as the one authoritative declarative service manifest.
 *
 * @agents
 * Read this file to understand what the service is. Storage vocabulary belongs
 * in `modules/streams/repository.ts`; vendor mechanics belong in the resource
 * providers, never here.
 */
import { defineService, type ServiceOf } from "@rawr/hq-sdk";
import type { SemanticLedgerPort } from "@rawr/resource-semantic-ledger";

/** Host-owned time source, so handlers never read the wall clock directly. */
export interface Clock {
  now(): string;
}

/**
 * Construction-time context supplied when the in-process client is created.
 *
 * @remarks
 * `deps` carries host-owned capabilities, `scope` the client-instance identity,
 * and `config` stable package behaviour. The ledger arrives here as a resource
 * port: the service is handed a provisioned capability and never selects or
 * constructs a provider itself.
 */
type InitialContext = {
  deps: {
    ledger: SemanticLedgerPort;
    clock: Clock;
  };
  scope: {
    /** Ledger identity in `name:branch` form, for example `workstream:main`. */
    ledgerName: string;
  };
  config: {
    readOnly: boolean;
  };
};

/** Per-call context supplied at invocation time through the router client. */
type InvocationContext = {
  traceId: string;
};

/** Static procedure metadata authored by the service. */
type ProcedureMetadata = {
  audit?: "none" | "basic" | "full";
  entity?: "service" | "stream" | "item" | "revision";
};

/**
 * Declarative service-wide policy vocabulary.
 *
 * @remarks
 * `itemBlocked` is not an error. A boundary refusing an item is the frame
 * working as designed, so it is emitted as policy rather than raised.
 */
export const policy = {
  events: {
    readOnlyRejected: "workstream.policy.read_only_rejected",
    itemBlocked: "workstream.policy.item_blocked",
  },
} as const;

const service = defineService<{
  initialContext: InitialContext;
  invocationContext: InvocationContext;
  metadata: ProcedureMetadata;
}>({
  metadataDefaults: {
    idempotent: true,
    domain: "workstream",
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

/** Service-local middleware builder for additive module/procedure middleware. */
export const createServiceMiddleware = service.createMiddleware;

/** Additive observability middleware builder for module/procedure scope. */
export const createServiceObservabilityMiddleware = service.createObservabilityMiddleware;

/** The one required service-wide observability middleware builder. */
export const createRequiredServiceObservabilityMiddleware =
  service.createRequiredObservabilityMiddleware;

/** Additive analytics middleware builder for module/procedure scope. */
export const createServiceAnalyticsMiddleware = service.createAnalyticsMiddleware;

/** The one required service-wide analytics middleware builder. */
export const createRequiredServiceAnalyticsMiddleware = service.createRequiredAnalyticsMiddleware;

/** Service-local provider builder for middleware that adds execution context. */
export const createServiceProvider = service.createProvider;

/** Service-local implementer factory, called once in `src/service/impl.ts`. */
export const createServiceImplementer = service.createImplementer;
