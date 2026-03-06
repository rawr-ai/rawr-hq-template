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

import { createAnalyticsMiddleware } from "./middleware/analytics";
import { createTelemetryMiddleware } from "./middleware/telemetry";
import {
  createBareProcedureImplementer,
  createBareRouterImplementer,
} from "./factory/implementer";
import { createMiddlewareBuilder } from "./factory/middleware";

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
 * Baseline initial-context shape.
 */
export type BaseContext<TDeps> = {
  deps: TDeps;
};

/**
 * Service-specific initial context.
 */
export type InitialContext<TDeps, TExt extends object = {}> = BaseContext<TDeps> & TExt;

/**
 * Service-local initial context extension helper.
 */
export type ServiceContextOf<TDeps extends BaseDeps, TExtra extends object = {}> = InitialContext<TDeps, TExtra>;

export type BaseImplementerOptions = {
  telemetry: { defaultDomain: string };
  analytics: { app: string };
};

const baseMiddlewareMetadata: BaseMetadata = {
  idempotent: true,
};

/**
 * Baseline middleware builder for reusable domain-package middleware.
 */
export function createBaseMiddleware<
  TRequiredContext extends { deps: object } = { deps: {} },
>() {
  return createMiddlewareBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

/**
 * Create the central domain-package implementer tree with guaranteed baseline
 * observability middleware.
 */
export function createBaseProcedureImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends BaseContext<BaseDeps>,
>(
  contract: TContract,
  options: BaseImplementerOptions,
) {
  return createBareProcedureImplementer<TContract, TContext>(contract)
    .use(createTelemetryMiddleware(options.telemetry))
    .use(createAnalyticsMiddleware(options.analytics));
}

/**
 * Create the central domain-package router implementer tree with guaranteed
 * baseline observability middleware.
 */
export function createBaseRouterImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends BaseContext<BaseDeps>,
>(
  contract: TContract,
  options: BaseImplementerOptions,
) {
  return createBareRouterImplementer<TContract, TContext>(contract)
    .use(createTelemetryMiddleware(options.telemetry))
    .use(createAnalyticsMiddleware(options.analytics));
}

export function createBaseImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends BaseContext<BaseDeps>,
>(
  contract: TContract,
  options: BaseImplementerOptions,
): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBaseImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends BaseContext<BaseDeps>,
>(
  contract: TContract,
  options: BaseImplementerOptions,
): ImplementerInternalWithMiddlewares<TContract, TContext, TContext>;
export function createBaseImplementer(
  contract: AnyContractRouter,
  options: BaseImplementerOptions,
) {
  if (isContractProcedure(contract)) {
    return createBaseProcedureImplementer(contract, options);
  }

  return createBaseRouterImplementer(contract as AnyContractRouterObject, options);
}
