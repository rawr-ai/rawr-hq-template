import type { MountReadyProcess } from "../../process-runtime/src/mount-ready-process";
import type { StartedHarness } from "./started-harness";

export interface NativeStopPolicy {
  readonly policy: "waitForNativeStop";
  readonly deadlineMs: number;
}

export type FinalizationSnapshot =
  | { readonly state: "running" }
  | {
      readonly state: "draining";
      /** Epoch milliseconds for observation; elapsed-time enforcement is monotonic. */
      readonly deadline: number;
      readonly pendingNativeStop: readonly string[];
      readonly deadlineExceeded: boolean;
    }
  | { readonly state: "settled"; readonly deadlineExceeded: boolean };

/** The terminal SDK invokes this before acquisition; mounting independently admits its input. */
export function validateFinalizationPolicy(value: unknown): NativeStopPolicy {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => key !== "policy" && key !== "deadlineMs") ||
    !("policy" in value) ||
    value.policy !== "waitForNativeStop" ||
    !("deadlineMs" in value) ||
    typeof value.deadlineMs !== "number" ||
    !Number.isInteger(value.deadlineMs) ||
    value.deadlineMs < 0 ||
    value.deadlineMs > 2_147_483_647
  ) {
    throw new TypeError("Finalization requires an explicit native timer-range deadline.");
  }
  return Object.freeze({ policy: "waitForNativeStop", deadlineMs: value.deadlineMs });
}

export function createFinalization(input: {
  readonly process: Pick<MountReadyProcess, "closeAdmission" | "stop">;
  readonly started: readonly StartedHarness[];
  readonly policy: NativeStopPolicy;
  readonly observe: (kind: string, payload: Readonly<Record<string, unknown>>) => void;
}) {
  let state: FinalizationSnapshot = Object.freeze({ state: "running" });
  let operation: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let due = 0;

  const observeDeadline = (timerElapsed = false) => {
    if (
      state.state !== "draining" ||
      state.deadlineExceeded ||
      (!timerElapsed && performance.now() < due)
    )
      return;
    state = Object.freeze({ ...state, deadlineExceeded: true });
    input.observe("process.finalization.deadline", {
      deadline: state.deadline,
      pendingNativeStop: state.pendingNativeStop,
    });
  };

  async function finalize(): Promise<void> {
    let failure: unknown;
    let failed = false;
    const remember = (error: unknown) => {
      if (!failed) failure = error;
      failed = true;
    };
    for (const started of [...input.started].reverse()) {
      let outcome: "resolved" | "rejected" = "resolved";
      try {
        await started.stop.call(started.nativeHandle);
      } catch (error) {
        outcome = "rejected";
        remember(error);
      }
      if (state.state !== "draining") throw new Error("Finalization lost its draining state.");
      state = Object.freeze({
        ...state,
        pendingNativeStop: Object.freeze(
          state.pendingNativeStop.filter((id) => id !== started.descriptorId)
        ),
      });
      input.observe("harness.stop.settled", { harnessId: started.descriptorId, outcome });
      observeDeadline();
    }
    try {
      // Native stop owns its probes and drain; process stop then drains admitted invocations.
      await input.process.stop();
    } catch (error) {
      remember(error);
    }
    observeDeadline();
    if (state.state !== "draining") throw new Error("Finalization lost its draining state.");
    state = Object.freeze({ state: "settled", deadlineExceeded: state.deadlineExceeded });
    clearTimeout(timer);
    input.observe("process.finalization.settled", { deadlineExceeded: state.deadlineExceeded });
    if (failed) throw failure;
  }

  return Object.freeze({
    isRunning: () => state.state === "running",
    snapshot: (): FinalizationSnapshot => state,
    stop(): Promise<void> {
      if (operation !== undefined) return operation;
      due = performance.now() + input.policy.deadlineMs;
      state = Object.freeze({
        state: "draining",
        deadline: Date.now() + input.policy.deadlineMs,
        pendingNativeStop: Object.freeze(
          [...input.started].reverse().map((item) => item.descriptorId)
        ),
        deadlineExceeded: false,
      });
      operation = Promise.resolve().then(finalize);
      // This closes admission synchronously, but never waits before asking native owners to stop.
      input.process.closeAdmission();
      timer = setTimeout(() => observeDeadline(true), input.policy.deadlineMs);
      input.observe("process.finalization.started", {
        deadline: state.deadline,
        pendingNativeStop: state.pendingNativeStop,
      });
      observeDeadline();
      return operation;
    },
  });
}
