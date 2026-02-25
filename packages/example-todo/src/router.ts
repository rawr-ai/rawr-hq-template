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
