/**
 * @fileoverview Local proto-SDK ORPC kit factory for this repo.
 *
 * @remarks
 * This directory is intentionally service-agnostic so it can later be extracted
 * into a shared SDK package. Concrete service values (deps shape, metadata
 * defaults, service-wide middleware) belong in `../service/*`.
 */
import { oc } from "@orpc/contract";
import type { AnyContractRouter } from "@orpc/contract";
import { implement, os } from "@orpc/server";
import type { ImplementerInternalWithMiddlewares } from "@orpc/server";

import type { BaseContext, BaseDeps, BaseMetadata } from "./base";
import type { WithAnalyticsOptions } from "./middleware/with-analytics";
import { withAnalytics } from "./middleware/with-analytics";
import type { WithTelemetryOptions } from "./middleware/with-telemetry";
import { withTelemetry } from "./middleware/with-telemetry";

export type { BaseContext, BaseMetadata, InitialContext } from "./base";

export type CreateOrpcKitOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  /**
   * Default metadata applied to every contract/procedure in the package.
   *
   * @remarks
   * Important: this is intentionally typed as `BaseMetadata` (widened). We do
   * not want TypeScript to infer a literal metadata type (for example
   * `idempotent: true`) from the default value, because that would make later
   * per-procedure overrides like `meta({ idempotent: false })` illegal.
   *
   * If a package wants to extend metadata, it should pass an explicit `TMeta`
   * type parameter to `createOrpcKit<..., TMeta>(...)`.
   */
  baseMetadata: BaseMetadata;
};

/**
 * Create a domain-package kit instance.
 *
 * @remarks
 * The returned builders are the primitives used by:
 * - domain-wide middleware (via `os`)
 * - module contracts (via `oc`)
 *
 * Packages should implement their root contract and attach middleware in
 * `src/orpc.ts`, then derive module implementers from `impl.<module>` subtrees.
 */
export function createOrpcKit<TDeps, TMeta extends BaseMetadata = BaseMetadata>(
  options: CreateOrpcKitOptions<TMeta>,
) {
  const baseContractBuilder = oc.$meta<TMeta>(options.baseMetadata as TMeta);

  const baseMiddlewareBuilder = os
    .$context<BaseContext<TDeps>>()
    .$meta<TMeta>(options.baseMetadata as TMeta);

  return {
    oc: baseContractBuilder,
    os: baseMiddlewareBuilder,
  };
}

// -------------------------------------------------------------------------------------
// Proto-SDK wireframe (membro): smaller, more explicit factories.
//
// Keep `createOrpcKit` above for side-by-side comparison while we converge on
// the right public surface.
// -------------------------------------------------------------------------------------

export type CreateContractBuilderOptions<TMeta extends BaseMetadata = BaseMetadata> = {
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

export type CreateMiddlewareBuilderOptions<TMeta extends BaseMetadata = BaseMetadata> = {
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
 * The proto-SDK baseline is `BaseContext<TDeps>` (deps-only). Services can
 * extend context by choosing a `TContext` that is a supertype of
 * `BaseContext<...>` (for example `InitialContext<TDeps, { requestId: string }>`).
 */
export function createMiddlewareBuilder<
  TContext extends BaseContext<BaseDeps>,
  TMeta extends BaseMetadata = BaseMetadata,
>(
  options: CreateMiddlewareBuilderOptions<TMeta>,
) {
  return os
    .$context<TContext>()
    .$meta<TMeta>(options.baseMetadata as TMeta);
}

export type CreateImplementerOptions = {
  telemetry: WithTelemetryOptions;
  analytics: WithAnalyticsOptions;
};

/**
 * Create the central implementer tree with guaranteed baseline middleware.
 *
 * @remarks
 * Today guaranteed baseline middleware includes telemetry + analytics.
 * Service-specific guards (for example read-only mode) should be layered on by
 * the service after calling this.
 */
export function createImplementer<
  const TContract extends AnyContractRouter,
  TContext extends BaseContext<BaseDeps>,
>(
  contract: TContract,
  options: CreateImplementerOptions,
) {
  const impl = implement(contract).$context<TContext>();

  // TypeScript note:
  // `ContractRouter` is defined as a union (procedure OR router). When this
  // function is generic over `TContract`, oRPC's implementer tree type becomes a
  // conditional/union that causes `.use(...)` to be seen as a union of call
  // signatures. TS then refuses to call it even though runtime behavior is fine.
  //
  // Keep this escape hatch localized: apply guaranteed baseline middleware here
  // once, then return a precisely-typed implementer tree for module code.
  return (impl as any)
    .use(withTelemetry<TContext>(options.telemetry))
    .use(withAnalytics<TContext>(options.analytics)) as ImplementerInternalWithMiddlewares<
    TContract,
    TContext,
    TContext
  >;
}

// -------------------------------------------------------------------------------------
// Mock example: "always-on" analytics (wireframe only).
//
// This is not used by the todo service; it's here to illustrate the pattern:
// - If a middleware is guaranteed baseline, it should be attached here once.
// - Its deps requirements become part of the SDK/service baseline contract.
// -------------------------------------------------------------------------------------

/**
 * Legacy wrapper kept for side-by-side comparison.
 *
 * @remarks
 * `createImplementer` now includes analytics baseline middleware directly, so
 * this wrapper is redundant and exists only to preserve the earlier wireframe.
 */
export type CreateImplementerWithAnalyticsMockOptions = CreateImplementerOptions;

export function createImplementerWithAnalyticsMock<
  const TContract extends AnyContractRouter,
  TContext extends BaseContext<BaseDeps>,
>(
  contract: TContract,
  options: CreateImplementerWithAnalyticsMockOptions,
) {
  return createImplementer<TContract, TContext>(contract, options);
}
