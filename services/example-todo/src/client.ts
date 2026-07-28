import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";

import { router } from "./service/router";

export { type Contract, contract } from "./service/contract";

type RouterInitialContext = InferRouterInitialContext<typeof router>;

/**
 * Host-supplied resource and service capabilities fixed at client construction.
 */
export type Deps = RouterInitialContext["deps"];

/**
 * Stable binding and business identity metadata fixed at client construction.
 */
export type Scope = RouterInitialContext["scope"];

/**
 * Externally supplied stable behavior configuration fixed at client construction.
 */
export type Config = RouterInitialContext["config"];

/** Per-call request facts carried in the client call options. */
export type Invocation = RouterInitialContext["invocation"];

/**
 * Composed construction boundary containing the public dependency, scope, and
 * configuration lanes.
 */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/** Constructs the sole public local client over the private todo service router. */
export function createClient({ deps, scope, config }: CreateClientOptions) {
  return createRouterClient(router, {
    context: ({ invocation }: { invocation: Invocation }) =>
      ({
        deps,
        scope,
        config,
        invocation: { ...invocation },
        provided: {},
      }) satisfies RouterInitialContext,
  });
}

/** Typed local caller surface derived from the todo service router. */
export type Client = ReturnType<typeof createClient>;
