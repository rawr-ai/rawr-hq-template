import type { ExecutionDescriptorRef } from "../../spine/artifacts";
import type { ProcessExecutionRuntime } from "../process-runtime";
import {
  delegateAdapterInvocation,
  type AdapterDelegationInput,
} from "./delegation";

export interface ServerCallbackInput extends Omit<AdapterDelegationInput, "ref"> {
  readonly ref: Extract<
    ExecutionDescriptorRef,
    { boundary: "plugin.server-api" | "plugin.server-internal" }
  >;
}

export async function lowerServerCallback<TOutput>(
  runtime: ProcessExecutionRuntime,
  input: ServerCallbackInput,
) {
  return delegateAdapterInvocation<TOutput>("server", runtime, input);
}
