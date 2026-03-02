/**
 * @fileoverview Task module router implementation.
 *
 * @remarks
 * This file follows the standard module-router structure used in this package:
 * 1) create module implementer (`os`) from the module contract,
 * 2) attach package base context and optional module middleware,
 * 3) implement handlers from `os.<procedure>.handler(...)`,
 * 4) export plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta). This file owns
 * execution setup + handler behavior only.
 */
import { randomUUID } from "node:crypto";
import { implement } from "@orpc/server";
import { type BaseContext } from "../../orpc-runtime/context";
import { contract } from "./contract";
import { createRepository } from "./repository";
import { type Task } from "./schemas";

/**
 * @remarks
 * Module implementer setup (always present).
 *
 * Use this block to bind package context and inject module-scoped dependencies
 * (for example repository adapters). Keep business branching out of this block.
 */
const os = implement(contract)
  .$context<BaseContext>()
  .use(({ context, next }) =>
    next({
      context: {
        repo: createRepository(context.deps.sql),
      },
    }),
  );

const create = os.create.handler(async ({ context, input, errors }) => {
  const title = input.title.trim();
  if (title.length === 0) {
    throw errors.INVALID_TASK_TITLE({
      message: "Task title cannot be blank",
      data: { title: input.title },
    });
  }

  const now = context.deps.clock.now();
  const task: Task = {
    id: randomUUID(),
    title,
    description: input.description?.trim() ?? null,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  context.deps.logger.info("todo.tasks.create", { taskId: task.id });
  return await context.repo.insert(task);
});

const get = os.get.handler(async ({ context, input, errors }) => {
  const task = await context.repo.findById(input.id);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.id}' not found`,
      data: { entity: "Task", id: input.id },
    });
  }

  return task;
});

/** Plain object router export by package convention (no `.router(...)` wrapper). */
export const router = {
  create,
  get,
};
