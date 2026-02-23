import type { SupportTriageRun } from "./contract";

// Template example store: in-process only (non-durable).
const runs = new Map<string, SupportTriageRun>();

export function getSupportTriageRun(runId: string): SupportTriageRun | null {
  const existing = runs.get(runId);
  return existing ? { ...existing } : null;
}

export function saveSupportTriageRun(run: SupportTriageRun): void {
  runs.set(run.runId, { ...run });
}

export function __resetSupportTriageRunStoreForTests(): void {
  runs.clear();
}
