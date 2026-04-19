/**
 * @fileoverview Public package surface for the example todo domain.
 *
 * @remarks
 * Keep this file thin: it is the stable package boundary export surface.
 * Composition lives in `router.ts`; in-process client construction lives in `client.ts`.
 *
 * @agents
 * Export only boundary call surface from this file:
 * - `createClient`
 * - `router`
 * - boundary types (`Client`, `Router`)
 *
 * Do not export module schemas, repository ports, or runtime dependency shapes
 * from package root by default.
 */
export {
  createClient,
  type Client,
  type Config,
  type CreateClientOptions,
  type Deps,
  type Scope,
} from "./client";
export { router, type Router } from "./router";
