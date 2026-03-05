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
import type { Deps } from "./service/deps";
import { createRouterClient } from "@orpc/server";
import type { InitialContext } from "./orpc-sdk";
import { router } from "./router";

// -------------------------------------------------------------------------------------
// PREVIOUS (SDK helper) client wiring:
//
//   import { defineDomainPackage } from "./orpc-sdk";
//   const domain = defineDomainPackage(router);
//   export function createClient(deps: Deps) {
//     return domain.createClient(deps);
//   }
//
// This is temporarily commented out while we validate that the SDK helper still
// matches the current oRPC composition model.
// -------------------------------------------------------------------------------------

export function createClient(deps: Deps) {
  return createRouterClient(router, {
    context: { deps } as InitialContext<Deps>,
  });
}

export type Client = ReturnType<typeof createClient>;
