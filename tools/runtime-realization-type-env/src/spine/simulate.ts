import type {
  CompiledExecutableBoundary,
  CompiledExecutionPlan,
  ExecutionDescriptor,
  ExecutionDescriptorRef,
  ExecutionDescriptorTable,
  ExecutionDescriptorTableEntry,
  ExecutionRegistry,
  RuntimeDiagnostic,
} from "./artifacts";
import type { RuntimeProfile } from "../sdk/runtime/profiles";

function key(ref: ExecutionDescriptorRef): string {
  return ref.executionId;
}

function assertSameExecutableRef(
  expected: ExecutionDescriptorRef,
  actual: ExecutionDescriptorRef,
  label: string,
): void {
  if (expected.executionId !== actual.executionId || expected.boundary !== actual.boundary) {
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
      readonly events: readonly RuntimeSimulationEvent[];
    }
  | {
      readonly kind: "runtime.invocation-result";
      readonly status: "failure";
      readonly error: unknown;
      readonly events: readonly RuntimeSimulationEvent[];
    };

export interface ProcessExecutionRuntime {
  readonly kind: "process.execution-runtime";
  invoke<TOutput>(input: {
    readonly ref: ExecutionDescriptorRef;
    readonly context: unknown;
  }): RuntimeInvocationResult<TOutput>;
}

export function createProcessExecutionRuntime(input: {
  readonly registry: ExecutionRegistry;
}): ProcessExecutionRuntime {
  return {
    kind: "process.execution-runtime",
    invoke<TOutput>({ ref, context }: {
      readonly ref: ExecutionDescriptorRef;
      readonly context: unknown;
    }): RuntimeInvocationResult<TOutput> {
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

      try {
        const output = runDescriptor<TOutput>(boundary.descriptor, context);
        events.push({
          name: "runtime.invoke.success",
          attributes: {
            executionId: boundary.ref.executionId,
          },
        });
        return {
          kind: "runtime.invocation-result",
          status: "success",
          output,
          events,
        };
      } catch (error) {
        events.push({
          name: "runtime.invoke.failure",
          attributes: {
            executionId: boundary.ref.executionId,
          },
        });
        return {
          kind: "runtime.invocation-result",
          status: "failure",
          error,
          events,
        };
      }
    },
  };
}

export function runDescriptor<TOutput>(
  descriptor: ExecutionDescriptor<unknown, TOutput, unknown, unknown>,
  context: unknown,
): TOutput {
  const result = descriptor.run(context as never);

  if (typeof Object(result)[Symbol.iterator] === "function") {
    const iterator = (result as Iterable<unknown>)[Symbol.iterator]() as Iterator<
      unknown,
      TOutput,
      unknown
    >;
    let next = iterator.next();
    while (!next.done) next = iterator.next(undefined);
    return next.value;
  }

  throw new Error("descriptor did not return an iterable RAWR Effect body");
}

export function validateProviderClosure(profile: RuntimeProfile): RuntimeDiagnostic[] {
  const selectedResourceIds = new Set(
    profile.providerSelections.map((selection) => selection.resource.id),
  );

  return profile.providerSelections.flatMap((selection) =>
    selection.provider.requires
      .filter(
        (requirement) =>
          !requirement.optional && !selectedResourceIds.has(requirement.resource.id),
      )
      .map((requirement) => ({
        code: "runtime.provider.missing-required-resource",
        message: `provider ${selection.provider.id} requires ${requirement.resource.id}, but the profile does not select a provider for it`,
      })),
  );
}
