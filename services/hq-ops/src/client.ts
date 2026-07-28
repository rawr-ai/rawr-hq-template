/**
 * @fileoverview In-process client factory for the HQ Ops package boundary.
 *
 * @remarks
 * This file owns client creation (`createClient`) and package-boundary wiring.
 * Keep this focused on bootstrap concerns, not module behavior.
 *
 * @agents
 * Consumers should import `createClient` from package root (`index.ts`), not
 * deep-link to this file directly unless explicitly needed for testing.
 */
import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";
import { router } from "./router";

type RouterInitialContext = InferRouterInitialContext<typeof router>;
type Invocation = RouterInitialContext["invocation"];

/** Host-supplied HQ operations capabilities fixed for the lifetime of one client. */
export type Deps = RouterInitialContext["deps"];
/** Stable HQ operations binding identity fixed when the client is constructed. */
export type Scope = RouterInitialContext["scope"];
/** Stable HQ operations behavior configuration fixed when the client is constructed. */
export type Config = RouterInitialContext["config"];
/** Construction boundary that fixes the client's dependency, scope, and configuration lanes. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/**
 * Create an in-process client using the package's canonical construction-time
 * boundary bags.
 */
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

/** Callable HQ operations surface derived from the router with per-call invocation context. */
export type Client = ReturnType<typeof createClient>;
