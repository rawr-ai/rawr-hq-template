/**
 * @fileoverview Assignments composite-module router.
 *
 * @remarks
 * This module composes tasks + tags + assignments repositories directly.
 * Expected states from those repositories are converted into caller-actionable
 * ORPC boundary errors inline at the procedure boundary.
 */
import { randomUUID } from "node:crypto";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { base, withService } from "../../boundary/base";
import { todoProcedureErrors } from "../../boundary/procedure-errors";
import { createTagRepository } from "../tags/repository";
import { TagSchema } from "../tags/schemas";
import { createTaskRepository } from "../tasks/repository";
import { TaskSchema } from "../tasks/schemas";
import { assignmentProcedureErrors } from "./errors";
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

const assign = withAssignments
  .errors({
    RESOURCE_NOT_FOUND: todoProcedureErrors.RESOURCE_NOT_FOUND,
    ALREADY_ASSIGNED: assignmentProcedureErrors.ALREADY_ASSIGNED,
  } as const)
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
    const task = await context.tasks.findById(input.taskId);
    if (!task) {
      throw errors.RESOURCE_NOT_FOUND({
        message: `Task '${input.taskId}' not found`,
        data: { entity: "Task", id: input.taskId },
      });
    }

    const tag = await context.tags.findById(input.tagId);
    if (!tag) {
      throw errors.RESOURCE_NOT_FOUND({
        message: `Tag '${input.tagId}' not found`,
        data: { entity: "Tag", id: input.tagId },
      });
    }

    if (await context.repo.exists(input.taskId, input.tagId)) {
      throw errors.ALREADY_ASSIGNED({
        message: `Task '${input.taskId}' already has tag '${input.tagId}'`,
        data: { taskId: input.taskId, tagId: input.tagId },
      });
    }

    const assignment: Assignment = {
      id: randomUUID(),
      taskId: input.taskId,
      tagId: input.tagId,
      createdAt: context.clock.now(),
    };

    return await context.repo.insert(assignment);
  });

const listForTask = withAssignments
  .errors({
    RESOURCE_NOT_FOUND: todoProcedureErrors.RESOURCE_NOT_FOUND,
  } as const)
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
    const task = await context.tasks.findById(input.taskId);
    if (!task) {
      throw errors.RESOURCE_NOT_FOUND({
        message: `Task '${input.taskId}' not found`,
        data: { entity: "Task", id: input.taskId },
      });
    }

    const assignments = await context.repo.findByTask(input.taskId);
    if (assignments.length === 0) {
      return { task, tags: [] };
    }

    const tags = await context.tags.findByIds(assignments.map((assignment) => assignment.tagId));
    return { task, tags };
  });

export const assignmentsRouter = base.router({
  assign,
  listForTask,
});
