import type {
  ExecutionDescriptorRef,
} from "../../spine/artifacts";
import type { ProcessExecutionRuntime } from "../process-runtime";

export interface AsyncHostStepCallbackInput {
  readonly ref: ExecutionDescriptorRef;
  readonly context: unknown;
}

export async function lowerAsyncStepCallback<TOutput>(
  runtime: ProcessExecutionRuntime,
  input: AsyncHostStepCallbackInput,
) {
  return runtime.invoke<TOutput>({
    ref: input.ref,
    context: input.context,
  });
}
