/**
 * @fileoverview Task module router (boundary contract + orchestration).
 *
 * @remarks
 * This boundary throws only caller-actionable ORPC errors. Expected missing
 * states come from repository return values (`null`) and are converted directly
 * into typed boundary errors here.
 *
 * @agents
 * Keep this pattern:
 * - repositories return expected states as values,
 * - procedures throw boundary errors directly when callers must branch.
 */
import { randomUUID } from "node:crypto";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { base, withService } from "../../boundary/base";
import { todoProcedureErrorMap } from "../../boundary/procedure-errors";
import { createTaskRepository } from "./repository";
import { type Task, TaskSchema } from "./schemas";

const withTasks = withService.use(({ context, next }) =>
  next({
    context: {
      deps: context.deps,
      logger: context.logger,
      clock: context.clock,
      repo: createTaskRepository(context.deps.sql),
    },
  }),
);

const taskCreateErrorMap = {
  INVALID_TASK_TITLE: {
    status: 400,
    message: "Invalid task title",
    data: schema(
      Type.Object(
        {
          title: Type.Optional(Type.String()),
        },
        { additionalProperties: false },
      ),
    ),
  },
} as const;

const getTaskErrorMap = {
  RESOURCE_NOT_FOUND: todoProcedureErrorMap.RESOURCE_NOT_FOUND,
} as const;

const create = withTasks
  .errors(taskCreateErrorMap)
  .input(
    schema(
      Type.Object(
        {
          title: Type.String({ minLength: 1, maxLength: 500 }),
          description: Type.Optional(Type.String({ maxLength: 2000 })),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .output(schema(TaskSchema))
  .handler(async ({ context, input, errors }) => {
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

const get = withTasks
  .errors(getTaskErrorMap)
  .input(
    schema(
      Type.Object(
        {
          id: Type.String({ format: "uuid" }),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .output(schema(TaskSchema))
  .handler(async ({ context, input, errors }) => {
    const task = await context.repo.findById(input.id);
    if (!task) {
      throw errors.RESOURCE_NOT_FOUND({
        message: `Task '${input.id}' not found`,
        data: { entity: "Task", id: input.id },
      });
    }

    return task;
  });

export const tasksRouter = base.router({
  create,
  get,
});
