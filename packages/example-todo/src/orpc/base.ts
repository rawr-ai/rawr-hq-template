/**
 * @fileoverview Domain-package baseline definitions for the proto oRPC SDK.
 *
 * @remarks
 * This file defines the stable base layer for domain packages:
 * baseline deps, baseline metadata, initial-context shape, baseline middleware
 * binding, baseline implementer binding, and package-boundary helper types.
 */
import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import { createBaseAnalyticsMiddleware } from "./middleware/analytics";
import { createBaseObservabilityMiddleware } from "./middleware/observability";
import {
  createBareProcedureImplementer,
  createBareRouterImplementer,
} from "./factory/implementer";
import type {
  DeclaredContext,
  ExecutionContext,
  ORPCInitialContext,
  ProvidedContext,
  RequiredExtensionExecutionContext,
  ReservedContextKey,
  ReservedSemanticLaneKey,
} from "./base-foundation";

/**
 * Canonical logger contract used by baseline middleware.
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Canonical analytics client contract used by baseline middleware.
 */
export interface AnalyticsClient {
  track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
}

/**
 * Minimum dependency contract expected by domain packages.
 */
export interface BaseDeps {
  logger: Logger;
  analytics: AnalyticsClient;
}

/**
 * Service-local dependency extension helper.
 */
export type ServiceDepsOf<T extends object> = BaseDeps & T;

/**
 * Baseline procedure metadata shared across packages.
 */
export type BaseMetadata = {
  idempotent: boolean;
  domain?: string;
  audience?: string;
};

/**
 * Service-local metadata extension helper.
 */
export type ServiceMetadataOf<T extends object = {}> = BaseMetadata & T;

/**
 * Compose the canonical service boundary types from one declaration shape.
 *
 * @remarks
 * This helper is the safe way to derive a service's composed `Deps`,
 * `Metadata`, and context projections from one declaration block while still
 * preserving the baseline helper seam internally.
 *
 * Do not replace this with casts or ad hoc widened object types. If a future
 * helper cannot preserve `ServiceDepsOf`, `ServiceMetadataOf`, and the
 * execution-context projections, the helper is wrong and should be redesigned
 * rather than patched over with silent typing workarounds.
 */
export type ServiceTypesOf<
  T extends ServiceDeclaration,
> = {
  Deps: ServiceDepsOf<T["initialContext"]["deps"]>;
  Scope: T["initialContext"]["scope"];
  Config: T["initialContext"]["config"];
  Invocation: T["invocationContext"];
  Metadata: ServiceMetadataOf<T["metadata"]>;
  DeclaredContext: DeclaredContext<
    ServiceDepsOf<T["initialContext"]["deps"]>,
    T["initialContext"]["scope"],
    T["initialContext"]["config"]
  >;
  ORPCInitialContext: ORPCInitialContext<
    ServiceDepsOf<T["initialContext"]["deps"]>,
    T["initialContext"]["scope"],
    T["initialContext"]["config"],
    T["invocationContext"]
  >;
  ExecutionContext: ExecutionContext<
    ServiceDepsOf<T["initialContext"]["deps"]>,
    T["initialContext"]["scope"],
    T["initialContext"]["config"],
    T["invocationContext"]
  >;
  RequiredExtensionExecutionContext: RequiredExtensionExecutionContext<
    ServiceDepsOf<T["initialContext"]["deps"]>,
    T["initialContext"]["scope"],
    T["initialContext"]["config"],
    T["invocationContext"]
  >;
};

/**
 * Canonical service declaration shape for `defineService(...)`.
 *
 * @remarks
 * Author-facing service definitions should declare the service through three
 * semantic categories:
 * - `initialContext`: construction-time context supplied when the client is created
 * - `invocationContext`: per-call context supplied at procedure invocation time
 * - `metadata`: static procedure metadata authored by the service
 *
 * The SDK derives the composed `Deps`, `Metadata`, and execution-context
 * projections internally from those grouped categories.
 */
type ServiceInitialContextDeclaration = Pick<
  DeclaredContext<object, object, object>,
  "deps" | "scope" | "config"
>;

export type ServiceDeclaration = {
  initialContext: ServiceInitialContextDeclaration;
  invocationContext: object;
  metadata: object;
};

/**
 * Internal canonical service-type shape used by SDK helpers.
 *
 * @remarks
 * Author-facing code should prefer `defineService<{ ... }>(...)` plus
 * `ServiceOf<typeof service>` as the primary seam. Projection helpers below are
 * for SDK internals; they should not become the normal authoring pattern.
 */
export type AnyService = ServiceTypesOf<ServiceDeclaration>;

export type ServiceDepsFrom<TService extends AnyService> = TService["Deps"];
export type ServiceScopeFrom<TService extends AnyService> = TService["Scope"];
export type ServiceConfigFrom<TService extends AnyService> = TService["Config"];
export type ServiceInvocationFrom<TService extends AnyService> = TService["Invocation"];
export type ServiceMetadataFrom<TService extends AnyService> = TService["Metadata"];
export type ServiceDeclaredContextFrom<TService extends AnyService> = TService["DeclaredContext"];
export type ServiceORPCInitialContextFrom<TService extends AnyService> = TService["ORPCInitialContext"];
export type ServiceExecutionContextFrom<TService extends AnyService> = TService["ExecutionContext"];
export type ServiceRequiredExtensionExecutionContextFrom<TService extends AnyService> =
  TService["RequiredExtensionExecutionContext"];

export type {
  DeclaredContext,
  ExecutionContext,
  ORPCInitialContext,
  ProvidedContext,
  RequiredExtensionExecutionContext,
  ReservedContextKey,
  ReservedSemanticLaneKey,
} from "./base-foundation";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

/**
 * Create the central domain-package implementer tree with guaranteed framework
 * baseline middleware.
 */
export function createBaseProcedureImplementer<
 const TContract extends AnyContractProcedure,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
) {
  return createBareProcedureImplementer<TContract, TContext>(contract)
    .use(createBaseObservabilityMiddleware())
    .use(createBaseAnalyticsMiddleware());
}

/**
 * Create the central domain-package router implementer tree with guaranteed
 * framework baseline middleware.
 */
export function createBaseRouterImplementer<
 const TContract extends AnyContractRouterObject,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
) {
  return createBareRouterImplementer<TContract, TContext>(contract)
    .use(createBaseObservabilityMiddleware())
    .use(createBaseAnalyticsMiddleware());
}

export function createBaseImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBaseImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends ExecutionContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBaseImplementer(
  contract: AnyContractRouter,
) {
  if (isContractProcedure(contract)) {
    return createBaseProcedureImplementer(contract);
  }

  return createBaseRouterImplementer(contract as AnyContractRouterObject);
}
