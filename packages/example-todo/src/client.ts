/**
 * @fileoverview In-process client factory for the todo package boundary.
 *
 * @remarks
 * This file owns client creation (`createClient`) and domain-package wrapping.
 * Keep this focused on package boundary wiring, not module behavior.
 *
 * @agents
 * Consumers should import `createClient` from package root (`index.ts`), not
 * deep-link to this file directly unless explicitly needed for testing.
 */
import { defineDomainPackage, type InferDeps } from "./orpc-sdk";
import { router } from "./router";

const domain = defineDomainPackage(router);

export type Deps = InferDeps<typeof router>;

export function createClient(deps: Deps) {
  return domain.createClient(deps);
}

export type Client = ReturnType<typeof createClient>;
