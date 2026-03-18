/**
 * @fileoverview Task module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * This file owns concrete handler implementations and exports plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `module.ts` owns module composition.
 * This file owns handler behavior and router composition.
 */
import { randomUUID } from "node:crypto";
import { module } from "./module";
import { type Task } from "./schemas";

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
    id: randomUUID(),
    workspaceId: context.workspaceId,
    title,
    description: input.description?.trim() ?? null,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  context.logger.info("todo.tasks.create", { taskId: task.id });
  return await context.repo.insert(task);
});

const get = module.get.handler(async ({ context, input, errors }) => {
  const task = await context.repo.findById(input.id);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.id}' not found`,
      data: { entity: "Task", id: input.id },
    });
  }

  return task;
});

/** Contract-enforced module router (fails typecheck if contract and router drift). */
export const router = module.router({
  create,
  get,
});
