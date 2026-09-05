import { ReadonlyObject, type Static, type TSchema, type TUnsafe, Type } from "typebox";

import type { HabitatDurationInput, HabitatRetryPolicy } from "../../definition/src/effect";
import { ExecutionDescriptorRefSchema } from "../../derivation/src/execution-descriptor-ref";
import {
  NormalizedRuntimeProfileSchema,
  NormalizedSemanticDependencySchema,
  ProviderSelectionSchema,
  ResourceRequirementSchema,
} from "../../derivation/src/normalized-authoring-graph";
import {
  NormalizedAppRoleSchema,
  NormalizedResourceRequirementIdentitySchema,
  NormalizedRuntimeLaunchIdentitySchema,
} from "../../derivation/src/normalized-runtime-topology";
import {
  NormalizedRuntimeConfigRefSchema,
  ServiceBindingPlanSchema,
} from "../../derivation/src/service-binding-plan";
import { SurfaceRuntimePlanSchema } from "../../derivation/src/surface-runtime-plan";
import { WebRouteModuleRefSchema } from "../../derivation/src/web-route-module-table";
import { WorkflowDispatcherDescriptorSchema } from "../../derivation/src/workflow-dispatcher-descriptor";

const closedCompiler = { additionalProperties: false } as const;
const immutable = <T extends TSchema>(schema: T) => ReadonlyObject(Type.Array(schema));

const ResourceRequirementIdSchema = Type.Index(ResourceRequirementSchema, ["requirementId"]);
const ProviderSelectionIdSchema = Type.Index(ProviderSelectionSchema, ["selectionId"]);
const ProviderIdSchema = Type.Index(ProviderSelectionSchema, ["providerId"]);
const ServiceBindingIdSchema = Type.Index(ServiceBindingPlanSchema, ["bindingId"]);
const ExecutionDescriptorIdSchema = Type.Index(ExecutionDescriptorRefSchema, ["executionId"]);

const habitatDurationSuffixes = [" ms", " seconds", " minutes"] as const;
type HabitatRetryTimes = NonNullable<HabitatRetryPolicy["times"]>;

const HabitatRetryTimesSchema = Type.Refine(
  Type.Unknown(),
  (value): value is HabitatRetryTimes => typeof value === "number"
) as unknown as TUnsafe<HabitatRetryTimes>;
const HabitatDurationInputSchema = Type.Refine(
  Type.Unknown(),
  (value): value is HabitatDurationInput => {
    if (typeof value === "number") return true;
    if (typeof value !== "string") return false;
    const suffix = habitatDurationSuffixes.find((candidate) => value.endsWith(candidate));
    if (suffix === undefined) return false;
    const numericPrefix = value.slice(0, -suffix.length);
    return numericPrefix.length > 0 && Number.isFinite(Number(numericPrefix));
  }
) as unknown as TUnsafe<HabitatDurationInput>;
const HabitatRetryPolicySchema = ReadonlyObject(
  Type.Object({
    times: Type.Optional(HabitatRetryTimesSchema),
    backoff: Type.Optional(
      Type.Union([Type.Literal("fixed"), Type.Literal("exponential"), Type.Literal("none")])
    ),
    delay: Type.Optional(HabitatDurationInputSchema),
  }),
  closedCompiler
);
const HabitatTimeoutPolicySchema = ReadonlyObject(
  Type.Object({ duration: HabitatDurationInputSchema }),
  closedCompiler
);
const EffectExecutionPolicySchema = ReadonlyObject(
  Type.Object({
    retry: Type.Optional(HabitatRetryPolicySchema),
    timeout: Type.Optional(HabitatTimeoutPolicySchema),
    interruptible: Type.Optional(Type.Boolean()),
  }),
  closedCompiler
);

export const CompiledResourceBindingSchema = ReadonlyObject(
  Type.Object({
    requirementId: ResourceRequirementIdSchema,
    selectionId: ProviderSelectionIdSchema,
  }),
  closedCompiler
);

export const ProviderDependencyNodeSchema = ReadonlyObject(
  Type.Object({
    selectionId: ProviderSelectionIdSchema,
    providerId: ProviderIdSchema,
    resource: NormalizedResourceRequirementIdentitySchema,
  }),
  closedCompiler
);

export const ProviderDependencyEdgeSchema = ReadonlyObject(
  Type.Object({
    fromSelectionId: ProviderSelectionIdSchema,
    requirementId: ResourceRequirementIdSchema,
    toSelectionId: ProviderSelectionIdSchema,
  }),
  closedCompiler
);

export const ProviderDependencyClosureSchema = ReadonlyObject(
  Type.Object({
    selectionId: ProviderSelectionIdSchema,
    reachableSelectionIds: immutable(ProviderSelectionIdSchema),
  }),
  closedCompiler
);

export const ProviderDependencyGraphSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("provider.dependency-graph"),
    nodes: immutable(ProviderDependencyNodeSchema),
    edges: immutable(ProviderDependencyEdgeSchema),
    closure: immutable(ProviderDependencyClosureSchema),
  }),
  closedCompiler
);

export const CompiledResourcePlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compiled.resource-plan"),
    selectionId: ProviderSelectionIdSchema,
    providerId: ProviderIdSchema,
    resource: NormalizedResourceRequirementIdentitySchema,
    configRef: Type.Optional(NormalizedRuntimeConfigRefSchema),
    requirementIds: immutable(ResourceRequirementIdSchema),
    dependencyRequirementIds: immutable(ResourceRequirementIdSchema),
  }),
  closedCompiler
);

export const CompiledServiceBindingPlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compiled.service-binding-plan"),
    bindingId: ServiceBindingIdSchema,
    role: Type.Index(ServiceBindingPlanSchema, ["role"]),
    serviceId: Type.Index(ServiceBindingPlanSchema, ["serviceId"]),
    serviceInstance: Type.Optional(Type.Index(ServiceBindingPlanSchema, ["serviceInstance"])),
    scopeRef: Type.Optional(Type.Index(ServiceBindingPlanSchema, ["scopeRef"])),
    configRef: Type.Optional(Type.Index(ServiceBindingPlanSchema, ["configRef"])),
    resources: immutable(CompiledResourceBindingSchema),
    serviceDependencies: ReadonlyObject(
      Type.Index(ServiceBindingPlanSchema, ["serviceDependencies"])
    ),
    semanticDependencies: immutable(NormalizedSemanticDependencySchema),
  }),
  closedCompiler
);

export const CompiledSurfacePlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compiled.surface-plan"),
    surfacePlanId: Type.Index(SurfaceRuntimePlanSchema, ["surfacePlanId"]),
    pluginOwnerId: Type.Index(SurfaceRuntimePlanSchema, ["pluginOwnerId"]),
    role: Type.Index(SurfaceRuntimePlanSchema, ["role"]),
    surface: Type.Index(SurfaceRuntimePlanSchema, ["surface"]),
    capability: Type.Index(SurfaceRuntimePlanSchema, ["capability"]),
    serviceBindings: ReadonlyObject(Type.Index(SurfaceRuntimePlanSchema, ["serviceBindings"])),
    resources: immutable(CompiledResourceBindingSchema),
    workflowDispatcherIds: ReadonlyObject(
      Type.Index(SurfaceRuntimePlanSchema, ["workflowDispatcherDescriptorIds"])
    ),
    executionDescriptorRefs: immutable(ExecutionDescriptorRefSchema),
    webRouteModuleRefs: immutable(WebRouteModuleRefSchema),
  }),
  closedCompiler
);

export const CompiledWorkflowDispatcherPlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compiled.workflow-dispatcher-plan"),
    descriptorId: Type.Index(WorkflowDispatcherDescriptorSchema, ["descriptorId"]),
    appId: Type.Index(WorkflowDispatcherDescriptorSchema, ["appId"]),
    pluginOwnerId: Type.Index(WorkflowDispatcherDescriptorSchema, ["pluginOwnerId"]),
    role: Type.Literal("async"),
    surface: Type.Literal("async/workflow"),
    capability: Type.Index(WorkflowDispatcherDescriptorSchema, ["capability"]),
    workflowIds: ReadonlyObject(Type.Index(WorkflowDispatcherDescriptorSchema, ["workflowIds"])),
  }),
  closedCompiler
);

export const CompiledExecutionPlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compiled.execution-plan"),
    ref: ExecutionDescriptorRefSchema,
    policy: EffectExecutionPolicySchema,
  }),
  closedCompiler
);

export const CompiledExecutableBoundaryInputSchema = ReadonlyObject(
  Type.Object({
    executionId: ExecutionDescriptorIdSchema,
    ref: ExecutionDescriptorRefSchema,
  }),
  closedCompiler
);

export const CompiledExecutionRegistryInputSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compiled.execution-registry-input"),
    boundaries: immutable(CompiledExecutableBoundaryInputSchema),
  }),
  closedCompiler
);

export const CompiledHarnessPlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compiled.harness-plan"),
    harnessId: Type.String(),
  }),
  closedCompiler
);

export const BootgraphInputSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("bootgraph.input"),
    nodes: immutable(ProviderDependencyNodeSchema),
    edges: immutable(ProviderDependencyEdgeSchema),
  }),
  closedCompiler
);

export const CompilationObservationSeedSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compilation.observation-seed"),
    identity: NormalizedRuntimeLaunchIdentitySchema,
    profileId: Type.Index(NormalizedRuntimeProfileSchema, ["profileId"]),
    roles: immutable(NormalizedAppRoleSchema),
  }),
  closedCompiler
);

export const CompiledProcessPlanSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("compiled.process-plan"),
    identity: NormalizedRuntimeLaunchIdentitySchema,
    profileId: Type.Index(NormalizedRuntimeProfileSchema, ["profileId"]),
    roles: immutable(NormalizedAppRoleSchema),
    resourceRequirements: immutable(ResourceRequirementSchema),
    configSources: ReadonlyObject(Type.Index(NormalizedRuntimeProfileSchema, ["configSources"])),
    providerSelections: immutable(ProviderSelectionSchema),
    providerDependencyGraph: ProviderDependencyGraphSchema,
    compiledResources: immutable(CompiledResourcePlanSchema),
    serviceBindings: immutable(CompiledServiceBindingPlanSchema),
    surfaces: immutable(CompiledSurfacePlanSchema),
    workflowDispatchers: immutable(CompiledWorkflowDispatcherPlanSchema),
    harnesses: immutable(CompiledHarnessPlanSchema),
    executionPlans: immutable(CompiledExecutionPlanSchema),
    executionRegistryInput: CompiledExecutionRegistryInputSchema,
    bootgraphInput: BootgraphInputSchema,
  }),
  closedCompiler
);

export type CompiledResourceBinding = Static<typeof CompiledResourceBindingSchema>;
export type ProviderDependencyNode = Static<typeof ProviderDependencyNodeSchema>;
export type ProviderDependencyEdge = Static<typeof ProviderDependencyEdgeSchema>;
export type ProviderDependencyClosure = Static<typeof ProviderDependencyClosureSchema>;
export type ProviderDependencyGraph = Static<typeof ProviderDependencyGraphSchema>;
export type CompiledResourcePlan = Static<typeof CompiledResourcePlanSchema>;
export type CompiledServiceBindingPlan = Static<typeof CompiledServiceBindingPlanSchema>;
export type CompiledSurfacePlan = Static<typeof CompiledSurfacePlanSchema>;
export type CompiledWorkflowDispatcherPlan = Static<typeof CompiledWorkflowDispatcherPlanSchema>;
export type CompiledExecutionPlan = Static<typeof CompiledExecutionPlanSchema>;
export type CompiledExecutableBoundaryInput = Static<typeof CompiledExecutableBoundaryInputSchema>;
export type CompiledExecutionRegistryInput = Static<typeof CompiledExecutionRegistryInputSchema>;
export type CompiledHarnessPlan = Static<typeof CompiledHarnessPlanSchema>;
export type BootgraphInput = Static<typeof BootgraphInputSchema>;
export type CompilationObservationSeed = Static<typeof CompilationObservationSeedSchema>;
export type CompiledProcessPlan = Static<typeof CompiledProcessPlanSchema>;
