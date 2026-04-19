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
export { createClient, type Client } from "./client";
export { router, type Router } from "./router";
