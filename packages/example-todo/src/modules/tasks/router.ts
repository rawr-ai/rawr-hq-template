/**
 * @fileoverview Task module router (procedure contracts + orchestration).
 *
 * @remarks
 * This is the procedure boundary where:
 * - input/output schemas are declared,
 * - per-procedure ORPC errors are declared,
 * - repository `Result` failures are mapped into declared ORPC errors.
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
import { schema, createOrpcErrorMapFromDomainCatalog } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { base, withService } from "../../boundary/base";
import { todoServiceErrorMap } from "../../boundary/error-catalog";
import { unwrapDatabaseResult, unwrapSharedResult } from "../../boundary/unwrap";
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
const taskCreateLocalErrorMap = createOrpcErrorMapFromDomainCatalog({
  INVALID_TASK_TITLE: {
    status: 400,
    message: "Invalid task title",
    data: Type.Object(
      {
        title: Type.Optional(Type.String()),
      },
      { additionalProperties: false },
    ),
  },
} as const);

/**
 * Procedure-level error declarations.
 *
 * `create` includes local validation + shared database surface.
 * `get` includes shared not-found + shared database surface.
 */
const createTaskErrorMap = {
  INVALID_TASK_TITLE: taskCreateLocalErrorMap.INVALID_TASK_TITLE,
  DATABASE_ERROR: todoServiceErrorMap.DATABASE_ERROR,
} as const;

const getTaskErrorMap = {
  RESOURCE_NOT_FOUND: todoServiceErrorMap.RESOURCE_NOT_FOUND,
  DATABASE_ERROR: todoServiceErrorMap.DATABASE_ERROR,
} as const;

const create = withTasks
  .errors(createTaskErrorMap)
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

    return unwrapDatabaseResult(context.repo.insert(task), {
      onDatabaseError: () => {
        throw errors.DATABASE_ERROR({
          message: "Unable to create task",
          data: { operation: "tasks.insert" },
        });
      },
    });
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
  .handler(({ context, input, errors }) =>
    unwrapSharedResult(context.repo.findById(input.id), {
      onNotFoundError: (error) => {
        throw errors.RESOURCE_NOT_FOUND({
          message: error.message,
          data: { entity: error.entity, id: error.id },
        });
      },
      onDatabaseError: () => {
        throw errors.DATABASE_ERROR({
          message: "Unable to load task",
          data: { operation: "tasks.findById" },
        });
      },
    }),
  );

export const tasksRouter = base.router({
  create,
  get,
});
