import type { ExecutionDescriptorRef } from "../../spine/artifacts";
import type {
  ProcessExecutionRuntime,
  RuntimeInvocationResult,
} from "../process-runtime";

export type AdapterDelegationKind = "server" | "async-step";

export interface AdapterDelegationEvent {
  readonly kind: "adapter.delegation-event";
  readonly name:
    | "adapter.delegate.start"
    | "adapter.delegate.finish"
    | "adapter.delegate.failure";
  readonly adapter: AdapterDelegationKind;
  readonly executionId: string;
  readonly boundary: string;
  readonly status?: "success" | "failure";
}

export interface AdapterDelegationInstrumentation {
  record(event: AdapterDelegationEvent): void;
}

export interface AdapterDelegationInput {
  readonly ref: ExecutionDescriptorRef;
  readonly context: unknown;
  readonly instrumentation?: AdapterDelegationInstrumentation;
}

function adapterAcceptsBoundary(
  adapter: AdapterDelegationKind,
  boundary: ExecutionDescriptorRef["boundary"],
): boolean {
  if (adapter === "server") {
    return boundary === "plugin.server-api" || boundary === "plugin.server-internal";
  }

  return boundary === "plugin.async-step";
}

/**
 * Adapter shims never execute descriptors directly. They only validate that the
 * boundary belongs to the selected adapter, then hand invocation authority to
 * the process runtime so wrong-boundary calls fail before descriptor lookup.
 */
export async function delegateAdapterInvocation<TOutput>(
  adapter: AdapterDelegationKind,
  runtime: ProcessExecutionRuntime,
  input: AdapterDelegationInput,
): Promise<RuntimeInvocationResult<TOutput>> {
  input.instrumentation?.record({
    kind: "adapter.delegation-event",
    name: "adapter.delegate.start",
    adapter,
    executionId: input.ref.executionId,
    boundary: input.ref.boundary,
  });

  try {
    if (!adapterAcceptsBoundary(adapter, input.ref.boundary)) {
      throw new Error(
        `${adapter} adapter cannot invoke ${input.ref.boundary} boundary ${input.ref.executionId}`,
      );
    }

    const result = await runtime.invoke<TOutput>({
      ref: input.ref,
      context: input.context,
    });

    input.instrumentation?.record({
      kind: "adapter.delegation-event",
      name: "adapter.delegate.finish",
      adapter,
      executionId: input.ref.executionId,
      boundary: input.ref.boundary,
      status: result.status,
    });

    return result;
  } catch (error) {
    input.instrumentation?.record({
      kind: "adapter.delegation-event",
      name: "adapter.delegate.failure",
      adapter,
      executionId: input.ref.executionId,
      boundary: input.ref.boundary,
      status: "failure",
    });
    throw error;
  }
}
