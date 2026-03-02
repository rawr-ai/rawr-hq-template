/**
 * @fileoverview Public package surface for the example todo domain.
 *
 * @remarks
 * This file intentionally exposes two main integration entrypoints:
 * 1) `router` for composition inside larger router trees.
 * 2) `createClient(deps)` for in-process calls via `createRouterClient`.
 *
 * Keep this file thin. It should re-export stable API, not host business logic.
 *
 * @agents
 * If you add a new module, wire it into `modules/router.ts` first, then re-export
 * only the minimum public types from here. Avoid exporting internal helpers by default.
 */
import { defineDomainPackage } from "@rawr/orpc-standards";
import type { Deps } from "./boundary/deps";
import { router } from "./modules/router";

export { router, type Router } from "./modules/router";

export const domain = defineDomainPackage(router);

export function createClient(deps: Deps) {
  return domain.createClient(deps);
}

export type Client = ReturnType<typeof createClient>;

export type { Clock, Deps, Logger, Sql } from "./boundary/deps";
export type { Assignment } from "./modules/assignments/schemas";
export type { Tag } from "./modules/tags/schemas";
export type { Task } from "./modules/tasks/schemas";
