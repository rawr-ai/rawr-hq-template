/**
 * @fileoverview Public package surface for the agent-config-sync service package.
 *
 * @remarks
 * Keep this file thin: it is the stable package boundary export surface.
 * Composition lives in `router.ts`; in-process client construction lives in `client.ts`.
 */
export { createClient, type Client, type CreateClientOptions } from "./client";
export { router, type Router } from "./router";
