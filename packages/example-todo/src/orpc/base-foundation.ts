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
 * Service-declared stable input lanes.
 *
 * @remarks
 * This is the narrow context declaration authored by the service definition.
 * It does not include per-call invocation input or execution-time provided
 * resources.
 */
export type DeclaredContext<
  TDeps,
  TScope extends object = {},
  TConfig extends object = {},
> = {
  deps: TDeps;
  scope: TScope;
  config: TConfig;
};

/**
 * The initial execution seed assembled at the package boundary.
 *
 * @remarks
 * This is the full context object handed into oRPC before middleware begins to
 * evolve execution-time context.
 */
export type ORPCInitialContext<
  TDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
> = DeclaredContext<TDeps, TScope, TConfig> & {
  invocation: TInvocation;
  provided: {};
};

/**
 * The evolving execution view seen by middleware and handlers.
 *
 * @remarks
 * Middleware composition may widen `provided` over time, but the semantic lanes
 * remain the same.
 */
export type ExecutionContext<
  TDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
  TProvided extends object = {},
> = DeclaredContext<TDeps, TScope, TConfig> & {
  invocation: TInvocation;
  provided: TProvided;
};

/**
 * Execution context available to required service middleware extensions.
 *
 * @remarks
 * Required service extensions run before provider-added execution resources are
 * available and therefore never see `provided`.
 */
export type RequiredExtensionExecutionContext<
  TDeps extends BaseDeps,
  TScope extends object = {},
  TConfig extends object = {},
  TInvocation extends object = {},
> = DeclaredContext<TDeps, TScope, TConfig> & {
  invocation: TInvocation;
};

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
