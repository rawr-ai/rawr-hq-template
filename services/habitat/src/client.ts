import { createRouterClient, type InferRouterInitialContext } from "@orpc/server";
import { router } from "./service/router";

export { type Contract, contract } from "./service/contract";

type RouterInitialContext = InferRouterInitialContext<typeof router>;

/** Host-supplied ready Effect capabilities used by Habitat operations. */
export type Deps = RouterInitialContext["deps"];

/** Stable absolute workspace binding fixed at client construction. */
export type Scope = RouterInitialContext["scope"];

/** Empty externally supplied configuration lane. */
export type Config = RouterInitialContext["config"];

/** Public construction boundary for one local Habitat client. */
export type CreateClientOptions = Pick<RouterInitialContext, "deps" | "scope" | "config">;

/** Constructs the sole public local client over the private Habitat router. */
export function createClient({ deps, scope, config }: CreateClientOptions) {
  return createRouterClient(router, {
    context: {
      deps,
      scope,
      config,
      invocation: {},
      provided: {},
    } satisfies RouterInitialContext,
  });
}

/** Typed local caller surface derived from the Habitat router. */
export type Client = ReturnType<typeof createClient>;
