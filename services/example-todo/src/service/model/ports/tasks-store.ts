import type { TodoIdentifierType } from "../dto/identifier";
import type { Task } from "../dto/task";

/** Workspace-bound persistence contract for task records. */
export interface TasksStore {
  /** Finds one task by identifier, returning `null` when it is absent. */
  findById(id: TodoIdentifierType): Promise<Task | null>;

  /** Persists a task and returns the stored record. */
  insert(task: Task): Promise<Task>;

  /** Finds matching tasks ordered from newest to oldest. */
  findByIds(ids: TodoIdentifierType[]): Promise<Task[]>;
}
