/**
 * One projection-owned journal step recorded during scaffold/workflow commands.
 */
export type JournalStep = {
  name: string;
  status: "ok" | "fail" | "skip";
  durationMs?: number;
  exitCode?: number;
};

/**
 * Process-local journal context shared by command helpers during one CLI run.
 */
export type JournalContext = {
  steps: JournalStep[];
  artifacts: string[];
};

const GLOBAL_KEY = Symbol.for("rawr.journalContext.v0");

/**
 * Ensures the process-local journal context exists.
 */
function ensure(): JournalContext {
  const g = globalThis as any;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { steps: [], artifacts: [] } satisfies JournalContext;
  }
  return g[GLOBAL_KEY] as JournalContext;
}

/**
 * Clears accumulated journal context before a new command flow.
 */
export function resetJournalContext(): void {
  const ctx = ensure();
  ctx.steps = [];
  ctx.artifacts = [];
}

/**
 * Returns the process-local journal context for command rendering.
 */
export function getJournalContext(): JournalContext {
  return ensure();
}

/**
 * Records a command step for later journal projection.
 */
export function recordStep(step: JournalStep): void {
  ensure().steps.push(step);
}

/**
 * Records a generated artifact path for later journal projection.
 */
export function recordArtifact(path: string): void {
  ensure().artifacts.push(path);
}
