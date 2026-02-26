/**
 * @fileoverview Task module router (procedure contracts + orchestration).
 *
 * @remarks
 * This is the procedure boundary where:
 * - input/output schemas are declared,
 * - per-procedure ORPC errors are declared,
 * - domain failures are mapped into declared ORPC errors.
 *
 * Trap to avoid: widening `.errors(...)` to "just in case" errors. Keep each
 * procedure error map as narrow as possible.
 *
 * @agents
 * Add new task procedures here. Reuse shared error map entries when they are
 * truly shared, and prefer procedure-local definitions for one-off validation
 * failures to keep intent close to behavior.
 */
import { randomUUID } from "node:crypto";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { base, withService } from "../../boundary/base";
import { todoProcedureErrorMap } from "../../boundary/procedure-errors";
import { DatabaseError, NotFoundError } from "../../boundary/service-errors";
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

/**
 * Local validation error for this procedure only.
 */
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
  DATABASE_ERROR: todoProcedureErrorMap.DATABASE_ERROR,
} as const;

const getTaskErrorMap = {
  RESOURCE_NOT_FOUND: todoProcedureErrorMap.RESOURCE_NOT_FOUND,
  DATABASE_ERROR: todoProcedureErrorMap.DATABASE_ERROR,
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

    try {
      return await context.repo.insert(task);
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw errors.DATABASE_ERROR({
          message: "Unable to create task",
          data: { operation: "tasks.insert" },
        });
      }

      throw error;
    }
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
    try {
      return await context.repo.findById(input.id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw errors.RESOURCE_NOT_FOUND({
          message: error.message,
          data: { entity: error.entity, id: error.id },
        });
      }

      if (error instanceof DatabaseError) {
        throw errors.DATABASE_ERROR({
          message: "Unable to load task",
          data: { operation: "tasks.findById" },
        });
      }

      throw error;
    }
  });

export const tasksRouter = base.router({
  create,
  get,
});
