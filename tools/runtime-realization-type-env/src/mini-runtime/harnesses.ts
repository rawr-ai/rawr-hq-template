import type {
  AsyncStepBridgePayload,
  RuntimeDiagnostic,
  ServerAdapterCallbackPayload,
} from "../spine/artifacts";
import {
  lowerAsyncStepBridge,
  type AsyncStepBridgeInvocationInput,
} from "./adapters/async";
import {
  lowerServerAdapterCallback,
  type ServerAdapterCallbackInput,
} from "./adapters/server";
import type {
  ProcessExecutionRuntime,
  RuntimeInvocationResult,
} from "./process-runtime";

export type MiniRuntimeHarnessKind = "server" | "async";

/**
 * Lab proof trace for the mini-runtime harnesses.
 *
 * These records prove that the runtime harness accepted a compiled adapter
 * payload, invoked through ProcessExecutionRuntime, and observed stop state.
 * They are not public telemetry, routing logs, or durable workflow history.
 */
export interface MiniRuntimeHarnessRecord {
  readonly kind: "mini-runtime.harness-record";
  readonly harness: MiniRuntimeHarnessKind;
  readonly harnessId: string;
  readonly phase:
    | "harness.start"
    | "harness.invoke.start"
    | "harness.invoke.finished"
    | "harness.invoke.failed"
    | "harness.stop";
  readonly executionId?: string;
  readonly status?: "success" | "failure" | "stopped";
}

/**
 * Started harnesses are deliberately lab-only authorities: they bind a set of
 * already-compiled payloads to one ProcessExecutionRuntime and expose just
 * enough lifecycle to prove runtime-owned invocation. They do not decide the
 * public DX shape, boundary policy, or real host integration contract.
 */
interface StartedHarnessBase {
  readonly kind: "runtime.started-harness";
  readonly harness: MiniRuntimeHarnessKind;
  readonly harnessId: string;
  readonly payloadExecutionIds: readonly string[];
  readonly diagnostics: readonly RuntimeDiagnostic[];
  records(): readonly MiniRuntimeHarnessRecord[];
  stop(): Promise<readonly MiniRuntimeHarnessRecord[]>;
}

export interface StartedMiniServerHarness extends StartedHarnessBase {
  readonly harness: "server";
  /**
   * Simulates a host route hit against a compiled server callback payload.
   * The harness owns the runtime invocation; it is not mounting Elysia, oRPC,
   * or any future server adapter as an architectural commitment.
   */
  handleRoute<TOutput>(input: {
    readonly executionId: string;
  } & ServerAdapterCallbackInput): Promise<RuntimeInvocationResult<TOutput>>;
}

export interface StartedMiniAsyncHarness extends StartedHarnessBase {
  readonly harness: "async";
  /**
   * Simulates an async step dispatch against a compiled bridge payload.
   * This proves adapter-to-runtime lowering only; retry, queueing,
   * cancellation, durability, and workflow status semantics remain undecided.
   */
  runStep<TOutput>(input: {
    readonly executionId: string;
  } & AsyncStepBridgeInvocationInput): Promise<RuntimeInvocationResult<TOutput>>;
}

function record(input: Omit<MiniRuntimeHarnessRecord, "kind">): MiniRuntimeHarnessRecord {
  return {
    kind: "mini-runtime.harness-record",
    ...input,
  };
}

function assertServerPayload(value: unknown): asserts value is ServerAdapterCallbackPayload {
  if (
    !value ||
    typeof value !== "object" ||
    (value as { readonly kind?: unknown }).kind !== "adapter.server-callback-payload"
  ) {
    throw new Error("server harness accepts only adapter.server-callback-payload inputs");
  }
}

function assertAsyncPayload(value: unknown): asserts value is AsyncStepBridgePayload {
  if (
    !value ||
    typeof value !== "object" ||
    (value as { readonly kind?: unknown }).kind !==
      "adapter.async-step-bridge-payload"
  ) {
    throw new Error("async harness accepts only adapter.async-step-bridge-payload inputs");
  }
}

/**
 * Dispatch keys are execution ids from compiled adapter payloads only.
 * The harness intentionally does not derive routes, workflow schedules, or
 * ownership from source descriptors at mount time.
 */
function payloadByExecutionId<TPayload extends { readonly ref: { readonly executionId: string } }>(
  payloads: readonly TPayload[],
): Map<string, TPayload> {
  const byId = new Map<string, TPayload>();

  for (const payload of payloads) {
    const executionId = payload.ref.executionId;
    if (byId.has(executionId)) {
      throw new Error(`duplicate harness payload for ${executionId}`);
    }
    byId.set(executionId, payload);
  }

  return byId;
}

function createHarnessLifecycle(input: {
  readonly harness: MiniRuntimeHarnessKind;
  readonly harnessId: string;
}) {
  let stopped = false;
  const records: MiniRuntimeHarnessRecord[] = [
    record({
      harness: input.harness,
      harnessId: input.harnessId,
      phase: "harness.start",
    }),
  ];

  return {
    records,
    assertActive(executionId: string) {
      if (stopped) {
        records.push(
          record({
            harness: input.harness,
            harnessId: input.harnessId,
            phase: "harness.invoke.failed",
            executionId,
            status: "stopped",
          }),
        );
        throw new Error(`${input.harness} harness ${input.harnessId} is stopped`);
      }
    },
    /**
     * Stop is a local lifecycle guard for later invocations, not host teardown.
     * Existing returned records remain immutable snapshots, and stop does not
     * model adapter unmounting, draining, cancellation, or process shutdown.
     */
    async stop() {
      if (!stopped) {
        stopped = true;
        records.push(
          record({
            harness: input.harness,
            harnessId: input.harnessId,
            phase: "harness.stop",
            status: "stopped",
          }),
        );
      }
      return [...records];
    },
  };
}

/**
 * Mounting here is payload-only: this accepts compiled server adapter payloads,
 * not arbitrary route definitions or host framework objects. Real Elysia/oRPC
 * attachment remains outside this proof harness.
 */
export function mountMiniServerHarness(input: {
  readonly harnessId: string;
  readonly runtime: ProcessExecutionRuntime;
  readonly payloads: readonly ServerAdapterCallbackPayload[];
  readonly diagnostics?: readonly RuntimeDiagnostic[];
}): StartedMiniServerHarness {
  for (const payload of input.payloads) assertServerPayload(payload);

  const payloads = payloadByExecutionId(input.payloads);
  const lifecycle = createHarnessLifecycle({
    harness: "server",
    harnessId: input.harnessId,
  });

  return {
    kind: "runtime.started-harness",
    harness: "server",
    harnessId: input.harnessId,
    payloadExecutionIds: [...payloads.keys()],
    diagnostics: input.diagnostics ?? [],
    records() {
      return [...lifecycle.records];
    },
    stop: lifecycle.stop,
    async handleRoute<TOutput>(
      routeInput: { readonly executionId: string } & ServerAdapterCallbackInput,
    ) {
      const { executionId, ...callbackInput } = routeInput;
      lifecycle.assertActive(executionId);
      const payload = payloads.get(executionId);
      if (!payload) {
        lifecycle.records.push(
          record({
            harness: "server",
            harnessId: input.harnessId,
            phase: "harness.invoke.failed",
            executionId,
            status: "failure",
          }),
        );
        throw new Error(`server harness missing payload ${executionId}`);
      }

      lifecycle.records.push(
        record({
          harness: "server",
          harnessId: input.harnessId,
          phase: "harness.invoke.start",
          executionId,
        }),
      );

      try {
        const result = await lowerServerAdapterCallback<TOutput>(
          input.runtime,
          payload,
          callbackInput,
        );
        lifecycle.records.push(
          record({
            harness: "server",
            harnessId: input.harnessId,
            phase: "harness.invoke.finished",
            executionId,
            status: result.status,
          }),
        );
        return result;
      } catch (error) {
        lifecycle.records.push(
          record({
            harness: "server",
            harnessId: input.harnessId,
            phase: "harness.invoke.failed",
            executionId,
            status: "failure",
          }),
        );
        throw error;
      }
    },
  };
}

/**
 * Mounting here is payload-only: this accepts compiled async bridge payloads,
 * not workflow definitions, queues, schedulers, or Inngest host objects.
 */
export function mountMiniAsyncHarness(input: {
  readonly harnessId: string;
  readonly runtime: ProcessExecutionRuntime;
  readonly payloads: readonly AsyncStepBridgePayload[];
  readonly diagnostics?: readonly RuntimeDiagnostic[];
}): StartedMiniAsyncHarness {
  for (const payload of input.payloads) assertAsyncPayload(payload);

  const payloads = payloadByExecutionId(input.payloads);
  const lifecycle = createHarnessLifecycle({
    harness: "async",
    harnessId: input.harnessId,
  });

  return {
    kind: "runtime.started-harness",
    harness: "async",
    harnessId: input.harnessId,
    payloadExecutionIds: [...payloads.keys()],
    diagnostics: input.diagnostics ?? [],
    records() {
      return [...lifecycle.records];
    },
    stop: lifecycle.stop,
    async runStep<TOutput>(
      stepInput: { readonly executionId: string } & AsyncStepBridgeInvocationInput,
    ) {
      const { executionId, ...bridgeInput } = stepInput;
      lifecycle.assertActive(executionId);
      const payload = payloads.get(executionId);
      if (!payload) {
        lifecycle.records.push(
          record({
            harness: "async",
            harnessId: input.harnessId,
            phase: "harness.invoke.failed",
            executionId,
            status: "failure",
          }),
        );
        throw new Error(`async harness missing payload ${executionId}`);
      }

      lifecycle.records.push(
        record({
          harness: "async",
          harnessId: input.harnessId,
          phase: "harness.invoke.start",
          executionId,
        }),
      );

      try {
        const result = await lowerAsyncStepBridge<TOutput>(
          input.runtime,
          payload,
          bridgeInput,
        );
        lifecycle.records.push(
          record({
            harness: "async",
            harnessId: input.harnessId,
            phase: "harness.invoke.finished",
            executionId,
            status: result.status,
          }),
        );
        return result;
      } catch (error) {
        lifecycle.records.push(
          record({
            harness: "async",
            harnessId: input.harnessId,
            phase: "harness.invoke.failed",
            executionId,
            status: "failure",
          }),
        );
        throw error;
      }
    },
  };
}
