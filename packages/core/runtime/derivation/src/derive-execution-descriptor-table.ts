import type { ToolDescriptor } from "../../definition/src/agent";
import type { CommandDescriptor } from "../../definition/src/cli";
import type { DesktopBackgroundDescriptor } from "../../definition/src/desktop";
import { Effect, type HabitatEffect, isHabitatEffect } from "../../definition/src/effect";
import {
  type AsyncStepEffectDescriptor,
  attachExecutionProjection,
  type ExecutionDescriptor,
} from "../../definition/src/execution";
import type { ProcedureExecutionContext } from "../../definition/src/execution-context";
import { lowerWebEffectDescriptor, type WebEffectDescriptor } from "../../definition/src/web";
import type { RuntimeSchemaResult } from "../../schema/src/runtime-schema";
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

type AuthoredExecutionDescriptor =
  | CommandDescriptor<unknown, unknown, unknown, unknown, never>
  | AsyncStepEffectDescriptor<unknown, unknown, unknown, never>
  | ToolDescriptor<unknown, unknown, unknown, unknown, never>
  | DesktopBackgroundDescriptor<unknown, unknown, unknown, never>;

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
  return Object.freeze({
    kind: "execution.descriptor-ref",
    executionId,
    ...identity,
  });
}

function operationalDescriptor(
  ref: ExecutionDescriptorRef,
  authored: AuthoredExecutionDescriptor
): ExecutionDescriptor<unknown, unknown, unknown, unknown> {
  const descriptor: ExecutionDescriptor<unknown, unknown, unknown, unknown> = {
    kind: "execution.effect",
    executionId: ref.executionId,
    boundary: ref.boundary,
    policy: authored.policy,
    run(invocation: ProcedureExecutionContext<unknown, unknown>) {
      // One cold program is retried per invocation; its input is decoded only on first execution.
      let decoded: RuntimeSchemaResult<unknown> | undefined;
      return Effect.gen(function* () {
        if (
          typeof invocation.context !== "object" ||
          invocation.context === null ||
          Array.isArray(invocation.context)
        ) {
          throw new TypeError("An executable occurrence requires its native boundary context.");
        }
        if (authored.kind === "agent.tool" || authored.kind === "cli.command") {
          decoded ??= authored.inputSchema.decode(invocation.input);
          if (!decoded.success) throw new TypeError("Executable input failed its owning schema.");
        }
        const context = {
          ...invocation.context,
          ...(decoded?.success ? { input: decoded.value } : {}),
          telemetry: invocation.telemetry,
          execution: invocation.execution,
        };
        const program: unknown = Reflect.apply(authored.effect, undefined, [context]);
        if (isHabitatEffect(program)) return yield* program;
        if (isHabitatEffectGenerator(program)) return yield* Effect.gen(() => program);
        throw new TypeError("An executable occurrence must return a HabitatEffect or generator.");
      });
    },
  };
  if (authored.kind === "cli.command") {
    return attachExecutionProjection(descriptor, {
      kind: "cli.command",
      input: authored.inputSchema,
      source: authored.source,
    });
  }
  if (authored.kind === "agent.tool") {
    return attachExecutionProjection(descriptor, {
      kind: "agent.tool",
      input: authored.inputSchema,
      description: authored.description,
    });
  }
  if (authored.kind === "desktop.background") {
    return attachExecutionProjection(descriptor, {
      kind: "desktop.background",
      cadence: authored.cadence,
    });
  }
  return Object.freeze(descriptor);
}

function deriveExecutionEntry(
  identity: ExecutionDescriptorIdentityInput,
  authored: AuthoredExecutionDescriptor
): readonly [ExecutionDescriptorRef, ExecutionDescriptor<unknown, unknown, unknown, unknown>] {
  const ref = refFromIdentity(identity, executionDescriptorId(identity));
  return Object.freeze([ref, operationalDescriptor(ref, authored)]);
}

export function deriveAsyncExecutionEntry(
  occurrence: AsyncStepDescriptorOccurrence
): readonly [ExecutionDescriptorRef, ExecutionDescriptor<unknown, unknown, unknown, unknown>] {
  if (occurrence.descriptor.kind !== "async.step-effect")
    throw new TypeError("Async membership requires an async step descriptor.");
  return deriveExecutionEntry(occurrenceIdentityInput(occurrence), occurrence.descriptor);
}

export function deriveCommandExecutionEntry(
  ownerId: string,
  command: CommandDescriptor<unknown, unknown, unknown, unknown, never>
): readonly [ExecutionDescriptorRef, ExecutionDescriptor<unknown, unknown, unknown, unknown>] {
  if (command.kind !== "cli.command")
    throw new TypeError("Command membership requires a command descriptor.");
  return deriveExecutionEntry(
    { boundary: "plugin.cli-command", ownerId, commandId: command.id },
    command
  );
}

export function deriveToolExecutionEntry(
  ownerId: string,
  tool: ToolDescriptor<unknown, unknown, unknown, unknown, never>
): readonly [ExecutionDescriptorRef, ExecutionDescriptor<unknown, unknown, unknown, unknown>] {
  if (tool.kind !== "agent.tool")
    throw new TypeError("Tool membership requires a tool descriptor.");
  return deriveExecutionEntry({ boundary: "plugin.agent-tool", ownerId, toolId: tool.id }, tool);
}

export function deriveDesktopBackgroundExecutionEntry(
  ownerId: string,
  background: DesktopBackgroundDescriptor<unknown, unknown, unknown, never>
): readonly [ExecutionDescriptorRef, ExecutionDescriptor<unknown, unknown, unknown, unknown>] {
  if (background.kind !== "desktop.background")
    throw new TypeError("Background membership requires a desktop background descriptor.");
  return deriveExecutionEntry(
    { boundary: "plugin.desktop-background", ownerId, backgroundId: background.id },
    background
  );
}

export function deriveWebExecutionEntry(
  ownerId: string,
  route: { readonly id: string; readonly path: string; readonly effect: WebEffectDescriptor }
): readonly [ExecutionDescriptorRef, ExecutionDescriptor<unknown, unknown, unknown, unknown>] {
  const identity: ExecutionDescriptorIdentityInput = {
    boundary: "plugin.web-surface",
    ownerId,
    surfaceId: route.id,
  };
  const ref = refFromIdentity(identity, executionDescriptorId(identity));
  return Object.freeze([
    ref,
    lowerWebEffectDescriptor({
      executionId: ref.executionId,
      path: route.path,
      descriptor: route.effect,
    }),
  ]);
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
