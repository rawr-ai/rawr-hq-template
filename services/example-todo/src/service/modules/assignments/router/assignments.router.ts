/**
 * @fileoverview Assignments module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * This file owns the assignment operation group and exports its completed
 * plain router object for module composition.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `module.ts` owns module composition, and qualified middleware files own
 * standalone module middleware.
 * This module is composite; cross-module orchestration belongs in handlers here.
 * Do not route through client-to-client calls inside the same domain package.
 */

import type { Assignment } from "#example-todo-service/model/dto/assignment";
import { admitGeneratedIdentifier } from "#example-todo-service/model/policy/identifier";
import { observeAssignmentCreation } from "../middleware/telemetry.middleware";
import { module } from "../module";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `module.<procedure>.handler(...)`.
 */
const assign = module.assign
  .use(observeAssignmentCreation)
  .handler(async ({ context, input, errors }) => {
    const task = await context.tasksStore.findById(input.taskId);
    if (!task) {
      throw errors.RESOURCE_NOT_FOUND({
        message: `Task '${input.taskId}' not found`,
        data: { entity: "Task", id: input.taskId },
      });
    }

    const tag = await context.tagsStore.findById(input.tagId);
    if (!tag) {
      throw errors.RESOURCE_NOT_FOUND({
        message: `Tag '${input.tagId}' not found`,
        data: { entity: "Tag", id: input.tagId },
      });
    }

    if (await context.assignmentsStore.exists(input.taskId, input.tagId)) {
      throw errors.ALREADY_ASSIGNED({
        message: `Task '${input.taskId}' already has tag '${input.tagId}'`,
        data: { taskId: input.taskId, tagId: input.tagId },
      });
    }

    const existingAssignments = await context.assignmentsStore.countByTask(input.taskId);
    if (existingAssignments >= context.maxAssignmentsPerTask) {
      throw errors.ASSIGNMENT_LIMIT_REACHED({
        message: `Task '${input.taskId}' already has the maximum number of tag assignments`,
        data: {
          taskId: input.taskId,
          maxAssignmentsPerTask: context.maxAssignmentsPerTask,
        },
      });
    }

    const assignment: Assignment = {
      id: admitGeneratedIdentifier(context.identifierGenerator.generate()),
      workspaceId: context.workspaceId,
      taskId: input.taskId,
      tagId: input.tagId,
      createdAt: context.clock.now(),
    };

    return await context.assignmentsStore.insert(assignment);
  });

const listForTask = module.listForTask.handler(async ({ context, input, errors }) => {
  const task = await context.tasksStore.findById(input.taskId);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.taskId}' not found`,
      data: { entity: "Task", id: input.taskId },
    });
  }

  const assignments = await context.assignmentsStore.findByTask(input.taskId);
  if (assignments.length === 0) {
    return { task, tags: [] };
  }

  const tags = await context.tagsStore.findByIds(assignments.map((assignment) => assignment.tagId));
  return { task, tags };
});

/**
 * @purpose Author task-tag assignment mutation and joined reads at the Assignments boundary.
 * @capability Consume only the curated assignment policy, identity, scope, clock, and store values.
 * @behavior Refuse invalid relations before persistence and return the task with its assigned tags.
 * @relation Coordinate task and tag facts through service-provided stores without invoking sibling operations.
 */
export const router = { assign, listForTask };
