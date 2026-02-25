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
