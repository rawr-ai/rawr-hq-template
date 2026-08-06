import type {
  FlushTelemetryInput,
  FlushTelemetryResult,
  TelemetryDiagnostic,
} from "@habitat-ai/resource-telemetry";
import { context, metrics, propagation, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import type { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";

import { recordDiagnostic } from "./records.js";

const MAX_TIMER_DELAY_MILLISECONDS = 2_147_483_647;

/** One owned signal operation attempted during flush or shutdown. */
export interface LifecycleOwner {
  readonly code: string;
  readonly run: () => Promise<void>;
}

/** Exact global slots registered by one provider lease. */
export interface GlobalOwnership {
  context: boolean;
  propagation: boolean;
  metrics: boolean;
  trace: boolean;
  logs: boolean;
}

/** Provider-private runtime values required for bounded release. */
export interface TelemetryRuntimeLifecycle {
  readonly contextManager: AsyncLocalStorageContextManager;
  readonly ownership: GlobalOwnership;
  readonly flushOwners: readonly LifecycleOwner[];
  readonly shutdownOwners: readonly LifecycleOwner[];
  unregisterInstrumentations?: () => void;
}

/** Attempts every flush owner within one absolute monotonic deadline. */
export async function flushOwners(
  owners: readonly LifecycleOwner[],
  input: FlushTelemetryInput,
  diagnostics: readonly TelemetryDiagnostic[],
  retain: (diagnostic: TelemetryDiagnostic) => void
): Promise<FlushTelemetryResult> {
  const outcome = await runBeforeDeadline(input.deadlineMonotonicMilliseconds, async () => {
    const results = await Promise.allSettled(owners.map(({ run }) => Promise.resolve().then(run)));
    retainFailedOwners("flush", owners, results, retain);
  });

  if (outcome === "failed") retain(recordDiagnostic("flush", "SIGNAL_FLUSH_FAILED"));
  return flushResult(outcome, diagnostics);
}

/** Closes intake, flushes, starts every shutdown owner, and releases owned globals once. */
export async function shutdownRuntime(
  runtime: TelemetryRuntimeLifecycle,
  input: FlushTelemetryInput,
  diagnostics: readonly TelemetryDiagnostic[],
  retain: (diagnostic: TelemetryDiagnostic) => void,
  closeIntake: () => void
): Promise<FlushTelemetryResult> {
  closeIntake();
  unregisterInstrumentations(runtime, retain);

  const flush = await flushOwners(runtime.flushOwners, input, diagnostics, retain);
  const shutdown = await runBeforeDeadline(input.deadlineMonotonicMilliseconds, async () => {
    const results = await Promise.allSettled(
      runtime.shutdownOwners.map(({ run }) => Promise.resolve().then(run))
    );
    retainFailedOwners("shutdown", runtime.shutdownOwners, results, retain);
  });
  if (shutdown === "failed") {
    retain(recordDiagnostic("shutdown", "SIGNAL_SHUTDOWN_FAILED"));
  }
  releaseOwnedGlobals(runtime);

  return Object.freeze({
    outcome:
      flush.outcome === "deadline-exceeded" || shutdown === "deadline-exceeded"
        ? "deadline-exceeded"
        : diagnostics.length === 0
          ? "flushed"
          : "degraded",
    diagnostics: Object.freeze([...diagnostics]),
  });
}

/** Releases a partially registered runtime without touching foreign global owners. */
export async function containPartialConstruction(
  runtime: TelemetryRuntimeLifecycle | undefined,
  timeoutMilliseconds: number
): Promise<void> {
  if (runtime === undefined) return;
  unregisterInstrumentations(runtime);
  await runBeforeDeadline(performance.now() + timeoutMilliseconds, async () => {
    await Promise.allSettled(runtime.shutdownOwners.map(({ run }) => Promise.resolve().then(run)));
  });
  releaseOwnedGlobals(runtime);
}

/** Starts an operation even after expiry while bounding how long the caller waits. */
export async function runBeforeDeadline(
  deadlineMonotonicMilliseconds: number,
  operation: () => Promise<void>
): Promise<"completed" | "deadline-exceeded" | "failed"> {
  const operationResult: Promise<"completed" | "failed"> = Promise.resolve()
    .then(operation)
    .then(
      () => "completed",
      () => "failed"
    );
  if (deadlineMonotonicMilliseconds <= performance.now()) {
    void operationResult;
    return "deadline-exceeded";
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;
  const deadlineResult = new Promise<"deadline-exceeded">((resolve) => {
    const schedule = (): void => {
      if (cancelled) return;
      const remaining = Math.floor(deadlineMonotonicMilliseconds - performance.now());
      if (remaining <= 0) {
        resolve("deadline-exceeded");
        return;
      }
      timer = setTimeout(schedule, Math.min(remaining, MAX_TIMER_DELAY_MILLISECONDS));
    };
    schedule();
  });

  try {
    return await Promise.race([operationResult, deadlineResult]);
  } finally {
    cancelled = true;
    if (timer !== undefined) clearTimeout(timer);
  }
}

function retainFailedOwners(
  stage: "flush" | "shutdown",
  owners: readonly LifecycleOwner[],
  results: readonly PromiseSettledResult<void>[],
  retain: (diagnostic: TelemetryDiagnostic) => void
): void {
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const fallback = stage === "flush" ? "SIGNAL_FLUSH_FAILED" : "SIGNAL_SHUTDOWN_FAILED";
      retain(recordDiagnostic(stage, owners[index]?.code ?? fallback));
    }
  });
}

function unregisterInstrumentations(
  runtime: TelemetryRuntimeLifecycle,
  retain?: (diagnostic: TelemetryDiagnostic) => void
): void {
  try {
    runtime.unregisterInstrumentations?.();
  } catch {
    retain?.(recordDiagnostic("shutdown", "INSTRUMENTATION_DISABLE_FAILED"));
  } finally {
    runtime.unregisterInstrumentations = undefined;
  }
}

function releaseOwnedGlobals(runtime: TelemetryRuntimeLifecycle): void {
  const releases: readonly [boolean, () => void][] = [
    [runtime.ownership.logs, () => logs.disable()],
    [runtime.ownership.metrics, () => metrics.disable()],
    [runtime.ownership.trace, () => trace.disable()],
    [runtime.ownership.propagation, () => propagation.disable()],
    [runtime.ownership.context, () => context.disable()],
  ];
  for (const [owned, release] of releases) {
    if (!owned) continue;
    try {
      release();
    } catch {
      // Global release is best effort after the owned provider has stopped.
    }
  }
  try {
    runtime.contextManager.disable();
  } catch {
    // The provider's own context manager is inert after global release.
  }
}

function flushResult(
  outcome: "completed" | "deadline-exceeded" | "failed",
  diagnostics: readonly TelemetryDiagnostic[]
): FlushTelemetryResult {
  return Object.freeze({
    outcome:
      outcome === "deadline-exceeded"
        ? "deadline-exceeded"
        : diagnostics.length === 0
          ? "flushed"
          : "degraded",
    diagnostics: Object.freeze([...diagnostics]),
  });
}
