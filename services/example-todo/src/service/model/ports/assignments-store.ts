import type { Assignment } from "../dto/assignment";
import type { TodoIdentifierType } from "../dto/identifier";

/** Workspace-bound persistence contract for task-tag assignments. */
export interface AssignmentsStore {
  /** Lists a task's assignments ordered from newest to oldest. */
  findByTask(taskId: TodoIdentifierType): Promise<Assignment[]>;

  /** Reports whether a task and tag are already related. */
  exists(taskId: TodoIdentifierType, tagId: TodoIdentifierType): Promise<boolean>;

  /** Persists an assignment and returns the stored record. */
  insert(assignment: Assignment): Promise<Assignment>;

  /** Counts the assignments currently attached to a task. */
  countByTask(taskId: TodoIdentifierType): Promise<number>;
}
