/**
 * @fileoverview Package router assembly for the todo domain.
 *
 * @remarks
 * Each module exports a plain-object `router`. This file composes those module
 * routers into the package-level plain-object router shape:
 * `client.tasks.*`, `client.tags.*`, `client.assignments.*`.
 *
 * @agents
 * This is package composition, not module implementation. Add/remove modules
 * here. Keep cross-module orchestration inside module handlers/services.
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
