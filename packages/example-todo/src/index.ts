/**
 * @fileoverview Public package surface for the example todo domain.
 *
 * @remarks
 * Keep this file thin: it is the stable package boundary export surface.
 * Composition lives in `router.ts`; in-process client construction lives in
 * `client.ts`.
 *
 * @agents
 * If you add a new module, wire it into `router.ts` first, then re-export only
 * the minimum public types from here. Avoid exporting internal helpers by default.
 */
export { createClient, domain, type Client } from "./client";
export { router, type Router } from "./router";
export type { Clock, Deps, Logger, Sql } from "./orpc-runtime/deps";
export type { Assignment } from "./modules/assignments/schemas";
export type { Tag } from "./modules/tags/schemas";
export type { Task } from "./modules/tasks/schemas";
