/**
 * @fileoverview Package-boundary helpers for in-process domain-package clients.
 *
 * @remarks
 * This file owns the router-boundary surface used by `src/client.ts`:
 * infer the construction-time bags from router initial context and expose a
 * stable `defineDomainPackage(router)` helper for local client creation.
 */
import { createRouterClient, type AnyRouter, type InferRouterInitialContext, type RouterClient } from "@orpc/server";

/**
 * Extract a specific lane from router initial context.
 */
type InferLane<
  TRouter extends AnyRouter,
  TKey extends keyof InferRouterInitialContext<TRouter>,
> = InferRouterInitialContext<TRouter> extends Record<TKey, infer TValue> ? TValue : never;

export type InferDeps<TRouter extends AnyRouter> = InferLane<TRouter, "deps">;
export type InferScope<TRouter extends AnyRouter> = InferLane<TRouter, "scope">;
export type InferConfig<TRouter extends AnyRouter> = InferLane<TRouter, "config">;
export type InferInvocation<TRouter extends AnyRouter> = InferLane<TRouter, "invocation">;

/**
 * Canonical construction-time boundary for an in-process domain package.
 */
export type DomainBoundary<TRouter extends AnyRouter> = {
  deps: InferDeps<TRouter>;
  scope: InferScope<TRouter>;
  config: InferConfig<TRouter>;
};

/**
 * Shared descriptor for domain packages consumed in-process.
 *
 * @remarks
 * All packages using this helper expose the same bootstrap surface:
 * `domain.createClient({ deps, scope, config })` ->
 * `createRouterClient(router, { context: (clientContext) => ({ ...boundary, invocation: clientContext.invocation }) })`.
 */
export interface DomainPackage<TRouter extends AnyRouter> {
  readonly router: TRouter;
  createClient(boundary: DomainBoundary<TRouter>): RouterClient<TRouter, {
    invocation: InferInvocation<TRouter>;
  }>;
}

/**
 * Bind a router to the standard in-process package boundary.
 */
export function defineDomainPackage<TRouter extends AnyRouter>(
  router: InferRouterInitialContext<TRouter> extends {
    deps: object;
    scope: object;
    config: object;
    invocation: object;
    provided: object;
  } ? TRouter : never,
): DomainPackage<TRouter> {
  return {
    router,
    createClient(boundary) {
      return createRouterClient(router, {
        context: (clientContext: { invocation: InferInvocation<TRouter> }) => ({
          deps: boundary.deps,
          scope: boundary.scope,
          config: boundary.config,
          invocation: {
            ...(clientContext.invocation as object),
          } as InferInvocation<TRouter>,
          provided: {},
        }) as InferRouterInitialContext<TRouter>,
      });
    },
  };
}
