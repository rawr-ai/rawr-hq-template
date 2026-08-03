import type { AssignmentType, TodoIdentifierType } from "../dto";

/** Workspace-bound persistence contract for task-tag assignments. */
export interface AssignmentsStore {
  /** Lists a task's assignments ordered from newest to oldest. */
  findByTask(taskId: TodoIdentifierType): Promise<AssignmentType[]>;

  /** Reports whether a task and tag are already related. */
  exists(taskId: TodoIdentifierType, tagId: TodoIdentifierType): Promise<boolean>;

  /** Persists an assignment and returns the stored record. */
  insert(assignment: AssignmentType): Promise<AssignmentType>;

  /** Counts the assignments currently attached to a task. */
  countByTask(taskId: TodoIdentifierType): Promise<number>;
}
