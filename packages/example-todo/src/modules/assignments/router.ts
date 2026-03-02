/**
 * @fileoverview Assignments module router implementation.
 *
 * @remarks
 * This composite module implements `assignmentsContract` and composes
 * assignments/tasks/tags repositories directly inside the domain boundary.
 *
 * @agents
 * Keep cross-module orchestration here. Do not route through client-to-client
 * calls inside the same domain package.
 */
import { randomUUID } from "node:crypto";
import { implement } from "@orpc/server";
import { type BaseContext } from "../../orpc-runtime/context";
import { createTagRepository } from "../tags/repository";
import { createTaskRepository } from "../tasks/repository";
import { type Assignment } from "./schemas";
import { createAssignmentRepository } from "./repository";
import { assignmentsContract } from "./contract";

const os = implement(assignmentsContract).$context<BaseContext>();

const withAssignments = os.use(({ context, next }) =>
  next({
    context: {
      repo: createAssignmentRepository(context.deps.sql),
      tasks: createTaskRepository(context.deps.sql),
      tags: createTagRepository(context.deps.sql),
    },
  }),
);

const assign = withAssignments.assign.handler(async ({ context, input, errors }) => {
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
    createdAt: context.deps.clock.now(),
  };

  return await context.repo.insert(assignment);
});

const listForTask = withAssignments.listForTask.handler(async ({ context, input, errors }) => {
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

export const assignmentsRouter = withAssignments.router({
  assign,
  listForTask,
});
