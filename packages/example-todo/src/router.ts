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
import { router as assignments } from "./modules/assignments/router";
import { router as tags } from "./modules/tags/router";
import { router as tasks } from "./modules/tasks/router";

export const router = {
  tasks,
  tags,
  assignments,
};

export type Router = typeof router;
