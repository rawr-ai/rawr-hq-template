export type JournalStep = {
  name: string;
  status: "ok" | "fail" | "skip";
  durationMs?: number;
  exitCode?: number;
};

export type JournalContext = {
  steps: JournalStep[];
  artifacts: string[];
};

const GLOBAL_KEY = Symbol.for("rawr.journalContext.v0");

function ensure(): JournalContext {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { steps: [], artifacts: [] } satisfies JournalContext;
  }
  return g[GLOBAL_KEY] as JournalContext;
}

export function resetJournalContext(): void {
  const ctx = ensure();
  ctx.steps = [];
  ctx.artifacts = [];
}

export function getJournalContext(): JournalContext {
  return ensure();
}

export function recordStep(step: JournalStep): void {
  ensure().steps.push(step);
}

export function recordArtifact(path: string): void {
  ensure().artifacts.push(path);
}

