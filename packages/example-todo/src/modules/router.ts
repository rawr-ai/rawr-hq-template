/**
 * @fileoverview Domain module composition for the todo package.
 *
 * @remarks
 * This is pure domain composition (plain object), with no boundary wrapping.
 * Nested modules should compose manually via parent module routers (no magic).
 */
import { router as assignments } from "./assignments/router";
import { router as tags } from "./tags/router";
import { router as tasks } from "./tasks/router";

export const router = {
  tasks,
  tags,
  assignments,
};

