import type { TodoIdentifierType } from "../dto/identifier";
import type { TaskType } from "../dto/task";

/** Workspace-bound persistence contract for task records. */
export interface TasksStore {
  /** Finds one task by identifier, returning `null` when it is absent. */
  findById(id: TodoIdentifierType): Promise<TaskType | null>;

  /** Persists a task and returns the stored record. */
  insert(task: TaskType): Promise<TaskType>;

  /** Finds matching tasks ordered from newest to oldest. */
  findByIds(ids: TodoIdentifierType[]): Promise<TaskType[]>;
}
