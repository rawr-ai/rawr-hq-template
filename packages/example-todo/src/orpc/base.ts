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
