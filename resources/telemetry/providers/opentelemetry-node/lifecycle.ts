import type { FlushTelemetryInput, FlushTelemetryResult } from "@habitat-ai/resource-telemetry";
import { context, metrics, propagation, trace } from "@opentelemetry/api";
import { logs } from "@opentelemetry/api-logs";
import type { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";

import {
  diagnosticsSnapshot,
  exportCallbackAccountingSnapshot,
  recordDiagnostic,
  retainDiagnostic,
  type TelemetryRecordState,
} from "./neutral.js";

const MAX_TIMER_DELAY_MILLISECONDS = 2_147_483_647;

/** One owned signal operation attempted during flush or shutdown. */
export interface LifecycleOwner {
  readonly code: string;
  readonly run: () => Promise<void>;
}

/** Exact process-global slots registered by one provider lease. */
export interface GlobalOwnership {
  context: boolean;
  propagation: boolean;
  trace: boolean;
  metrics: boolean;
  logs: boolean;
}

/** Provider-private runtime values required for bounded release. */
export interface TelemetryRuntimeLifecycle {
  readonly contextManager: AsyncLocalStorageContextManager;
  readonly ownership: GlobalOwnership;
  readonly flushOwners: readonly LifecycleOwner[];
  readonly shutdownOwners: readonly LifecycleOwner[];
  /** Removes native instrumentation only while its exact global configuration is still owned. */
  readonly releaseORPC?: () => void;
}

/** Attempts every flush owner within one absolute monotonic deadline. */
export async function flushOwners(
  owners: readonly LifecycleOwner[],
  input: FlushTelemetryInput,
  state: TelemetryRecordState
): Promise<FlushTelemetryResult> {
  let deadlineExceeded = false;
  for (const owner of owners) {
    const outcome = await runBeforeDeadline(input.deadlineMonotonicMilliseconds, owner.run);
    if (outcome === "deadline-exceeded") deadlineExceeded = true;
    if (outcome === "failed") {
      retainDiagnostic(state, recordDiagnostic("flush", owner.code));
    }
  }
  return resultSnapshot(state, deadlineExceeded);
}

/** Flushes and releases every native owner in reverse order under one deadline. */
export async function releaseRuntime(
  runtime: TelemetryRuntimeLifecycle,
  input: FlushTelemetryInput,
  state: TelemetryRecordState,
  closeIntake: () => void
): Promise<FlushTelemetryResult> {
  closeIntake();
  unregisterOwnedGlobals(runtime);
  let deadlineExceeded = false;

  const flush = await flushOwners(runtime.flushOwners, input, state);
  if (flush.outcome === "deadline-exceeded") deadlineExceeded = true;

  for (const owner of runtime.shutdownOwners) {
    const outcome = await runBeforeDeadline(input.deadlineMonotonicMilliseconds, owner.run);
    if (outcome === "deadline-exceeded") deadlineExceeded = true;
    if (outcome === "failed") {
      retainDiagnostic(state, recordDiagnostic("shutdown", owner.code));
    }
  }
  return resultSnapshot(state, deadlineExceeded);
}

/** Releases a partially constructed or registered runtime without touching foreign globals. */
export async function containPartialConstruction(
  runtime: TelemetryRuntimeLifecycle | undefined,
  timeoutMilliseconds: number
): Promise<void> {
  if (runtime === undefined) return;
  unregisterOwnedGlobals(runtime);
  const deadline = performance.now() + timeoutMilliseconds;
  for (const owner of runtime.shutdownOwners) {
    await runBeforeDeadline(deadline, owner.run);
  }
}

/** Starts every stage even after expiry while bounding how long its caller waits. */
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

function resultSnapshot(
  state: TelemetryRecordState,
  deadlineExceeded: boolean
): FlushTelemetryResult {
  const diagnostics = diagnosticsSnapshot(state);
  return Object.freeze({
    outcome: deadlineExceeded
      ? "deadline-exceeded"
      : diagnostics.length === 0
        ? "flushed"
        : "degraded",
    accounting: exportCallbackAccountingSnapshot(state),
    diagnostics,
  });
}

/** Synchronously unregisters only this runtime's acquired global slots in reverse order. */
export function unregisterOwnedGlobals(runtime: TelemetryRuntimeLifecycle): void {
  try {
    runtime.releaseORPC?.();
  } catch {
    // Instrumentation cleanup must not prevent the remaining owned releases.
  }
  const releases: readonly [keyof GlobalOwnership, () => void][] = [
    ["logs", () => logs.disable()],
    ["metrics", () => metrics.disable()],
    ["trace", () => trace.disable()],
    ["propagation", () => propagation.disable()],
    ["context", () => context.disable()],
  ];
  for (const [slot, release] of releases) {
    if (!runtime.ownership[slot]) continue;
    runtime.ownership[slot] = false;
    try {
      release();
    } catch {
      // The selected lease never converts telemetry cleanup into product failure.
    }
  }
  try {
    runtime.contextManager.disable();
  } catch {
    // The provider's own context manager is inert after global release.
  }
}
