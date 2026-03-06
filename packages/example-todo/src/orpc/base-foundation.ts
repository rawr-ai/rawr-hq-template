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
