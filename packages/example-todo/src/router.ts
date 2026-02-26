/**
 * @fileoverview Root domain router assembly.
 *
 * @remarks
 * Module routers stay isolated in their folders and are merged here into one
 * domain boundary. This keeps the consumer surface stable (`todo.tasks.*`,
 * `todo.tags.*`, `todo.assignments.*`) as capabilities grow.
 *
 * @agents
 * When adding a module:
 * - Keep module router shape flat and namespaced by capability.
 * - Add only the module router here; avoid cross-module wiring in this file.
 */
import { base } from "./base";
import { assignmentsRouter } from "./assignments/router";
import { tagsRouter } from "./tags/router";
import { tasksRouter } from "./tasks/router";

export const todoRouter = base.router({
  tasks: tasksRouter,
  tags: tagsRouter,
  assignments: assignmentsRouter,
});

export type TodoRouter = typeof todoRouter;
