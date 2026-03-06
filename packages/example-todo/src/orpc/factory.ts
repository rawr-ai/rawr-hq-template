/**
 * @fileoverview Local proto-SDK oRPC factories for this repo.
 *
 * @remarks
 * This directory is intentionally service-agnostic so it can later be extracted
 * into a shared SDK package. Concrete service values (deps shape, metadata
 * defaults, service-wide middleware) belong in `../service/*`.
 */
import { oc } from "@orpc/contract";
import { isContractProcedure } from "@orpc/contract";
import type { AnyContractProcedure, AnyContractRouter } from "@orpc/contract";
import { implement, os } from "@orpc/server";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import type { BaseContext, BaseDeps, BaseMetadata } from "./base";
import { createAnalyticsMiddleware } from "./middleware/analytics";
import { createTelemetryMiddleware } from "./middleware/telemetry";

export type { BaseContext, BaseMetadata, InitialContext } from "./base";

type CreateContractBuilderOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  /**
   * Default metadata applied to every contract/procedure in the service.
   *
   * @remarks
   * Intentionally widened to `BaseMetadata` to prevent literal inference.
   * Services extend metadata by supplying an explicit `TMeta` type parameter.
   */
  baseMetadata: BaseMetadata;
};

export function createContractBuilder<TMeta extends BaseMetadata = BaseMetadata>(
  options: CreateContractBuilderOptions<TMeta>,
) {
  return oc.$meta<TMeta>(options.baseMetadata as TMeta);
}

type CreateMiddlewareBuilderOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  /**
   * Default metadata applied to every procedure; available to middleware via
   * `procedure["~orpc"].meta`.
   *
   * @remarks
   * Intentionally widened to `BaseMetadata` to prevent literal inference.
   */
  baseMetadata: BaseMetadata;
};

/**
 * Create an oRPC server builder for authoring middleware.
 *
 * @remarks
 * This helper standardizes middleware authoring around the runtime shape we
 * want to preserve:
 * - required dependencies stay explicitly nested under a top-level `deps` bag
 * - any additional request/execution input stays as explicit top-level keys
 * - metadata typing is carried by the builder so middleware can read
 *   `procedure["~orpc"].meta` without redefining metadata locally
 */
export function createMiddlewareBuilder<
  TRequiredContext extends { deps: object } = { deps: {} },
  TMeta extends BaseMetadata = BaseMetadata,
>(
  options: CreateMiddlewareBuilderOptions<TMeta>,
) {
  return os
    .$context<TRequiredContext>()
    .$meta<TMeta>(options.baseMetadata as TMeta);
}

type DefineServiceOptions<TMeta extends BaseMetadata> = {
  metadata: TMeta;
};

/**
 * Bind service metadata to the authoring surfaces that need it.
 *
 * @remarks
 * This helper is intentionally small. It owns only:
 * - contract authoring
 * - service-local middleware authoring
 *
 * Concrete service types (`ServiceDeps`, `ServiceMetadata`, `ServiceContext`)
 * stay explicit in `src/service/base.ts`.
 */
export function defineService<TMeta extends BaseMetadata>(
  options: DefineServiceOptions<TMeta>,
) {
  return {
    oc: createContractBuilder<TMeta>({ baseMetadata: options.metadata }),
    createMiddleware<
      TRequiredContext extends { deps: object } = { deps: {} },
    >() {
      return createMiddlewareBuilder<TRequiredContext, TMeta>({
        baseMetadata: options.metadata,
      });
    },
  };
}

const baseMiddlewareMetadata: BaseMetadata = {
  idempotent: true,
};

/**
 * Baseline middleware builder for reusable SDK/framework middleware.
 *
 * @remarks
 * This mirrors the service-local helper, but carries only `BaseMetadata`.
 * Reusable middleware should author the minimal required context fragment and
 * should not depend on service-specific metadata extensions.
 */
export function createBaseMiddleware<
  TRequiredContext extends { deps: object } = { deps: {} },
>() {
  return createMiddlewareBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}

type CreateImplementerOptions = {
  telemetry: { defaultDomain: string };
  analytics: { app: string };
};

type AnyContractRouterObject = {
  [k: string]: AnyContractRouter;
};

/**
 * Create the central implementer tree with guaranteed baseline middleware.
 *
 * @remarks
 * Today guaranteed baseline middleware includes telemetry + analytics.
 * Service-specific guards (for example read-only mode) should be layered on by
 * the service after calling this.
 */
export function createProcedureImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends BaseContext<BaseDeps>,
>(contract: TContract, options: CreateImplementerOptions) {
  return implement(contract)
    .$context<TContext>()
    .use(createTelemetryMiddleware(options.telemetry))
    .use(createAnalyticsMiddleware(options.analytics));
}

export function createRouterImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends BaseContext<BaseDeps>,
>(contract: TContract, options: CreateImplementerOptions) {
  return implement(contract)
    .$context<TContext>()
    .use(createTelemetryMiddleware(options.telemetry))
    .use(createAnalyticsMiddleware(options.analytics));
}

export function createImplementer<
  const TContract extends AnyContractProcedure,
  TContext extends BaseContext<BaseDeps>,
>(contract: TContract, options: CreateImplementerOptions): ImplementerInternalWithMiddlewares<
  TContract,
  TContext,
  TContext
>;
export function createImplementer<
  const TContract extends AnyContractRouterObject,
  TContext extends BaseContext<BaseDeps>,
>(contract: TContract, options: CreateImplementerOptions): ImplementerInternalWithMiddlewares<
  TContract,
  TContext,
  TContext
>;
export function createImplementer(
  contract: AnyContractRouter,
  options: CreateImplementerOptions,
) {
  if (isContractProcedure(contract)) {
    return createProcedureImplementer(contract, options);
  }

  // TypeScript note:
  // `ContractRouter` is defined as a union (procedure OR router-object). After
  // runtime narrowing, TS cannot prove the remaining branch is a router-object,
  // so we assert it once here (instead of `as any`-casting the `.use(...)` chain).
  return createRouterImplementer(contract as AnyContractRouterObject, options);
}
