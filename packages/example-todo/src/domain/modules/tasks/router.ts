/**
 * @fileoverview Task module router implementation.
 *
 * @remarks
 * Module setup lives in `./setup.ts`.
 * This file owns concrete handler implementations and exports plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `setup.ts` owns module setup.
 * This file owns handler behavior and router composition.
 */
import { randomUUID } from "node:crypto";
import { os } from "./setup";
import { type Task } from "./schemas";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `os.<procedure>.handler(...)`.
 */
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

/** Contract-enforced module router (fails typecheck if contract and router drift). */
export const router = os.router({
  create,
  get,
});
