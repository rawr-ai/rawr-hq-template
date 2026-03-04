/**
 * @fileoverview Domain router composition for the todo package.
 *
 * @remarks
 * This file composes module routers into a single router object and performs
 * a single final `.router(...)` attach.
 *
 * Domain-wide middleware is authored and attached in `src/orpc.ts`.
 */
import { router as assignments } from "./modules/assignments/router";
import { router as tags } from "./modules/tags/router";
import { router as tasks } from "./modules/tasks/router";
import { impl } from "../orpc";

export const router = impl.router({
  tasks,
  tags,
  assignments,
});

export type Router = typeof router;
