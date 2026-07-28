/**
 * @fileoverview Task module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * This file owns the task operation group and exports its completed plain
 * router object for module composition.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `module.ts` owns module composition.
 * This file owns handler behavior. The parent `router.ts` owns module
 * composition.
 */

import type { Task } from "#example-todo-service/model/dto/task";
import { admitGeneratedIdentifier } from "#example-todo-service/model/policy/identifier";
import { module } from "../module";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `module.<procedure>.handler(...)`.
 */
const create = module.create.handler(async ({ context, input, errors }) => {
  const title = input.title.trim();
  if (title.length === 0) {
    throw errors.INVALID_TASK_TITLE({
      message: "Task title cannot be blank",
      data: { title: input.title },
    });
  }

  const now = context.clock.now();
  const task: Task = {
    id: admitGeneratedIdentifier(context.identifierGenerator.generate()),
    workspaceId: context.workspaceId,
    title,
    description: input.description?.trim() ?? null,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  context.logger.info("todo.tasks.create", { taskId: task.id });
  return await context.tasksStore.insert(task);
});

const get = module.get.handler(async ({ context, input, errors }) => {
  const task = await context.tasksStore.findById(input.id);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.id}' not found`,
      data: { entity: "Task", id: input.id },
    });
  }

  return task;
});

/**
 * @purpose Author task creation and retrieval at the task module boundary.
 * @capability Consume only the task module's curated clock, identity, logging, scope, and store values.
 * @behavior Normalize and persist valid tasks, then resolve tasks or return the declared absence failure.
 * @relation Keep task behavior inside this operation group while the parent module router composes it.
 */
export const router = { create, get };
