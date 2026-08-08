import type { RouterContractClient } from "@orpc/contract";
import { createRouterClient } from "@orpc/server";
import type { Context } from "./service/base.js";
import { type Contract, contract } from "./service/contract.js";
import { router } from "./service/router.js";

export { type Contract, contract };

/** Host-supplied ready Effect capabilities used by Habitat operations. */
export type Deps = Context["deps"];

/** Stable absolute workspace binding fixed at client construction. */
export type Scope = Context["scope"];

/** App-selected policy-pack locators admitted by the Habitat service. */
export type Config = Context["config"];

/** Public construction boundary for one local Habitat client. */
export type CreateClientOptions = Pick<Context, "deps" | "scope" | "config">;

/** Typed local caller surface derived from the public Habitat contract. */
export type Client = RouterContractClient<Contract>;

/** Constructs the sole public local client over the private Habitat router. */
export function createClient({ deps, scope, config }: CreateClientOptions): Client {
  return createRouterClient(router, {
    context: {
      deps,
      scope,
      config,
      invocation: {},
      provided: {},
    } satisfies Context,
  });
}
