/**
 * @fileoverview Module router assembly for the todo domain.
 *
 * @remarks
 * Module routers stay isolated in their folders and are merged here into one
 * domain router. This keeps the consumer surface stable (`todo.tasks.*`,
 * `todo.tags.*`, `todo.assignments.*`) as capabilities grow.
 *
 * @agents
 * When adding a module:
 * - Keep module router shape flat and namespaced by capability.
 * - Add only the module router here; avoid cross-module orchestration in this file.
 */
import { base } from "../boundary/base";
import { assignmentsRouter } from "./assignments/router";
import { tagsRouter } from "./tags/router";
import { tasksRouter } from "./tasks/router";

export const todoRouter = base.router({
  tasks: tasksRouter,
  tags: tagsRouter,
  assignments: assignmentsRouter,
});

export type TodoRouter = typeof todoRouter;
