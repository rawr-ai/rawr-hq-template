/**
 * @fileoverview Assignments module router implementation.
 *
 * @remarks
 * Module setup lives in `./setup.ts`.
 * This file owns concrete handler implementations and exports plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `setup.ts` owns module setup.
 * This module is composite; cross-module orchestration belongs in handlers here.
 * Do not route through client-to-client calls inside the same domain package.
 */
import { randomUUID } from "node:crypto";
import { os } from "./setup";
import { type Assignment } from "./schemas";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `os.<procedure>.handler(...)`.
 */
const assign = os.assign.handler(async ({ context, input, errors }) => {
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

const listForTask = os.listForTask.handler(async ({ context, input, errors }) => {
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

/** Contract-enforced module router (fails typecheck if contract and router drift). */
export const router = os.router({
  assign,
  listForTask,
});
