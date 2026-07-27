import {
  defineServicePackage,
  type InferConfig,
  type InferDeps,
  type InferInvocation,
  type InferScope,
  type ServicePackageBoundary,
} from "@rawr/hq-sdk/boundary";

import { router } from "./service/router";

export { type Contract, contract } from "./service/contract";

const servicePackage = defineServicePackage(router);

/**
 * Host-supplied resource and service capabilities fixed at client construction.
 */
export type Deps = InferDeps<typeof router>;

/**
 * Stable binding and business identity metadata fixed at client construction.
 */
export type Scope = InferScope<typeof router>;

/**
 * Externally supplied stable behavior configuration fixed at client construction.
 */
export type Config = InferConfig<typeof router>;

/** Per-call request facts carried in the client call options. */
export type Invocation = InferInvocation<typeof router>;

/**
 * Composed construction boundary containing the public dependency, scope, and
 * configuration lanes.
 */
export type CreateClientOptions = ServicePackageBoundary<typeof router>;

/** Constructs the sole public local client over the private todo service router. */
export function createClient(boundary: CreateClientOptions) {
  return servicePackage.createClient(boundary);
}

/** Typed local caller surface derived from the todo service router. */
export type Client = ReturnType<typeof createClient>;
