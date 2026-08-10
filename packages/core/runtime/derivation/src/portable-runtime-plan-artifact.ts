import { ReadonlyObject, type Static, Type } from "typebox";

import { RuntimeSchema } from "../../schema/src/index";
import {
  assertExecutionDescriptorRefOwnData,
  type ExecutionDescriptorRef,
  ExecutionDescriptorRefSchema,
  executionDescriptorIdentityInput,
  executionDescriptorRefTuple,
} from "./execution-descriptor-ref";
import { executionDescriptorId, portableArtifactId } from "./identity-policy";
import {
  NormalizedAppRoleSchema,
  NormalizedRuntimeLaunchIdentitySchema,
  type NormalizedRuntimeTopology,
  type NormalizedSurfaceRequirement,
  NormalizedSurfaceRequirementSchema,
} from "./normalized-runtime-topology";

export const PortableRuntimePlanArtifactSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("portable.runtime-plan-artifact"),
    artifactId: Type.String({ pattern: "^sha256:[0-9a-f]{64}$" }),
    identity: NormalizedRuntimeLaunchIdentitySchema,
    profileId: Type.String(),
    roles: ReadonlyObject(Type.Array(NormalizedAppRoleSchema)),
    surfaces: ReadonlyObject(Type.Array(NormalizedSurfaceRequirementSchema)),
    executionDescriptorRefs: ReadonlyObject(Type.Array(ExecutionDescriptorRefSchema)),
  }),
  { additionalProperties: false }
);

export type PortableRuntimePlanArtifact = Static<typeof PortableRuntimePlanArtifactSchema>;

const PortableRuntimePlanArtifactRuntimeSchema = RuntimeSchema.fromTypeBox(
  PortableRuntimePlanArtifactSchema
);

function assertExactOwnDataObject(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = []
): asserts value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Portable runtime-plan values must be plain data objects.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Portable runtime-plan values must be plain data objects.");
  }
  const admitted = new Set([...requiredKeys, ...optionalKeys]);
  const actual = Reflect.ownKeys(value);
  if (
    actual.some((key) => typeof key !== "string" || !admitted.has(key)) ||
    requiredKeys.some((key) => !Object.hasOwn(value, key))
  ) {
    throw new TypeError("Portable runtime-plan values require their exact own fields.");
  }
  for (const key of actual) {
    if (typeof key !== "string") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError("Portable runtime-plan values require enumerable own data properties.");
    }
  }
}

function assertDenseDataArray(value: unknown): asserts value is readonly unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError("Portable runtime-plan collections must be ordinary arrays.");
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) {
    throw new TypeError("Portable runtime-plan collections require an own data length.");
  }
  const length = lengthDescriptor.value;
  if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
    throw new TypeError("Portable runtime-plan collections require a finite non-negative length.");
  }
  const actual = Reflect.ownKeys(value);
  if (actual.length !== length + 1 || actual.some((key) => !isDenseArrayOwnKey(key, length))) {
    throw new TypeError("Portable runtime-plan collections must be dense indexed data.");
  }
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError("Portable runtime-plan collections require indexed data properties.");
    }
  }
}

function isDenseArrayOwnKey(key: PropertyKey, length: number): boolean {
  if (key === "length") return true;
  if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length && String(index) === key;
}

function assertPortableArtifactOwnData(value: unknown): void {
  assertExactOwnDataObject(value, [
    "kind",
    "artifactId",
    "identity",
    "profileId",
    "roles",
    "surfaces",
    "executionDescriptorRefs",
  ]);
  const identity = value.identity;
  assertExactOwnDataObject(identity, ["app", "process", "entrypoint", "deployment", "source"]);

  assertDenseDataArray(value.roles);
  assertDenseDataArray(value.surfaces);
  for (const surface of value.surfaces) {
    assertExactOwnDataObject(surface, ["plugin", "role", "surface", "capability"]);
    assertExactOwnDataObject(surface.plugin, ["pluginId"], ["instance"]);
  }

  assertDenseDataArray(value.executionDescriptorRefs);
  for (const ref of value.executionDescriptorRefs) assertExecutionDescriptorRefOwnData(ref);
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

function surfaceTuple(surface: NormalizedSurfaceRequirement): readonly string[] {
  return [
    surface.plugin.pluginId,
    surface.plugin.instance ?? "",
    surface.role,
    surface.surface,
    surface.capability,
  ];
}

function assertCanonical<T>(values: readonly T[], tuple: (value: T) => readonly string[]): void {
  for (let index = 1; index < values.length; index += 1) {
    if (compareTuples(tuple(values[index - 1]!), tuple(values[index]!)) >= 0) {
      throw new TypeError("Portable runtime-plan arrays must be canonical and duplicate-free.");
    }
  }
}

function copyExecutionRef(ref: ExecutionDescriptorRef): ExecutionDescriptorRef {
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

function copySurface(surface: NormalizedSurfaceRequirement): NormalizedSurfaceRequirement {
  return Object.freeze({
    plugin: Object.freeze({
      pluginId: surface.plugin.pluginId,
      ...(surface.plugin.instance === undefined ? {} : { instance: surface.plugin.instance }),
    }),
    role: surface.role,
    surface: surface.surface,
    capability: surface.capability,
  });
}

export function decodePortableRuntimePlanArtifact(value: unknown): PortableRuntimePlanArtifact {
  assertPortableArtifactOwnData(value);
  const decoded = PortableRuntimePlanArtifactRuntimeSchema.decode(value);
  if (!decoded.success) throw new TypeError("Invalid portable runtime-plan artifact.");
  const artifact = decoded.value;

  assertCanonical(artifact.roles, (role) => [role]);
  assertCanonical(artifact.surfaces, surfaceTuple);
  assertCanonical(artifact.executionDescriptorRefs, executionDescriptorRefTuple);

  for (const ref of artifact.executionDescriptorRefs) {
    if (executionDescriptorId(executionDescriptorIdentityInput(ref)) !== ref.executionId) {
      throw new TypeError("Portable execution reference identity is invalid.");
    }
  }

  const expectedId = portableArtifactId({
    kind: artifact.kind,
    identity: artifact.identity,
    profileId: artifact.profileId,
    roles: artifact.roles,
    surfaces: artifact.surfaces,
    executionDescriptorRefs: artifact.executionDescriptorRefs,
  });
  if (expectedId !== artifact.artifactId) {
    throw new TypeError("Portable runtime-plan artifact digest is invalid.");
  }

  return Object.freeze({
    kind: artifact.kind,
    artifactId: artifact.artifactId,
    identity: Object.freeze({
      app: artifact.identity.app,
      process: artifact.identity.process,
      entrypoint: artifact.identity.entrypoint,
      deployment: artifact.identity.deployment,
      source: artifact.identity.source,
    }),
    profileId: artifact.profileId,
    roles: Object.freeze([...artifact.roles]),
    surfaces: Object.freeze(artifact.surfaces.map(copySurface)),
    executionDescriptorRefs: Object.freeze(artifact.executionDescriptorRefs.map(copyExecutionRef)),
  });
}

export function buildPortableRuntimePlanArtifact(
  topology: NormalizedRuntimeTopology,
  executionDescriptorRefs: readonly ExecutionDescriptorRef[]
): PortableRuntimePlanArtifact {
  const identity = Object.freeze({
    app: topology.identity.app,
    process: topology.identity.process,
    entrypoint: topology.identity.entrypoint,
    deployment: topology.identity.deployment,
    source: topology.identity.source,
  });
  const roles = Object.freeze([...topology.roleRequirements]);
  const surfaces = Object.freeze(topology.surfaceRequirements.map(copySurface));
  const refs = Object.freeze(executionDescriptorRefs.map(copyExecutionRef));
  const withoutId = {
    kind: "portable.runtime-plan-artifact" as const,
    identity,
    profileId: topology.profileId,
    roles,
    surfaces,
    executionDescriptorRefs: refs,
  };

  return decodePortableRuntimePlanArtifact({
    kind: withoutId.kind,
    artifactId: portableArtifactId(withoutId),
    identity: withoutId.identity,
    profileId: withoutId.profileId,
    roles: withoutId.roles,
    surfaces: withoutId.surfaces,
    executionDescriptorRefs: withoutId.executionDescriptorRefs,
  });
}
