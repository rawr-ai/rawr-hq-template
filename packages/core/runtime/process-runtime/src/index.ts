import type { RawrEffect } from "@rawr/sdk/effect";
import type { ExecutionDescriptorRef } from "@rawr/sdk/execution";
import {
  Exit,
  createManagedEffectRuntimeAccess,
  effectBodyToRawrEffect,
  type EffectRuntimeAccess,
} from "@rawr/core-runtime-substrate";
import {
  assertSameExecutionRef,
  executionRefKey,
  type CompiledExecutableBoundary,
  type CompiledExecutionPlan,
  type CompiledExecutionRegistryInput,
  type ExecutionDescriptorTable,
  type ExecutionDescriptorTableEntry,
  type ExecutionRegistry,
  type RuntimeExecutionDescriptor,
  type RuntimeExecutionPolicy,
} from "@rawr/core-runtime-topology";

export const RAWR_RUNTIME_PROCESS_TOPOLOGY = "packages/core/runtime/process-runtime" as const;

export type {
  CompiledExecutableBoundary,
  CompiledExecutionPlan,
  CompiledExecutionRegistryInput,
  ExecutionDescriptorTable,
  ExecutionDescriptorTableEntry,
  ExecutionRegistry,
  RuntimeExecutionDescriptor,
  RuntimeExecutionPolicy,
} from "@rawr/core-runtime-topology";

export function createExecutionDescriptorTable(
  entries: readonly ExecutionDescriptorTableEntry[],
): ExecutionDescriptorTable {
  const byKey = new Map<string, RuntimeExecutionDescriptor>();
  const normalizedEntries: ExecutionDescriptorTableEntry[] = [];

  for (const entry of entries) {
    if (entry.descriptor.ref) {
      assertSameExecutionRef(entry.ref, entry.descriptor.ref, "descriptor table entry");
    }

    const key = executionRefKey(entry.ref);
    if (byKey.has(key)) {
      throw new Error(`duplicate descriptor: ${entry.ref.executionId}`);
    }

    const descriptor = {
      ...entry.descriptor,
      ref: entry.ref,
    };
    byKey.set(key, descriptor);
    normalizedEntries.push({ ref: entry.ref, descriptor });
  }

  return {
    kind: "execution.descriptor-table",
    get(ref) {
      const descriptor = byKey.get(executionRefKey(ref));
      if (!descriptor) throw new Error(`missing descriptor: ${ref.executionId}`);
      return descriptor;
    },
    entries() {
      return normalizedEntries.values();
    },
  };
}

function assertValidExecutionPolicy(
  policy: RuntimeExecutionPolicy | undefined,
  label: string,
): void {
  if (policy?.timeoutMs === undefined) return;
  if (!Number.isFinite(policy.timeoutMs) || policy.timeoutMs < 0) {
    throw new Error(`${label} invalid execution timeout: ${policy.timeoutMs}`);
  }
}

export function createExecutionRegistry(
  input: CompiledExecutionRegistryInput,
): ExecutionRegistry {
  const byKey = new Map<string, CompiledExecutableBoundary>();
  const entries: CompiledExecutableBoundary[] = [];

  for (const plan of input.plans) {
    const key = executionRefKey(plan.ref);
    if (byKey.has(key)) {
      throw new Error(`duplicate execution plan: ${plan.ref.executionId}`);
    }

    assertValidExecutionPolicy(plan.policy, `execution plan ${plan.ref.executionId}`);

    const descriptor = input.descriptorTable.get(plan.ref);
    if (descriptor.ref) {
      assertSameExecutionRef(plan.ref, descriptor.ref, "execution plan descriptor");
    }

    const boundary = {
      kind: "compiled.executable-boundary",
      ref: plan.ref,
      descriptor,
      plan,
    } as const satisfies CompiledExecutableBoundary;
    byKey.set(key, boundary);
    entries.push(boundary);
  }

  return {
    kind: "execution.registry",
    get(ref) {
      const boundary = byKey.get(executionRefKey(ref));
      if (!boundary) throw new Error(`missing executable boundary: ${ref.executionId}`);
      return boundary;
    },
    entries() {
      return entries.values();
    },
  };
}

export interface RuntimeExecutionEvent {
  readonly name: string;
  readonly attributes?: Record<string, string | number | boolean>;
}

export type RuntimeInvocationResult<TOutput> =
  | {
      readonly kind: "runtime.invocation-result";
      readonly status: "success";
      readonly output: TOutput;
      readonly exit: Exit.Exit<TOutput, unknown>;
      readonly events: readonly RuntimeExecutionEvent[];
    }
  | {
      readonly kind: "runtime.invocation-result";
      readonly status: "failure";
      readonly cause: unknown;
      readonly exit: Exit.Exit<unknown, unknown>;
      readonly events: readonly RuntimeExecutionEvent[];
    };

export interface ProcessExecutionRuntime {
  readonly kind: "process.execution-runtime";
  execute<TOutput>(input: {
    readonly ref: ExecutionDescriptorRef;
    readonly context: unknown;
    readonly signal?: AbortSignal;
  }): Promise<TOutput>;
  executeExit<TOutput, TError = unknown>(input: {
    readonly ref: ExecutionDescriptorRef;
    readonly context: unknown;
    readonly signal?: AbortSignal;
  }): Promise<Exit.Exit<TOutput, TError>>;
  invoke<TOutput>(input: {
    readonly ref: ExecutionDescriptorRef;
    readonly context: unknown;
    readonly signal?: AbortSignal;
  }): Promise<RuntimeInvocationResult<TOutput>>;
  dispose(): Promise<void>;
}

function createExecutionSignal(input: {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}): {
  readonly signal?: AbortSignal;
  readonly dispose: () => void;
} {
  const { signal, timeoutMs } = input;
  if (timeoutMs === undefined) {
    return { signal, dispose() {} };
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error(`invalid execution timeout: ${timeoutMs}`);
  }

  const controller = new AbortController();
  const abortFromParent = () => controller.abort(signal?.reason);
  const timeout = setTimeout(
    () => controller.abort(new Error(`execution timed out after ${timeoutMs}ms`)),
    timeoutMs,
  );

  if (signal?.aborted) {
    controller.abort(signal.reason);
  } else {
    signal?.addEventListener("abort", abortFromParent, { once: true });
  }

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromParent);
    },
  };
}

export function createProcessExecutionRuntime(input: {
  readonly registry: ExecutionRegistry;
  readonly effectRuntime?: EffectRuntimeAccess;
}): ProcessExecutionRuntime {
  const effectRuntime = input.effectRuntime ?? createManagedEffectRuntimeAccess();
  async function executeExit<TOutput, TError = unknown>(inputValue: {
    readonly ref: ExecutionDescriptorRef;
    readonly context: unknown;
    readonly signal?: AbortSignal;
  }): Promise<Exit.Exit<TOutput, TError>> {
    const { ref, context, signal } = inputValue;
    const boundary = input.registry.get(ref);
    assertSameExecutionRef(ref, boundary.ref, "runtime boundary");

    const executionSignal = createExecutionSignal({
      signal,
      timeoutMs: boundary.plan.policy?.timeoutMs,
    });
    const effect = effectBodyToRawrEffect(boundary.descriptor.run, context);
    try {
      return await effectRuntime.runPromiseExit(
        effect as RawrEffect<TOutput, TError, never>,
        { signal: executionSignal.signal },
      );
    } finally {
      executionSignal.dispose();
    }
  }

  return {
    kind: "process.execution-runtime",
    async execute<TOutput>(inputValue: {
      readonly ref: ExecutionDescriptorRef;
      readonly context: unknown;
      readonly signal?: AbortSignal;
    }) {
      const exit = await executeExit<TOutput>(inputValue);
      if (Exit.isSuccess(exit)) return exit.value;
      throw exit.cause;
    },
    executeExit<TOutput, TError = unknown>(inputValue: {
      readonly ref: ExecutionDescriptorRef;
      readonly context: unknown;
      readonly signal?: AbortSignal;
    }) {
      return executeExit<TOutput, TError>(inputValue);
    },
    async invoke<TOutput>(inputValue: {
      readonly ref: ExecutionDescriptorRef;
      readonly context: unknown;
      readonly signal?: AbortSignal;
    }): Promise<RuntimeInvocationResult<TOutput>> {
      const { ref, context, signal } = inputValue;
      const boundary = input.registry.get(ref);
      assertSameExecutionRef(ref, boundary.ref, "runtime boundary");

      const events: RuntimeExecutionEvent[] = [
        {
          name: "runtime.invoke.start",
          attributes: {
            executionId: ref.executionId,
            boundary: ref.boundary,
            ...(boundary.plan.policy?.timeoutMs === undefined
              ? {}
              : { timeoutMs: boundary.plan.policy.timeoutMs }),
          },
        },
      ];

      const exit = await executeExit<TOutput>({ ref, context, signal });

      if (Exit.isSuccess(exit)) {
        events.push({
          name: "runtime.invoke.success",
          attributes: {
            executionId: ref.executionId,
            boundary: ref.boundary,
          },
        });
        return {
          kind: "runtime.invocation-result",
          status: "success",
          output: exit.value as TOutput,
          exit: exit as Exit.Exit<TOutput, unknown>,
          events,
        } satisfies RuntimeInvocationResult<TOutput>;
      }

      events.push({
        name: "runtime.invoke.failure",
        attributes: {
          executionId: ref.executionId,
          boundary: ref.boundary,
        },
      });
      return {
        kind: "runtime.invocation-result",
        status: "failure",
        cause: exit.cause,
        exit: exit as Exit.Exit<unknown, unknown>,
        events,
      } satisfies RuntimeInvocationResult<TOutput>;
    },
    dispose() {
      return effectRuntime.dispose();
    },
  };
}
