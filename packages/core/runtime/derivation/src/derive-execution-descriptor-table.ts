import type {
  AsyncStepEffectDescriptor,
  ExecutionDescriptor,
  HabitatEffect,
  ProcedureExecutionContext,
} from "../../definition/src/index";
import { Effect, isHabitatEffect } from "../../definition/src/index";
import {
  assertExecutionDescriptorRefOwnData,
  type ExecutionDescriptorIdentityInput,
  type ExecutionDescriptorRef,
  ExecutionDescriptorRefRuntimeSchema,
  executionDescriptorIdentityInput,
  executionDescriptorRefTuple,
} from "./execution-descriptor-ref";
import { canonicalJson, executionDescriptorId } from "./identity-policy";

export interface ExecutionDescriptorTable {
  readonly kind: "execution.descriptor-table";

  get(ref: ExecutionDescriptorRef): ExecutionDescriptor<unknown, unknown, unknown, unknown>;

  entries(): readonly (readonly [
    ExecutionDescriptorRef,
    ExecutionDescriptor<unknown, unknown, unknown, unknown>,
  ])[];
}

type AsyncOccurrenceOwner =
  | { readonly workflowId: string }
  | { readonly scheduleId: string }
  | { readonly consumerId: string };

export interface AsyncStepDescriptorOccurrence {
  readonly ownerId: string;
  readonly owner: AsyncOccurrenceOwner;
  readonly descriptor: AsyncStepEffectDescriptor<unknown, unknown, unknown, never>;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareTuples(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const order = compareStrings(left[index] ?? "", right[index] ?? "");
    if (order !== 0) return order;
  }
  return 0;
}

function copyRef(ref: ExecutionDescriptorRef): ExecutionDescriptorRef {
  switch (ref.boundary) {
    case "plugin.async-step":
      if ("workflowId" in ref) {
        return Object.freeze({
          kind: "execution.descriptor-ref",
          executionId: ref.executionId,
          ownerId: ref.ownerId,
          boundary: ref.boundary,
          workflowId: ref.workflowId,
          stepId: ref.stepId,
        });
      }
      if ("scheduleId" in ref) {
        return Object.freeze({
          kind: "execution.descriptor-ref",
          executionId: ref.executionId,
          ownerId: ref.ownerId,
          boundary: ref.boundary,
          scheduleId: ref.scheduleId,
          stepId: ref.stepId,
        });
      }
      return Object.freeze({
        kind: "execution.descriptor-ref",
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        consumerId: ref.consumerId,
        stepId: ref.stepId,
      });
    case "plugin.cli-command":
      return Object.freeze({
        kind: "execution.descriptor-ref",
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        commandId: ref.commandId,
      });
    case "plugin.web-surface":
      return Object.freeze({
        kind: "execution.descriptor-ref",
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        surfaceId: ref.surfaceId,
      });
    case "plugin.agent-tool":
      return Object.freeze({
        kind: "execution.descriptor-ref",
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        toolId: ref.toolId,
      });
    case "plugin.desktop-background":
      return Object.freeze({
        kind: "execution.descriptor-ref",
        executionId: ref.executionId,
        ownerId: ref.ownerId,
        boundary: ref.boundary,
        backgroundId: ref.backgroundId,
      });
  }
}

function isHabitatEffectGenerator(
  value: unknown
): value is Generator<HabitatEffect<unknown, unknown, unknown>, unknown, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "next" in value &&
    typeof value.next === "function" &&
    Symbol.iterator in value &&
    typeof value[Symbol.iterator] === "function"
  );
}

function occurrenceIdentityInput(
  occurrence: AsyncStepDescriptorOccurrence
): ExecutionDescriptorIdentityInput {
  if ("workflowId" in occurrence.owner) {
    return {
      boundary: "plugin.async-step",
      ownerId: occurrence.ownerId,
      workflowId: occurrence.owner.workflowId,
      stepId: occurrence.descriptor.id,
    };
  }
  if ("scheduleId" in occurrence.owner) {
    return {
      boundary: "plugin.async-step",
      ownerId: occurrence.ownerId,
      scheduleId: occurrence.owner.scheduleId,
      stepId: occurrence.descriptor.id,
    };
  }
  return {
    boundary: "plugin.async-step",
    ownerId: occurrence.ownerId,
    consumerId: occurrence.owner.consumerId,
    stepId: occurrence.descriptor.id,
  };
}

function refFromIdentity(
  identity: ExecutionDescriptorIdentityInput,
  executionId: string
): ExecutionDescriptorRef {
  if (identity.boundary !== "plugin.async-step") {
    throw new TypeError("Task 4.8 derives only async-step execution occurrences.");
  }
  if ("workflowId" in identity) {
    return Object.freeze({
      kind: "execution.descriptor-ref",
      executionId,
      ...identity,
    });
  }
  if ("scheduleId" in identity) {
    return Object.freeze({
      kind: "execution.descriptor-ref",
      executionId,
      ...identity,
    });
  }
  return Object.freeze({
    kind: "execution.descriptor-ref",
    executionId,
    ...identity,
  });
}

export function deriveAsyncExecutionEntry(
  occurrence: AsyncStepDescriptorOccurrence
): readonly [ExecutionDescriptorRef, ExecutionDescriptor<unknown, unknown, unknown, unknown>] {
  const identity = occurrenceIdentityInput(occurrence);
  const executionId = executionDescriptorId(identity);
  const ref = refFromIdentity(identity, executionId);
  const authored = occurrence.descriptor;
  const descriptor: ExecutionDescriptor<unknown, unknown, unknown, unknown> = Object.freeze({
    kind: "execution.effect",
    executionId,
    boundary: "plugin.async-step",
    policy: authored.policy,
    run(invocation: ProcedureExecutionContext<unknown, unknown>) {
      return Effect.gen(function* () {
        if (
          typeof invocation.context !== "object" ||
          invocation.context === null ||
          Array.isArray(invocation.context)
        ) {
          throw new TypeError("An async step requires its native boundary context.");
        }
        const context = {
          ...invocation.context,
          telemetry: invocation.telemetry,
          execution: invocation.execution,
        };
        const program: unknown = Reflect.apply(authored.effect, undefined, [context]);
        if (isHabitatEffect(program)) return yield* program;
        if (isHabitatEffectGenerator(program)) return yield* Effect.gen(() => program);
        throw new TypeError("An async step must return a HabitatEffect or Effect generator.");
      });
    },
  });

  return Object.freeze([ref, descriptor]);
}

export function createExecutionDescriptorTable(
  input: readonly (readonly [
    ExecutionDescriptorRef,
    ExecutionDescriptor<unknown, unknown, unknown, unknown>,
  ])[]
): ExecutionDescriptorTable {
  const byRef = new Map<string, ExecutionDescriptor<unknown, unknown, unknown, unknown>>();
  const entries = input.map(([inputRef, descriptor]) => {
    assertExecutionDescriptorRefOwnData(inputRef);
    const decoded = ExecutionDescriptorRefRuntimeSchema.decode(inputRef);
    if (!decoded.success) throw new TypeError("Invalid execution descriptor reference.");
    const ref = copyRef(decoded.value);
    const expectedExecutionId = executionDescriptorId(executionDescriptorIdentityInput(ref));
    if (
      ref.executionId !== expectedExecutionId ||
      descriptor.executionId !== expectedExecutionId ||
      descriptor.boundary !== ref.boundary
    ) {
      throw new TypeError("Execution descriptor identity disagrees with its reference.");
    }
    if (!Object.isFrozen(descriptor)) {
      throw new TypeError("Execution descriptor table entries must be frozen cold values.");
    }

    const refKey = canonicalJson(ref);
    if (byRef.has(refKey)) throw new TypeError("Duplicate execution descriptor reference.");
    byRef.set(refKey, descriptor);
    return Object.freeze([ref, descriptor] as const);
  });
  entries.sort((left, right) =>
    compareTuples(executionDescriptorRefTuple(left[0]), executionDescriptorRefTuple(right[0]))
  );
  const snapshot = Object.freeze(entries);

  return Object.freeze({
    kind: "execution.descriptor-table" as const,
    get(ref: ExecutionDescriptorRef): ExecutionDescriptor<unknown, unknown, unknown, unknown> {
      assertExecutionDescriptorRefOwnData(ref);
      const decoded = ExecutionDescriptorRefRuntimeSchema.decode(ref);
      if (!decoded.success) throw new TypeError("Invalid execution descriptor reference.");
      const expectedExecutionId = executionDescriptorId(
        executionDescriptorIdentityInput(decoded.value)
      );
      if (decoded.value.executionId !== expectedExecutionId) {
        throw new TypeError("Execution descriptor reference identity disagrees with its fields.");
      }
      const descriptor = byRef.get(canonicalJson(decoded.value));
      if (descriptor === undefined)
        throw new TypeError("Execution descriptor reference is absent.");
      return descriptor;
    },
    entries: () => snapshot,
  });
}
