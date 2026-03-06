/**
 * @fileoverview Package-boundary helpers for in-process domain-package clients.
 *
 * @remarks
 * This file owns the router-boundary surface used by `src/client.ts`:
 * infer the dependency bag from router initial context and expose a stable
 * `defineDomainPackage(router)` helper for local client creation.
 */
import { createRouterClient, type AnyRouter, type InferRouterInitialContext, type RouterClient } from "@orpc/server";
import type { BaseDeps } from "./base";

/**
 * Extracts the canonical dependency bag type from an oRPC router that expects
 * initial context shaped as `{ deps: ... }`.
 */
export type InferDeps<TRouter extends AnyRouter> =
  InferRouterInitialContext<TRouter> extends { deps: infer TDeps } ? TDeps : never;

/**
 * Shared descriptor for domain packages consumed in-process.
 *
 * @remarks
 * All packages using this helper expose the same bootstrap surface:
 * `domain.createClient(deps)` -> `createRouterClient(router, { context: { deps } })`.
 */
export interface DomainPackage<TRouter extends AnyRouter> {
  readonly router: TRouter;
  createClient(deps: InferDeps<TRouter>): RouterClient<TRouter>;
}

/**
 * Bind a router to the standard in-process package boundary.
 */
export function defineDomainPackage<TRouter extends AnyRouter>(
  router: InferRouterInitialContext<TRouter> extends { deps: BaseDeps } ? TRouter : never,
): DomainPackage<TRouter> {
  return {
    router,
    createClient(deps) {
      return createRouterClient(router, {
        context: { deps } as InferRouterInitialContext<TRouter>,
      });
    },
  };
}
