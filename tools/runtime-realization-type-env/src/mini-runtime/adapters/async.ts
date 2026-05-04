import type {
  AsyncStepBridgePayload,
  ExecutionDescriptorRef,
} from "../../spine/artifacts";
import type { ProcessExecutionRuntime } from "../process-runtime";
import {
  delegateAdapterInvocation,
  type AdapterDelegationInput,
} from "./delegation";

export interface AsyncHostStepCallbackInput
  extends Omit<AdapterDelegationInput, "ref"> {
  readonly ref: Extract<ExecutionDescriptorRef, { boundary: "plugin.async-step" }>;
}

export interface AsyncStepBridgeInvocationInput
  extends Omit<AdapterDelegationInput, "ref"> {}

function asyncOwnerEntries(ref: AsyncHostStepCallbackInput["ref"]) {
  const widened = ref as {
    readonly consumerId?: unknown;
    readonly scheduleId?: unknown;
    readonly workflowId?: unknown;
  };

  return [
    { kind: "workflow" as const, id: widened.workflowId },
    { kind: "schedule" as const, id: widened.scheduleId },
    { kind: "consumer" as const, id: widened.consumerId },
  ].filter(
    (entry): entry is AsyncStepBridgePayload["owner"] =>
      typeof entry.id === "string" && entry.id.length > 0,
  );
}

function assertAsyncStepBridgePayload(payload: AsyncStepBridgePayload): void {
  const { ref } = payload;

  if (ref.boundary !== "plugin.async-step") {
    throw new Error(
      `async-step adapter cannot invoke ${ref.boundary} boundary ${ref.executionId}`,
    );
  }

  const owners = asyncOwnerEntries(ref);
  if (owners.length !== 1) {
    throw new Error(
      `async bridge payload ${ref.executionId} must declare exactly one workflow, schedule, or consumer owner`,
    );
  }

  const owner = owners[0];
  if (!owner) {
    throw new Error(
      `async bridge payload ${ref.executionId} must declare exactly one workflow, schedule, or consumer owner`,
    );
  }
  if (
    payload.owner.kind !== owner.kind ||
    payload.owner.id !== owner.id ||
    payload.stepId !== ref.stepId
  ) {
    throw new Error(
      `async bridge payload ${ref.executionId} owner or step metadata does not match its execution ref`,
    );
  }
}

export function createAsyncStepBridgePayload(input: {
  readonly ref: AsyncHostStepCallbackInput["ref"];
}): AsyncStepBridgePayload {
  const owners = asyncOwnerEntries(input.ref);
  if (owners.length !== 1) {
    throw new Error(
      `async bridge payload ${input.ref.executionId} must declare exactly one workflow, schedule, or consumer owner`,
    );
  }

  const owner = owners[0];
  if (!owner) {
    throw new Error(
      `async bridge payload ${input.ref.executionId} must declare exactly one workflow, schedule, or consumer owner`,
    );
  }

  const payload = {
    kind: "adapter.async-step-bridge-payload",
    ref: input.ref,
    owner,
    stepId: input.ref.stepId,
    diagnostics: [],
  } as const satisfies AsyncStepBridgePayload;

  assertAsyncStepBridgePayload(payload);
  return payload;
}

export async function lowerAsyncStepCallback<TOutput>(
  runtime: ProcessExecutionRuntime,
  input: AsyncHostStepCallbackInput,
) {
  return delegateAdapterInvocation<TOutput>("async-step", runtime, input);
}

/**
 * Lowers a validated async-step bridge payload into the runtime invocation path.
 * The payload keeps owner and step identity attached to the ref; it does not
 * claim durable queueing, retry, cancellation, or workflow-status semantics.
 */
export async function lowerAsyncStepBridge<TOutput>(
  runtime: ProcessExecutionRuntime,
  payload: AsyncStepBridgePayload,
  input: AsyncStepBridgeInvocationInput,
) {
  assertAsyncStepBridgePayload(payload);
  return lowerAsyncStepCallback<TOutput>(runtime, {
    ref: payload.ref,
    context: input.context,
    instrumentation: input.instrumentation,
  });
}
