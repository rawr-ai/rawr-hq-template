import { module } from "../module";

/** Resolves a task or returns the task contract's declared absence failure. */
export const get = module.get.handler(async ({ context, input, errors }) => {
  const task = await context.tasksStore.findById(input.id);
  if (!task) {
    throw errors.RESOURCE_NOT_FOUND({
      message: `Task '${input.id}' not found`,
      data: { entity: "Task", id: input.id },
    });
  }

  return task;
});
