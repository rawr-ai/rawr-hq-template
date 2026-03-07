/**
 * @fileoverview Internal foundation for the domain-package baseline.
 *
 * @remarks
 * This file holds cycle-free primitives used by baseline middleware and the
 * authored `src/orpc/base.ts` surface. Keep it internal; service and module
 * code should continue to think in terms of `src/orpc/base.ts`.
 */
import type { BaseDeps, BaseMetadata } from "./base";
import {
  createNormalMiddlewareBuilder,
  createServiceProviderBuilder,
  createSharedProviderBuilder,
} from "./factory/middleware";

export type ReservedSemanticLaneKey = "deps" | "scope" | "config" | "invocation";
export type SharedProviderBucketKey = "provided";
export type ReservedContextKey = ReservedSemanticLaneKey | SharedProviderBucketKey;

/**
 * Shared/framework provider output bucket.
 */
export type ProvidedContext<TProvided extends object = {}> = {
  provided: TProvided;
};

/**
 * Baseline lane-aware initial-context shape.
 */
export type BaseContext<
  TDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
  TProvided extends object = {},
> = {
  deps: TDeps;
  scope: TScope;
  config: TConfig;
  invocation: TInvocation;
  provided: TProvided;
};

/**
 * Service-specific initial context.
 */
export type InitialContext<
  TDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
  TProvided extends object = {},
> = BaseContext<TDeps, TScope, TConfig, TInvocation, TProvided>;

/**
 * Service-local initial context extension helper.
 */
export type ServiceContextOf<
  TDeps extends BaseDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
  TProvided extends object = {},
> = InitialContext<TDeps, TScope, TConfig, TInvocation, TProvided>;

const baseMiddlewareMetadata: BaseMetadata = {
  idempotent: true,
};

/**
 * Baseline middleware builder for reusable domain-package middleware.
 */
export function createBaseMiddleware<
  TRequiredContext extends object = {},
>() {
  return createNormalMiddlewareBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}

/**
 * Baseline provider builder for shared/framework middleware.
 */
export function createBaseProvider<
  TRequiredContext extends object = {},
>() {
  return createSharedProviderBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}

/**
 * Service-local provider builder for domain-authored execution context.
 */
export function createBaseServiceProvider<
  TRequiredContext extends object = {},
>() {
  return createServiceProviderBuilder<TRequiredContext, BaseMetadata>({
    baseMetadata: baseMiddlewareMetadata,
  });
}
