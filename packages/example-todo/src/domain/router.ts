/**
 * @fileoverview Domain module composition for the todo package.
 *
 * @remarks
 * This is pure domain composition (plain object), with no boundary wrapping.
 * Nested modules should compose manually via parent module routers (no magic).
 */
import { router as assignments } from "./modules/assignments/router";
import { router as tags } from "./modules/tags/router";
import { router as tasks } from "./modules/tasks/router";

export const router = {
  tasks,
  tags,
  assignments,
};
