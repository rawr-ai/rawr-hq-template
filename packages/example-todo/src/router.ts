/**
 * @fileoverview Package router assembly for the todo domain.
 *
 * @remarks
 * Module routers stay isolated under `modules/*` and are merged here into the
 * one package-level callable router shape (`client.tasks.*`, `client.tags.*`,
 * `client.assignments.*`).
 *
 * @agents
 * This is package composition, not module implementation. Add module routers
 * here, but keep cross-module orchestration inside module handlers/services.
 */
import { base } from "./orpc-runtime/base";
import { assignmentsRouter } from "./modules/assignments/router";
import { tagsRouter } from "./modules/tags/router";
import { tasksRouter } from "./modules/tasks/router";

export const router = base.router({
  tasks: tasksRouter,
  tags: tagsRouter,
  assignments: assignmentsRouter,
});

export type Router = typeof router;
