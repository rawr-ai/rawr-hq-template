import type { TaskType } from "#example-todo-service/model/dto/task";
import { admitGeneratedIdentifier } from "#example-todo-service/model/policy/identifier";
import { module } from "../module";

/** Creates a normalized task through the module-curated capability context. */
export const create = module.create.handler(async ({ context, input, errors }) => {
  if (context.readOnly) {
    throw errors.READ_ONLY_MODE({
      message: "Write operation blocked: service is in read-only mode",
      data: { path: "tasks.create" },
    });
  }

  const title = input.title.trim();
  if (title.length === 0) {
    throw errors.INVALID_TASK_TITLE({
      message: "Task title cannot be blank",
      data: { title: input.title },
    });
  }

  const now = context.clock.now();
  const task: TaskType = {
    id: admitGeneratedIdentifier(context.identifierGenerator.generate()),
    workspaceId: context.workspaceId,
    title,
    description: input.description?.trim() ?? null,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  context.logger.info("todo.tasks.create", { taskId: task.id });
  return await context.tasksStore.insert(task);
});
