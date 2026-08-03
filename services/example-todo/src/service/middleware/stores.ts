import { base } from "../base";
import { createAssignmentsStore } from "../db/stores/assignments";
import { createTagsStore } from "../db/stores/tags";
import { createTasksStore } from "../db/stores/tasks";
import type { AssignmentsStore, TagsStore, TasksStore } from "../model/ports";

type ProvidedStores = {
  tasksStore: TasksStore;
  tagsStore: TagsStore;
  assignmentsStore: AssignmentsStore;
};

/**
 * Acquires one SQL capability per invocation and projects workspace-bound stores through
 * `provided`.
 */
export const middleware = base.middleware(async ({ context, next }) => {
  const sql = await context.deps.dbPool.connect();
  const workspaceId = context.scope.workspaceId;
  const provided: ProvidedStores = {
    tasksStore: createTasksStore(sql, workspaceId),
    tagsStore: createTagsStore(sql, workspaceId),
    assignmentsStore: createAssignmentsStore(sql, workspaceId),
  };

  return next({ context: { provided } });
});
