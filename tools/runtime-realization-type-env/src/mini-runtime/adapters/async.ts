import type { ExecutionDescriptorRef } from "../../spine/artifacts";
import type { ProcessExecutionRuntime } from "../process-runtime";
import {
  delegateAdapterInvocation,
  type AdapterDelegationInput,
} from "./delegation";

export interface AsyncHostStepCallbackInput
  extends Omit<AdapterDelegationInput, "ref"> {
  readonly ref: Extract<ExecutionDescriptorRef, { boundary: "plugin.async-step" }>;
}

export async function lowerAsyncStepCallback<TOutput>(
  runtime: ProcessExecutionRuntime,
  input: AsyncHostStepCallbackInput,
) {
  return delegateAdapterInvocation<TOutput>("async-step", runtime, input);
}
