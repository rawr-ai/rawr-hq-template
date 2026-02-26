/**
 * @fileoverview Assignments composite-module router.
 *
 * @remarks
 * This module demonstrates in-package composition via repository-to-repository
 * calls (tasks + tags + assignments), not client-to-client calls.
 *
 * Why: these are trusted internal calls inside one domain package boundary.
 * This keeps orchestration local and avoids extra transport-style indirection.
 *
 * @agents
 * Keep cross-module composition here (procedure layer). Do not move this into
 * `router.ts` root assembly, and do not call `createRouterClient` internally.
 */
import { randomUUID } from "node:crypto";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { base, withService } from "../base";
import { todoServiceErrorMap } from "../errors";
import { unwrapDatabaseResult, unwrapSharedResult } from "../unwrap";
import { createTagRepository } from "../tags/repository";
import { TagSchema } from "../tags/schemas";
import { createTaskRepository } from "../tasks/repository";
import { TaskSchema } from "../tasks/schemas";
import { assignmentErrorMap } from "./errors";
import { createAssignmentRepository } from "./repository";
import { type Assignment, AssignmentSchema } from "./schemas";

const withAssignments = withService.use(({ context, next }) =>
  next({
    context: {
      deps: context.deps,
      logger: context.logger,
      clock: context.clock,
      repo: createAssignmentRepository(context.deps.sql),
      tasks: createTaskRepository(context.deps.sql),
      tags: createTagRepository(context.deps.sql),
    },
  }),
);

/**
 * Procedure-level error declarations for this module.
 *
 * `assign` can fail with not-found, duplicate assignment, or database failures.
 * `listForTask` can fail with not-found and database failures.
 */
const assignErrorMap = {
  RESOURCE_NOT_FOUND: todoServiceErrorMap.RESOURCE_NOT_FOUND,
  DATABASE_ERROR: todoServiceErrorMap.DATABASE_ERROR,
  ALREADY_ASSIGNED: assignmentErrorMap.ALREADY_ASSIGNED,
} as const;

const listForTaskErrorMap = {
  RESOURCE_NOT_FOUND: todoServiceErrorMap.RESOURCE_NOT_FOUND,
  DATABASE_ERROR: todoServiceErrorMap.DATABASE_ERROR,
} as const;

const assign = withAssignments
  .errors(assignErrorMap)
  .input(
    schema(
      Type.Object(
        {
          taskId: Type.String({ format: "uuid" }),
          tagId: Type.String({ format: "uuid" }),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .output(schema(AssignmentSchema))
  .handler(async ({ context, input, errors }) => {
    const assignment: Assignment = {
      id: randomUUID(),
      taskId: input.taskId,
      tagId: input.tagId,
      createdAt: context.clock.now(),
    };

    const result = await context.tasks
      .findById(input.taskId)
      .andThen(() => context.tags.findById(input.tagId))
      .andThen(() => context.repo.insert(assignment));

    if (result.isOk()) {
      return result.value;
    }

    if (result.error._tag === "NotFoundError") {
      throw errors.RESOURCE_NOT_FOUND({
        message: result.error.message,
        data: { entity: result.error.entity, id: result.error.id },
      });
    }

    if (result.error._tag === "AlreadyAssignedError") {
      throw errors.ALREADY_ASSIGNED({
        message: result.error.message,
        data: { taskId: result.error.taskId, tagId: result.error.tagId },
      });
    }

    throw errors.DATABASE_ERROR({
      message: "Unable to create assignment",
      data: { operation: "task_tags.insert" },
    });
  });

const listForTask = withAssignments
  .errors(listForTaskErrorMap)
  .input(
    schema(
      Type.Object(
        {
          taskId: Type.String({ format: "uuid" }),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .output(
    schema(
      Type.Object(
        {
          task: TaskSchema,
          tags: Type.Array(TagSchema),
        },
        { additionalProperties: false },
      ),
    ),
  )
  .handler(async ({ context, input, errors }) => {
    const task = await unwrapSharedResult(context.tasks.findById(input.taskId), {
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
    });

    const assignments = await unwrapDatabaseResult(context.repo.findByTask(input.taskId), {
      onDatabaseError: () => {
        throw errors.DATABASE_ERROR({
          message: "Unable to list assignments",
          data: { operation: "task_tags.findByTask" },
        });
      },
    });

    if (assignments.length === 0) {
      return { task, tags: [] };
    }

    const tags = await unwrapDatabaseResult(
      context.tags.findByIds(assignments.map((assignment) => assignment.tagId)),
      {
        onDatabaseError: () => {
          throw errors.DATABASE_ERROR({
            message: "Unable to load tags",
            data: { operation: "tags.findByIds" },
          });
        },
      },
    );

    return { task, tags };
  });

export const assignmentsRouter = base.router({
  assign,
  listForTask,
});
