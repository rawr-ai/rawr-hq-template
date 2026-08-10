import { ReadonlyObject, type Static, Type } from "typebox";

import { RuntimeSchema } from "../../schema/src/index";

const closedExecutionRef = { additionalProperties: false } as const;
const executionDescriptorRefBase = {
  kind: Type.Literal("execution.descriptor-ref"),
  executionId: Type.String({
    pattern: "^execution-descriptor:sha256:[0-9a-f]{64}$",
  }),
  ownerId: Type.String({
    pattern: "^plugin-owner:sha256:[0-9a-f]{64}$",
  }),
} as const;

export const ExecutionDescriptorRefSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      ...executionDescriptorRefBase,
      boundary: Type.Literal("plugin.async-step"),
      workflowId: Type.String(),
      stepId: Type.String(),
    }),
    closedExecutionRef
  ),
  ReadonlyObject(
    Type.Object({
      ...executionDescriptorRefBase,
      boundary: Type.Literal("plugin.async-step"),
      scheduleId: Type.String(),
      stepId: Type.String(),
    }),
    closedExecutionRef
  ),
  ReadonlyObject(
    Type.Object({
      ...executionDescriptorRefBase,
      boundary: Type.Literal("plugin.async-step"),
      consumerId: Type.String(),
      stepId: Type.String(),
    }),
    closedExecutionRef
  ),
  ReadonlyObject(
    Type.Object({
      ...executionDescriptorRefBase,
      boundary: Type.Literal("plugin.cli-command"),
      commandId: Type.String(),
    }),
    closedExecutionRef
  ),
  ReadonlyObject(
    Type.Object({
      ...executionDescriptorRefBase,
      boundary: Type.Literal("plugin.web-surface"),
      surfaceId: Type.String(),
    }),
    closedExecutionRef
  ),
  ReadonlyObject(
    Type.Object({
      ...executionDescriptorRefBase,
      boundary: Type.Literal("plugin.agent-tool"),
      toolId: Type.String(),
    }),
    closedExecutionRef
  ),
  ReadonlyObject(
    Type.Object({
      ...executionDescriptorRefBase,
      boundary: Type.Literal("plugin.desktop-background"),
      backgroundId: Type.String(),
    }),
    closedExecutionRef
  ),
]);

export type ExecutionDescriptorRef = Static<typeof ExecutionDescriptorRefSchema>;

export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ExecutionDescriptorIdentityInput = DistributiveOmit<
  ExecutionDescriptorRef,
  "kind" | "executionId"
>;

export const ExecutionDescriptorRefRuntimeSchema = RuntimeSchema.fromTypeBox(
  ExecutionDescriptorRefSchema
);

function ownDataProperty(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
    throw new TypeError("Execution descriptor references require enumerable own data properties.");
  }
  return descriptor.value;
}

function assertExactOwnDataKeys(value: unknown, expectedKeys: readonly string[]): object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Execution descriptor references must be plain data objects.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Execution descriptor references must be plain data objects.");
  }
  const expected = new Set(expectedKeys);
  const actual = Reflect.ownKeys(value);
  if (
    actual.length !== expected.size ||
    actual.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    throw new TypeError("Execution descriptor references require their exact own fields.");
  }
  for (const key of expectedKeys) ownDataProperty(value, key);
  return value;
}

export function assertExecutionDescriptorRefOwnData(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Execution descriptor references must be plain data objects.");
  }
  const boundary = ownDataProperty(value, "boundary");
  const base = ["kind", "executionId", "ownerId", "boundary"] as const;

  switch (boundary) {
    case "plugin.async-step": {
      const ownerFields = ["workflowId", "scheduleId", "consumerId"].filter((key) =>
        Object.hasOwn(value, key)
      );
      if (ownerFields.length !== 1) {
        throw new TypeError("Async execution references require exactly one parent field.");
      }
      assertExactOwnDataKeys(value, [...base, ownerFields[0]!, "stepId"]);
      return;
    }
    case "plugin.cli-command":
      assertExactOwnDataKeys(value, [...base, "commandId"]);
      return;
    case "plugin.web-surface":
      assertExactOwnDataKeys(value, [...base, "surfaceId"]);
      return;
    case "plugin.agent-tool":
      assertExactOwnDataKeys(value, [...base, "toolId"]);
      return;
    case "plugin.desktop-background":
      assertExactOwnDataKeys(value, [...base, "backgroundId"]);
      return;
    default:
      throw new TypeError("Execution descriptor references require a known own boundary.");
  }
}

export function executionDescriptorRefTuple(ref: ExecutionDescriptorRef): readonly string[] {
  switch (ref.boundary) {
    case "plugin.async-step":
      return [
        ref.boundary,
        ref.ownerId,
        "workflowId" in ref ? ref.workflowId : "",
        "scheduleId" in ref ? ref.scheduleId : "",
        "consumerId" in ref ? ref.consumerId : "",
        ref.stepId,
      ];
    case "plugin.cli-command":
      return [ref.boundary, ref.ownerId, ref.commandId];
    case "plugin.web-surface":
      return [ref.boundary, ref.ownerId, ref.surfaceId];
    case "plugin.agent-tool":
      return [ref.boundary, ref.ownerId, ref.toolId];
    case "plugin.desktop-background":
      return [ref.boundary, ref.ownerId, ref.backgroundId];
  }
}

export function executionDescriptorIdentityInput(
  ref: ExecutionDescriptorRef
): ExecutionDescriptorIdentityInput {
  switch (ref.boundary) {
    case "plugin.async-step":
      if ("workflowId" in ref) {
        return {
          boundary: ref.boundary,
          ownerId: ref.ownerId,
          workflowId: ref.workflowId,
          stepId: ref.stepId,
        };
      }
      if ("scheduleId" in ref) {
        return {
          boundary: ref.boundary,
          ownerId: ref.ownerId,
          scheduleId: ref.scheduleId,
          stepId: ref.stepId,
        };
      }
      return {
        boundary: ref.boundary,
        ownerId: ref.ownerId,
        consumerId: ref.consumerId,
        stepId: ref.stepId,
      };
    case "plugin.cli-command":
      return { boundary: ref.boundary, ownerId: ref.ownerId, commandId: ref.commandId };
    case "plugin.web-surface":
      return { boundary: ref.boundary, ownerId: ref.ownerId, surfaceId: ref.surfaceId };
    case "plugin.agent-tool":
      return { boundary: ref.boundary, ownerId: ref.ownerId, toolId: ref.toolId };
    case "plugin.desktop-background":
      return { boundary: ref.boundary, ownerId: ref.ownerId, backgroundId: ref.backgroundId };
  }
}
