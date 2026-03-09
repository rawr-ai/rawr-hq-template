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

import { createBaseObservabilityMiddleware } from "./middleware/observability";
import {
  createBareProcedureImplementer,
  createBareRouterImplementer,
} from "./factory/implementer";
import type {
  BaseContext,
  InitialContext,
  ProvidedContext,
  ReservedContextKey,
  ReservedSemanticLaneKey,
  ServiceContextOf,
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
 * `Metadata`, and lane-aware `Context` types from one declaration block while
 * still preserving the baseline helper seam internally.
 *
 * Do not replace this with casts or ad hoc widened object types. If a future
 * helper cannot preserve `ServiceDepsOf`, `ServiceMetadataOf`, and
 * `ServiceContextOf`, the helper is wrong and should be redesigned rather than
 * patched over with silent typing workarounds.
 */
export type ServiceTypesOf<
  T extends ServiceDeclaration,
> = {
  Deps: ServiceDepsOf<T["deps"]>;
  Scope: T["scope"];
  Config: T["config"];
  Invocation: T["invocation"];
  Metadata: ServiceMetadataOf<T["metadata"]>;
  Context: ServiceContextOf<
    ServiceDepsOf<T["deps"]>,
    T["scope"],
    T["config"],
    T["invocation"]
  >;
};

/**
 * Canonical service declaration shape for `defineService(...)`.
 *
 * @remarks
 * Author-facing service definitions should declare these five lane fragments
 * once and let the SDK derive the composed `Deps`, `Metadata`, and `Context`
 * types internally.
 */
export type ServiceDeclaration = {
  deps: object;
  scope: object;
  config: object;
  invocation: object;
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
export type ServiceContextFrom<TService extends AnyService> = TService["Context"];

export type {
  BaseContext,
  InitialContext,
  ProvidedContext,
  ReservedContextKey,
  ReservedSemanticLaneKey,
  ServiceContextOf,
} from "./base-foundation";

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

/**
 * Create the central domain-package implementer tree with guaranteed baseline
 * observability middleware.
 */
export function createBaseProcedureImplementer<
 const TContract extends AnyContractProcedure,
  TContext extends BaseContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
) {
  return createBareProcedureImplementer<TContract, TContext>(contract)
    .use(createBaseObservabilityMiddleware());
}

/**
 * Create the central domain-package router implementer tree with guaranteed
 * baseline observability middleware.
 */
export function createBaseRouterImplementer<
 const TContract extends AnyContractRouterObject,
  TContext extends BaseContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
) {
  return createBareRouterImplementer<TContract, TContext>(contract)
    .use(createBaseObservabilityMiddleware());
}

export function createBaseImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends BaseContext<BaseDeps, object, object, object>,
>(
  contract: TContract,
): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBaseImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends BaseContext<BaseDeps, object, object, object>,
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
