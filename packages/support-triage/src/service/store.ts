import type { TriageJob } from "../domain";

export interface TriageJobStore {
  save(job: TriageJob): Promise<void>;
  get(jobId: string): Promise<TriageJob | null>;
  list(): Promise<TriageJob[]>;
}

class InMemoryTriageJobStore implements TriageJobStore {
  private readonly jobs = new Map<string, TriageJob>();

  async save(job: TriageJob): Promise<void> {
    this.jobs.set(job.jobId, { ...job });
  }

  async get(jobId: string): Promise<TriageJob | null> {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : null;
  }

  async list(): Promise<TriageJob[]> {
    return [...this.jobs.values()].map((job) => ({ ...job }));
  }
}

export function createInMemoryTriageJobStore(): TriageJobStore {
  return new InMemoryTriageJobStore();
}
