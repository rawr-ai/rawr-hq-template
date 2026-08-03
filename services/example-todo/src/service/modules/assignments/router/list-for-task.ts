import { module } from "../module";

/** Returns a task with the tags currently assigned to it. */
export const listForTask = module.listForTask.handler(async ({ context, input, errors }) => {
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
