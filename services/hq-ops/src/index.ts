/// <reference path="./shims/bun-sqlite.d.ts" />

/**
 * @fileoverview Public package surface for the HQ Ops service package.
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
 * Do not export internal module seams or runtime dependency shapes from package
 * root by default.
 */
export {
  type Client,
  type Config,
  type CreateClientOptions,
  createClient,
  type Deps,
  type Scope,
} from "./client";
export { type Router, router } from "./router";
