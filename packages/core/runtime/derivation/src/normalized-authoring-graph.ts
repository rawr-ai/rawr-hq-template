import { ReadonlyObject, type Static, type TUnsafe, Type } from "typebox";

import type { RuntimeConfigSource } from "../../definition/src/index";
import { RuntimeSchema } from "../../schema/src/index";
import { ExecutionDescriptorRefSchema } from "./execution-descriptor-ref";
import {
  NormalizedAppRoleSchema,
  NormalizedPluginIdentitySchema,
  NormalizedResourceRequirementIdentitySchema,
  NormalizedRuntimeTopologySchema,
} from "./normalized-runtime-topology";
import {
  type NormalizedRuntimeConfigRef,
  NormalizedRuntimeConfigRefSchema,
  type NormalizedRuntimeConfigSourceRef,
  ServiceBindingPlanSchema,
} from "./service-binding-plan";
import { SurfaceRuntimePlanSchema } from "./surface-runtime-plan";
import { WebRouteModuleRefSchema } from "./web-route-module-table";
import { WorkflowDispatcherDescriptorSchema } from "./workflow-dispatcher-descriptor";

const closed = { additionalProperties: false } as const;
const nonemptyConfigString = Type.String({ minLength: 1 });
const appRootRelativePosixPath = Type.String({
  minLength: 1,
  pattern: "^(?!/)(?!.*\\\\)(?!\\.{1,2}(?:/|$))(?!.*\\/\\.{1,2}(?:/|$)).+$",
});

export type NormalizedJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly NormalizedJsonValue[]
  | NormalizedJsonObject;
export type NormalizedJsonObject = { readonly [key: string]: NormalizedJsonValue };

const NormalizedJsonValueTypeBoxSchema = Type.Cyclic(
  {
    NormalizedJsonValue: Type.Union([
      Type.Null(),
      Type.Boolean(),
      Type.Number({ minimum: -Number.MAX_VALUE, maximum: Number.MAX_VALUE }),
      Type.String(),
      ReadonlyObject(Type.Array(Type.Ref("NormalizedJsonValue"))),
      ReadonlyObject(Type.Record(Type.String(), Type.Ref("NormalizedJsonValue")), closed),
    ]),
  },
  "NormalizedJsonValue"
);
export const NormalizedJsonValueSchema =
  NormalizedJsonValueTypeBoxSchema as unknown as TUnsafe<NormalizedJsonValue>;

const NormalizedJsonObjectTypeBoxSchema = ReadonlyObject(
  Type.Record(Type.String(), NormalizedJsonValueSchema),
  closed
);
export const NormalizedJsonObjectSchema =
  NormalizedJsonObjectTypeBoxSchema as unknown as TUnsafe<NormalizedJsonObject>;

export const NormalizedRuntimeConfigSourceSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("env"),
      prefix: Type.String(),
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("dotenv"),
      path: appRootRelativePosixPath,
      optional: Type.Boolean(),
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("file"),
      path: appRootRelativePosixPath,
      optional: Type.Boolean(),
    }),
    closed
  ),
  ReadonlyObject(Type.Object({ kind: Type.Literal("memory") }), closed),
  ReadonlyObject(Type.Object({ kind: Type.Literal("test") }), closed),
]);

export const ResourceRequirementOwnerSchema = Type.Union([
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("plugin"),
      pluginOwnerId: Type.String({ pattern: "^plugin-owner:sha256:[0-9a-f]{64}$" }),
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("service"),
      serviceId: Type.String(),
      localName: Type.String(),
    }),
    closed
  ),
  ReadonlyObject(
    Type.Object({
      kind: Type.Literal("provider"),
      providerId: Type.String(),
    }),
    closed
  ),
]);

export const NormalizedAppDefinitionSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.app-definition"),
    appId: Type.String(),
    pluginOwnerIds: ReadonlyObject(
      Type.Array(Type.String({ pattern: "^plugin-owner:sha256:[0-9a-f]{64}$" }))
    ),
  }),
  closed
);

export const NormalizedPluginDefinitionSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.plugin-definition"),
    ownerId: Type.String({ pattern: "^plugin-owner:sha256:[0-9a-f]{64}$" }),
    plugin: NormalizedPluginIdentitySchema,
    role: NormalizedAppRoleSchema,
    surface: Type.String(),
    capability: Type.String(),
    serviceUseIds: ReadonlyObject(
      Type.Array(Type.String({ pattern: "^service-use:sha256:[0-9a-f]{64}$" }))
    ),
    resourceRequirementIds: ReadonlyObject(
      Type.Array(Type.String({ pattern: "^resource-requirement:sha256:[0-9a-f]{64}$" }))
    ),
  }),
  closed
);

export const DerivedRoleSurfaceIndexEntrySchema = ReadonlyObject(
  Type.Object({
    role: NormalizedAppRoleSchema,
    surface: Type.String(),
    surfacePlanIds: ReadonlyObject(
      Type.Array(Type.String({ pattern: "^surface-plan:sha256:[0-9a-f]{64}$" }))
    ),
  }),
  closed
);

export const DerivedRoleSurfaceIndexSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("derived.role-surface-index"),
    entries: ReadonlyObject(Type.Array(DerivedRoleSurfaceIndexEntrySchema)),
  }),
  closed
);

export const NormalizedServiceUseSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.service-use"),
    useId: Type.String({ pattern: "^service-use:sha256:[0-9a-f]{64}$" }),
    pluginOwnerId: Type.String({ pattern: "^plugin-owner:sha256:[0-9a-f]{64}$" }),
    localName: Type.String(),
    serviceId: Type.String(),
    serviceInstance: Type.Optional(Type.String()),
  }),
  closed
);

export const NormalizedServiceDependencySchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.service-dependency"),
    dependencyId: Type.String({ pattern: "^service-dependency:sha256:[0-9a-f]{64}$" }),
    serviceId: Type.String(),
    localName: Type.String(),
    dependencyServiceId: Type.String(),
  }),
  closed
);

export const NormalizedSemanticDependencySchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.semantic-dependency"),
    dependencyId: Type.String({ pattern: "^semantic-dependency:sha256:[0-9a-f]{64}$" }),
    serviceId: Type.String(),
    localName: Type.String(),
    adapterId: Type.String(),
  }),
  closed
);

export const ResourceRequirementSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.resource-requirement"),
    requirementId: Type.String({ pattern: "^resource-requirement:sha256:[0-9a-f]{64}$" }),
    owner: ResourceRequirementOwnerSchema,
    resource: NormalizedResourceRequirementIdentitySchema,
    optional: Type.Boolean(),
    reason: Type.String(),
  }),
  closed
);

export const ProviderSelectionSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.provider-selection"),
    selectionId: Type.String({ pattern: "^provider-selection:sha256:[0-9a-f]{64}$" }),
    providerId: Type.String(),
    resource: NormalizedResourceRequirementIdentitySchema,
    configRef: Type.Optional(NormalizedRuntimeConfigRefSchema),
  }),
  closed
);

export const NormalizedRuntimeProfileSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.runtime-profile"),
    profileId: Type.String(),
    providerSelections: ReadonlyObject(Type.Array(ProviderSelectionSchema)),
    configSources: ReadonlyObject(Type.Array(NormalizedRuntimeConfigSourceSchema)),
    processDefaults: Type.Optional(NormalizedJsonObjectSchema),
    harnesses: ReadonlyObject(Type.Array(Type.String())),
  }),
  closed
);

export const DerivationFindingSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("derivation.finding"),
    code: Type.Literal("provider-selection.optional-missing"),
    requirementId: Type.String({ pattern: "^resource-requirement:sha256:[0-9a-f]{64}$" }),
    resource: NormalizedResourceRequirementIdentitySchema,
  }),
  closed
);

export const NormalizedAuthoringGraphSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("normalized.authoring-graph"),
    topology: NormalizedRuntimeTopologySchema,
    app: NormalizedAppDefinitionSchema,
    plugins: ReadonlyObject(Type.Array(NormalizedPluginDefinitionSchema)),
    roleSurfaceIndex: DerivedRoleSurfaceIndexSchema,
    serviceUses: ReadonlyObject(Type.Array(NormalizedServiceUseSchema)),
    serviceDependencies: ReadonlyObject(Type.Array(NormalizedServiceDependencySchema)),
    semanticDependencies: ReadonlyObject(Type.Array(NormalizedSemanticDependencySchema)),
    resourceRequirements: ReadonlyObject(Type.Array(ResourceRequirementSchema)),
    profile: NormalizedRuntimeProfileSchema,
    serviceBindingPlans: ReadonlyObject(Type.Array(ServiceBindingPlanSchema)),
    surfaceRuntimePlans: ReadonlyObject(Type.Array(SurfaceRuntimePlanSchema)),
    workflowDispatcherDescriptors: ReadonlyObject(Type.Array(WorkflowDispatcherDescriptorSchema)),
    executionDescriptorRefs: ReadonlyObject(Type.Array(ExecutionDescriptorRefSchema)),
    webRouteModuleRefs: ReadonlyObject(Type.Array(WebRouteModuleRefSchema)),
    findings: ReadonlyObject(Type.Array(DerivationFindingSchema)),
  }),
  closed
);

export type NormalizedRuntimeConfigSource = Static<typeof NormalizedRuntimeConfigSourceSchema>;
export type ResourceRequirementOwner = Static<typeof ResourceRequirementOwnerSchema>;
export type DerivedRoleSurfaceIndexEntry = Static<typeof DerivedRoleSurfaceIndexEntrySchema>;
type InferredNormalizedAuthoringGraph = Static<typeof NormalizedAuthoringGraphSchema>;
export type NormalizedAppDefinition = Static<typeof NormalizedAppDefinitionSchema>;
export type NormalizedPluginDefinition = Static<typeof NormalizedPluginDefinitionSchema>;
export type DerivedRoleSurfaceIndex = Static<typeof DerivedRoleSurfaceIndexSchema>;
export type NormalizedServiceUse = Static<typeof NormalizedServiceUseSchema>;
export type NormalizedServiceDependency = Static<typeof NormalizedServiceDependencySchema>;
export type NormalizedSemanticDependency = Static<typeof NormalizedSemanticDependencySchema>;
export type ResourceRequirement = Static<typeof ResourceRequirementSchema>;
export type ProviderSelection = Static<typeof ProviderSelectionSchema>;
type InferredNormalizedRuntimeProfile = Static<typeof NormalizedRuntimeProfileSchema>;
export type NormalizedRuntimeProfile = Omit<InferredNormalizedRuntimeProfile, "processDefaults"> & {
  readonly processDefaults?: NormalizedJsonObject;
};
export type NormalizedAuthoringGraph = Omit<InferredNormalizedAuthoringGraph, "profile"> & {
  readonly profile: NormalizedRuntimeProfile;
};
export type DerivationFinding = Static<typeof DerivationFindingSchema>;

export const NormalizedAuthoringGraphRuntimeSchema = RuntimeSchema.fromTypeBox(
  NormalizedAuthoringGraphSchema
);

function assertAppRootRelativePosixPath(path: string): void {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new TypeError("Config paths must be app-root-relative POSIX paths.");
  }
}

export function normalizeConfigSources(
  sources: readonly RuntimeConfigSource[]
): readonly NormalizedRuntimeConfigSource[] {
  return Object.freeze(
    sources.map((source) => {
      switch (source.kind) {
        case "env":
          return Object.freeze({ kind: "env" as const, prefix: source.prefix ?? "" });
        case "dotenv": {
          const path = source.path ?? ".env";
          assertAppRootRelativePosixPath(path);
          return Object.freeze({
            kind: "dotenv" as const,
            path,
            optional: source.optional ?? false,
          });
        }
        case "file":
          assertAppRootRelativePosixPath(source.path);
          return Object.freeze({
            kind: "file" as const,
            path: source.path,
            optional: source.optional ?? false,
          });
        case "memory":
          return Object.freeze({ kind: "memory" as const });
        case "test":
          return Object.freeze({ kind: "test" as const });
      }
    })
  );
}

export function expandConfigRef(
  key: string,
  sources: readonly NormalizedRuntimeConfigSource[]
): NormalizedRuntimeConfigRef {
  if (key.length === 0) throw new TypeError("Runtime config keys must be nonempty.");

  const expanded: NormalizedRuntimeConfigSourceRef[] = sources.map((source) => {
    switch (source.kind) {
      case "env":
        return Object.freeze({
          kind: "runtime.config.env",
          key,
          name: `${source.prefix}${key}`,
        });
      case "dotenv":
        return Object.freeze({
          kind: "runtime.config.dotenv",
          key,
          path: source.path,
          optional: source.optional,
        });
      case "file":
        return Object.freeze({
          kind: "runtime.config.file",
          key,
          path: source.path,
          optional: source.optional,
        });
      case "memory":
        return Object.freeze({ kind: "runtime.config.memory", key });
      case "test":
        return Object.freeze({ kind: "runtime.config.test", key });
    }
  });

  return Object.freeze({
    kind: "runtime.config-ref",
    key,
    sources: Object.freeze(expanded),
  });
}

function copyJsonValue(value: unknown, active: WeakSet<object>): NormalizedJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Process defaults require finite numbers.");
    return value;
  }
  if (typeof value !== "object") {
    throw new TypeError("Process defaults must contain only plain JSON values.");
  }
  if (active.has(value)) throw new TypeError("Process defaults must be acyclic JSON.");

  active.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new TypeError("Process-default arrays must be ordinary arrays.");
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
      if (lengthDescriptor === undefined || !("value" in lengthDescriptor)) {
        throw new TypeError("Process-default arrays require an own data length.");
      }
      const length = lengthDescriptor.value;
      if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
        throw new TypeError("Process-default arrays require a finite non-negative length.");
      }
      const actualKeys = Reflect.ownKeys(value);
      if (
        actualKeys.length !== length + 1 ||
        actualKeys.some((key) => !isDenseArrayOwnKey(key, length))
      ) {
        throw new TypeError("Process-default arrays must contain only indexed JSON values.");
      }
      const copy: NormalizedJsonValue[] = [];
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
          throw new TypeError("Process-default arrays require enumerable indexed data properties.");
        }
        copy.push(copyJsonValue(descriptor.value, active));
      }
      return Object.freeze(copy);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Process-default objects must be plain records.");
    }
    const entries: [string, NormalizedJsonValue][] = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") throw new TypeError("Process defaults forbid symbol keys.");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
        throw new TypeError("Process defaults require enumerable data properties.");
      }
      entries.push([key, copyJsonValue(descriptor.value, active)]);
    }
    return Object.freeze(Object.fromEntries(entries));
  } finally {
    active.delete(value);
  }
}

function isDenseArrayOwnKey(key: PropertyKey, length: number): boolean {
  if (key === "length") return true;
  if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length && String(index) === key;
}

export function copyProcessDefaults(
  input: Readonly<Record<string, unknown>>
): NormalizedJsonObject {
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Process defaults must be a plain object.");
  }
  const active = new WeakSet<object>();
  active.add(input);
  const entries: [string, NormalizedJsonValue][] = [];
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string") throw new TypeError("Process defaults forbid symbol keys.");
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError("Process defaults require enumerable data properties.");
    }
    entries.push([key, copyJsonValue(descriptor.value, active)]);
  }
  return Object.freeze(Object.fromEntries(entries));
}
