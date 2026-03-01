/**
 * @fileoverview Public package surface for the example todo domain.
 *
 * @remarks
 * This file intentionally exposes two main integration entrypoints:
 * 1) `todoRouter` for composition inside larger router trees.
 * 2) `createTodoClient(deps)` for in-process calls via `createRouterClient`.
 *
 * Keep this file thin. It should re-export stable API, not host business logic.
 *
 * @agents
 * If you add a new module, wire it into `modules/router.ts` first, then re-export
 * only the minimum public types from here. Avoid exporting internal helpers by default.
 */
import { createRouterClient } from "@orpc/server";
import type { TodoDeps } from "./boundary/deps";
import { todoRouter } from "./modules/router";

export { todoRouter, type TodoRouter } from "./modules/router";

export function createTodoClient(deps: TodoDeps) {
  return createRouterClient(todoRouter, {
    context: { deps },
  });
}

export type TodoClient = ReturnType<typeof createTodoClient>;

export type { Clock, Logger, Sql, TodoDeps } from "./boundary/deps";
export type { Assignment } from "./modules/assignments/schemas";
export type { Tag } from "./modules/tags/schemas";
export type { Task } from "./modules/tasks/schemas";
