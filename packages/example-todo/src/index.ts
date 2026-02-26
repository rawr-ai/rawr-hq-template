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
 * If you add a new module, wire it into `router.ts` first, then re-export only
 * the minimum public types from here. Avoid exporting internal helpers by default.
 */
import { createRouterClient } from "@orpc/server";
import type { TodoDeps } from "./deps";
import { todoRouter } from "./router";

export { todoRouter, type TodoRouter } from "./router";

export function createTodoClient(deps: TodoDeps) {
  return createRouterClient(todoRouter, {
    context: { deps },
  });
}

export type TodoClient = ReturnType<typeof createTodoClient>;

export type { Assignment } from "./assignments/schemas";
export type { Clock, Logger, Sql, TodoDeps } from "./deps";
export type { Tag } from "./tags/schemas";
export type { Task } from "./tasks/schemas";
