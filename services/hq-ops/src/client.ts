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
import {
  defineServicePackage,
  type InferConfig,
  type InferDeps,
  type InferScope,
  type ServicePackageBoundary,
} from "@rawr/hq-sdk/boundary";
import { router } from "./router";

const servicePackage = defineServicePackage(router);

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
export type CreateClientOptions = ServicePackageBoundary<typeof router>;

/**
 * Create an in-process client using the package's canonical construction-time
 * boundary bags.
 */
export function createClient(boundary: CreateClientOptions) {
  return servicePackage.createClient(boundary);
}

export type Client = ReturnType<typeof createClient>;
