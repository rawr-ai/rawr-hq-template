import { createServiceProvider } from "../base";
import { createAssignmentsStore } from "../db/stores/assignments.store";
import { createTagsStore } from "../db/stores/tags.store";
import { createTasksStore } from "../db/stores/tasks.store";
import type { AssignmentsStore } from "../model/ports/assignments-store";
import type { TagsStore } from "../model/ports/tags-store";
import type { TasksStore } from "../model/ports/tasks-store";

type ProvidedStores = {
  tasksStore: TasksStore;
  tagsStore: TagsStore;
  assignmentsStore: AssignmentsStore;
};

/**
 * Acquires one SQL capability per invocation and projects workspace-bound stores through
 * `provided`.
 */
export const stores = createServiceProvider().middleware<ProvidedStores>(
  async ({ context, next }) => {
    const sql = await context.deps.dbPool.connect();
    const workspaceId = context.scope.workspaceId;

    return next({
      tasksStore: createTasksStore(sql, workspaceId),
      tagsStore: createTagsStore(sql, workspaceId),
      assignmentsStore: createAssignmentsStore(sql, workspaceId),
    });
  }
);
