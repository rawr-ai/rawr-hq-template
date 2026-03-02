/**
 * @fileoverview Task module router implementation.
 *
 * @remarks
 * This file implements `tasksContract`. Keep contract details in `contract.ts`
 * and keep this file focused on execution logic + boundary decisions.
 *
 * @agents
 * Extend `contract.ts` first. Then implement corresponding handlers here.
 * Avoid redefining input/output/error schemas in this file.
 */
import { randomUUID } from "node:crypto";
import { implement } from "@orpc/server";
import { type BaseContext, serviceContextMiddleware } from "../../orpc-runtime/base";
import { createTaskRepository } from "./repository";
import { type Task } from "./schemas";
import { tasksContract } from "./contract";

const os = implement(tasksContract).$context<BaseContext>();

const withTasks = os.use(serviceContextMiddleware).use(({ context, next }) =>
  next({
    context: {
      ...context,
      repo: createTaskRepository(context.deps.sql),
    },
  }),
);

const create = withTasks.create.handler(async ({ context, input, errors }) => {
  const title = input.title.trim();
  if (title.length === 0) {
    throw errors.INVALID_TASK_TITLE({
      message: "Task title cannot be blank",
      data: { title: input.title },
    });
  }

  const now = context.clock.now();
  const task: Task = {
    id: randomUUID(),
    title,
    description: input.description?.trim() ?? null,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  context.logger.info("todo.tasks.create", { taskId: task.id });
  return await context.repo.insert(task);
});

const get = withTasks.get.handler(async ({ context, input, errors }) => {
  const task = await context.repo.findById(input.id);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.id}' not found`,
      data: { entity: "Task", id: input.id },
    });
  }

  return task;
});

export const tasksRouter = withTasks.router({
  create,
  get,
});
