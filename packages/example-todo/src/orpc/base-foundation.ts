/**
 * @fileoverview Internal foundation for the domain-package baseline.
 *
 * @remarks
 * This file holds cycle-free primitives used by baseline middleware and the
 * authored `src/orpc/base.ts` surface. Keep it internal; service and module
 * code should continue to think in terms of `src/orpc/base.ts`.
 */
import type { BaseDeps, BaseMetadata } from "./base";
import { createMiddlewareBuilder } from "./factory/middleware";

/**
 * Baseline lane-aware initial-context shape.
 */
export type BaseContext<
  TDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
> = {
  deps: TDeps;
  scope: TScope;
  config: TConfig;
  invocation: TInvocation;
};

/**
 * Service-specific initial context.
 */
export type InitialContext<
  TDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
> = BaseContext<TDeps, TScope, TConfig, TInvocation>;

/**
 * Service-local initial context extension helper.
 */
export type ServiceContextOf<
  TDeps extends BaseDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
> = InitialContext<TDeps, TScope, TConfig, TInvocation>;

const baseMiddlewareMetadata: BaseMetadata = {
  idempotent: true,
};

/**
 * Baseline middleware builder for reusable domain-package middleware.
 */
export function createBaseMiddleware<
  TRequiredContext extends object = {},
>() {
  return createMiddlewareBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}
