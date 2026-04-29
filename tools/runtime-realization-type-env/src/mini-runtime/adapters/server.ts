import type {
  ExecutionDescriptorRef,
} from "../../spine/artifacts";
import type { ProcessExecutionRuntime } from "../process-runtime";

export interface ServerCallbackInput {
  readonly ref: ExecutionDescriptorRef;
  readonly context: unknown;
}

export async function lowerServerCallback<TOutput>(
  runtime: ProcessExecutionRuntime,
  input: ServerCallbackInput,
) {
  return runtime.invoke<TOutput>({
    ref: input.ref,
    context: input.context,
  });
}
