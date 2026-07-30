import type { AssignmentType } from "#example-todo-service/model/dto/assignment";
import { admitGeneratedIdentifier } from "#example-todo-service/model/policy/identifier";
import { module } from "../module";

/** Creates one valid task-tag assignment through the curated module context. */
export const assign = module.assign.handler(async ({ context, input, errors }) => {
  if (context.readOnly) {
    throw errors.READ_ONLY_MODE({
      message: "Write operation blocked: service is in read-only mode",
      data: { path: "assignments.assign" },
    });
  }

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

  const assignment: AssignmentType = {
    id: admitGeneratedIdentifier(context.identifierGenerator.generate()),
    workspaceId: context.workspaceId,
    taskId: input.taskId,
    tagId: input.tagId,
    createdAt: context.clock.now(),
  };

  return await context.assignmentsStore.insert(assignment);
});
