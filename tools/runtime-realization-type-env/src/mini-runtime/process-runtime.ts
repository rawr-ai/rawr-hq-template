import { Effect as VendorEffect, Exit } from "effect";
import type { RawrEffect } from "../sdk/effect";
import type {
  CompiledExecutableBoundary,
  CompiledExecutionPlan,
  ExecutionDescriptor,
  ExecutionDescriptorRef,
  ExecutionDescriptorTable,
  ExecutionDescriptorTableEntry,
  ExecutionRegistry,
} from "../spine/artifacts";
import {
  createManagedEffectRuntimeAccess,
  type EffectRuntimeAccess,
} from "./managed-runtime";

function key(ref: ExecutionDescriptorRef): string {
  return ref.executionId;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(([entryKey, entryValue]) => `${JSON.stringify(entryKey)}:${stableJson(entryValue)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "undefined";
}

function assertSameExecutableRef(
  expected: ExecutionDescriptorRef,
  actual: ExecutionDescriptorRef,
  label: string,
): void {
  const expectedIdentity = stableJson(expected);
  const actualIdentity = stableJson(actual);

  if (expectedIdentity !== actualIdentity) {
    throw new Error(
      `${label} mismatch: expected ${expected.boundary}/${expected.executionId}, got ${actual.boundary}/${actual.executionId}`,
    );
  }
}

export function createExecutionDescriptorTable(
  entries: readonly ExecutionDescriptorTableEntry[],
): ExecutionDescriptorTable {
  const byId = new Map<string, ExecutionDescriptor<any, any, any, any, any>>();

  for (const entry of entries) {
    assertSameExecutableRef(entry.ref, entry.descriptor.ref, "descriptor table entry");

    const entryKey = key(entry.ref);
    if (byId.has(entryKey)) {
      throw new Error(`duplicate descriptor: ${entry.ref.executionId}`);
    }

    byId.set(entryKey, entry.descriptor);
  }

  return {
    kind: "execution.descriptor-table",
    get(ref) {
      const descriptor = byId.get(key(ref));
      if (!descriptor) throw new Error(`missing descriptor: ${ref.executionId}`);
      return descriptor;
    },
    entries() {
      return entries.values();
    },
  };
}

export function createExecutionRegistry(input: {
  readonly plans: readonly CompiledExecutionPlan[];
  readonly descriptorTable: ExecutionDescriptorTable;
}): ExecutionRegistry {
  const byId = new Map<string, CompiledExecutableBoundary>();

  for (const plan of input.plans) {
    const planKey = key(plan.ref);
    if (byId.has(planKey)) {
      throw new Error(`duplicate execution plan: ${plan.ref.executionId}`);
    }

    const descriptor = input.descriptorTable.get(plan.ref);
    assertSameExecutableRef(plan.ref, descriptor.ref, "execution plan descriptor");

    byId.set(planKey, {
      kind: "compiled.executable-boundary",
      ref: plan.ref,
      descriptor,
      plan,
    });
  }

  return {
    kind: "execution.registry",
    get(ref) {
      const boundary = byId.get(key(ref));
      if (!boundary) throw new Error(`missing executable boundary: ${ref.executionId}`);
      return boundary;
    },
  };
}

export interface RuntimeSimulationEvent {
  readonly name: string;
  readonly attributes?: Record<string, string | number | boolean>;
}

export type RuntimeInvocationResult<TOutput> =
  | {
      readonly kind: "runtime.invocation-result";
      readonly status: "success";
      readonly output: TOutput;
      readonly exit: Exit.Exit<TOutput, unknown>;
      readonly events: readonly RuntimeSimulationEvent[];
    }
  | {
      readonly kind: "runtime.invocation-result";
      readonly status: "failure";
      readonly error: unknown;
      readonly exit: Exit.Exit<unknown, unknown>;
      readonly events: readonly RuntimeSimulationEvent[];
    };

export interface ProcessExecutionRuntime {
  readonly kind: "process.execution-runtime";
  invoke<TOutput>(input: {
    readonly ref: ExecutionDescriptorRef;
    readonly context: unknown;
  }): Promise<RuntimeInvocationResult<TOutput>>;
  dispose(): Promise<void>;
}

export function createProcessExecutionRuntime(input: {
  readonly registry: ExecutionRegistry;
  readonly effectRuntime?: EffectRuntimeAccess;
}): ProcessExecutionRuntime {
  const effectRuntime = input.effectRuntime ?? createManagedEffectRuntimeAccess();

  return {
    kind: "process.execution-runtime",
    async invoke<TOutput>({ ref, context }: {
      readonly ref: ExecutionDescriptorRef;
      readonly context: unknown;
    }): Promise<RuntimeInvocationResult<TOutput>> {
      const events: RuntimeSimulationEvent[] = [
        {
          name: "runtime.invoke.start",
          attributes: {
            executionId: ref.executionId,
            boundary: ref.boundary,
          },
        },
      ];

      const boundary = input.registry.get(ref);
      assertSameExecutableRef(ref, boundary.ref, "runtime boundary");
      events.push({
        name: "runtime.registry.resolve",
        attributes: {
          executionId: boundary.ref.executionId,
        },
      });
      events.push({
        name: "runtime.effect-runtime.enter",
        attributes: {
          executionId: boundary.ref.executionId,
        },
      });

      const exit = await effectRuntime.runPromiseExit(
        descriptorToEffect<TOutput>(boundary.descriptor, context),
      );

      if (Exit.isSuccess(exit)) {
        events.push({
          name: "runtime.invoke.success",
          attributes: {
            executionId: boundary.ref.executionId,
          },
        });
        return {
          kind: "runtime.invocation-result",
          status: "success",
          output: exit.value,
          exit,
          events,
        };
      }

      events.push({
        name: "runtime.invoke.failure",
        attributes: {
          executionId: boundary.ref.executionId,
        },
      });
      return {
        kind: "runtime.invocation-result",
        status: "failure",
        error: exit.cause,
        exit,
        events,
      };
    },
    dispose() {
      return effectRuntime.dispose();
    },
  };
}

export function descriptorToEffect<TOutput>(
  descriptor: ExecutionDescriptor<unknown, TOutput, unknown, unknown>,
  context: unknown,
): RawrEffect<TOutput, unknown, never> {
  const result = descriptor.run(context as never);

  if (VendorEffect.isEffect(result)) {
    return result as RawrEffect<TOutput, unknown, never>;
  }

  return VendorEffect.gen(function* () {
    return yield* (result as Generator<any, TOutput, unknown>);
  }) as RawrEffect<TOutput, unknown, never>;
}

export async function runDescriptor<TOutput>(
  descriptor: ExecutionDescriptor<unknown, TOutput, unknown, unknown>,
  context: unknown,
): Promise<RuntimeInvocationResult<TOutput>> {
  const ref = descriptor.ref;
  const table = createExecutionDescriptorTable([{ ref, descriptor }]);
  const registry = createExecutionRegistry({
    plans: [{ kind: "compiled.execution-plan", ref }],
    descriptorTable: table,
  });

  const runtime = createProcessExecutionRuntime({ registry });
  try {
    return await runtime.invoke<TOutput>({
      ref,
      context,
    });
  } finally {
    await runtime.dispose();
  }
}
