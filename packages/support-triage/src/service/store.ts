import type { TriageWorkItem } from "../domain";

export interface TriageWorkItemStore {
  save(workItem: TriageWorkItem): Promise<void>;
  get(workItemId: string): Promise<TriageWorkItem | null>;
  list(): Promise<TriageWorkItem[]>;
}

class InMemoryTriageWorkItemStore implements TriageWorkItemStore {
  private readonly workItems = new Map<string, TriageWorkItem>();

  async save(workItem: TriageWorkItem): Promise<void> {
    this.workItems.set(workItem.workItemId, { ...workItem });
  }

  async get(workItemId: string): Promise<TriageWorkItem | null> {
    const workItem = this.workItems.get(workItemId);
    return workItem ? { ...workItem } : null;
  }

  async list(): Promise<TriageWorkItem[]> {
    return [...this.workItems.values()].map((workItem) => ({ ...workItem }));
  }
}

export function createInMemoryTriageWorkItemStore(): TriageWorkItemStore {
  return new InMemoryTriageWorkItemStore();
}
