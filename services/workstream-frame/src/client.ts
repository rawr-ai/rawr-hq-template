/**
 * @fileoverview In-process client factory for the workstream-frame boundary.
 *
 * @agents
 * Consumers should import `createClient` from package root (`index.ts`).
 */
import {
  defineServicePackage,
  type InferConfig,
  type InferDeps,
  type InferScope,
  type ServicePackageBoundary,
} from "@rawr/hq-sdk/boundary";
import { router } from "./service/router";

const servicePackage = defineServicePackage(router);

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
/**
 * Construction-time boundary bags a host supplies to build the client.
 *
 * @remarks
 * Carries the provisioned ledger port, clock, and host adapters in `deps`, the
 * ledger identity in `scope`, and behaviour flags in `config`.
 */
export type CreateClientOptions = ServicePackageBoundary<typeof router>;

/** Create an in-process client from the package's construction-time boundary bags. */
export function createClient(boundary: CreateClientOptions) {
  return servicePackage.createClient(boundary);
}

/** In-process client exposing every stream procedure. */
export type Client = ReturnType<typeof createClient>;
