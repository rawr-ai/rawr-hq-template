/**
 * @fileoverview Public package surface for the state package.
 *
 * @remarks
 * Keep this file thin: it is the stable package boundary export surface.
 * Composition lives in `router.ts`; in-process client construction lives in
 * `client.ts`.
 *
 * @agents
 * Export only boundary call surface from this file:
 * - `createClient`
 * - `router`
 * - boundary types (`Client`, `Router`)
 *
 * Do not export repository internals or runtime projection details from package
 * root by default.
 */
export { createClient, type Client } from "./client";
export { router, type Router } from "./router";
