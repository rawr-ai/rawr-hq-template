/**
 * @fileoverview In-process client factory for the todo package boundary.
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
  defineDomainPackage,
  type DomainBoundary,
  type InferConfig,
  type InferDeps,
  type InferScope,
} from "./orpc/package-boundary";
import { router } from "./router";

const domain = defineDomainPackage(router);

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
export type CreateClientOptions = DomainBoundary<typeof router>;

/**
 * Create an in-process client using the package's canonical construction-time
 * boundary bags.
 */
export function createClient(boundary: CreateClientOptions) {
  return domain.createClient(boundary);
}

export type Client = ReturnType<typeof createClient>;
