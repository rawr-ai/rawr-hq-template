import type { SupportExampleRun } from "./contract";

// Template example store: in-process only (non-durable).
const runs = new Map<string, SupportExampleRun>();

export function getSupportExampleRun(runId: string): SupportExampleRun | null {
  const existing = runs.get(runId);
  return existing ? { ...existing } : null;
}

export function saveSupportExampleRun(run: SupportExampleRun): void {
  runs.set(run.runId, { ...run });
}

export function __resetSupportExampleRunStoreForTests(): void {
  runs.clear();
}
