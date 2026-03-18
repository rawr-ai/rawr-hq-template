import type { BaseDeps } from "../baseline/types";

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
