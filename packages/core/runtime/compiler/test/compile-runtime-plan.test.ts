import { describe, expect, test } from "bun:test";
import { type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";

import {
  type ProviderSelection as AuthoredProviderSelection,
  defineApp,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineService,
  defineWebAppPlugin,
  defineWorkflow,
  Effect,
  type Entrypoint,
  providerSelection,
  type RuntimeProvider,
  requireResource,
  resourceDep,
  runtimeLaunchIdentity,
  semanticDep,
  serviceDep,
  useService,
} from "../../definition/src/index";
import type { ExecutionDescriptorRef } from "../../derivation/src/execution-descriptor-ref";
import {
  executionDescriptorId,
  pluginOwnerId,
  providerSelectionId,
  resourceRequirementId,
  semanticDependencyId,
  serviceBindingId,
  serviceDependencyId,
  serviceUseId,
  surfacePlanId,
  workflowDispatcherId,
} from "../../derivation/src/identity-policy";
import { deriveRuntimeArtifacts } from "../../derivation/src/index";
import type { NormalizedAuthoringGraph } from "../../derivation/src/normalized-authoring-graph";
import * as runtimeCompiler from "../src/index";
import {
  type BootgraphInput,
  BootgraphInputSchema,
  type CompilationObservationSeed,
  CompilationObservationSeedSchema,
  type CompiledExecutableBoundaryInput,
  CompiledExecutableBoundaryInputSchema,
  type CompiledExecutionPlan,
  CompiledExecutionPlanSchema,
  type CompiledExecutionRegistryInput,
  CompiledExecutionRegistryInputSchema,
  type CompiledHarnessPlan,
  CompiledHarnessPlanSchema,
  type CompiledProcessPlan,
  CompiledProcessPlanSchema,
  type CompiledResourceBinding,
  CompiledResourceBindingSchema,
  type CompiledResourcePlan,
  CompiledResourcePlanSchema,
  type CompiledServiceBindingPlan,
  CompiledServiceBindingPlanSchema,
  type CompiledSurfacePlan,
  CompiledSurfacePlanSchema,
  type CompiledWorkflowDispatcherPlan,
  CompiledWorkflowDispatcherPlanSchema,
  compileRuntimePlan,
  type ProviderDependencyClosure,
  ProviderDependencyClosureSchema,
  type ProviderDependencyEdge,
  ProviderDependencyEdgeSchema,
  type ProviderDependencyGraph,
  ProviderDependencyGraphSchema,
  type ProviderDependencyNode,
  ProviderDependencyNodeSchema,
  type RuntimeCompilationInput,
  type RuntimeCompilationResult,
} from "../src/index";

type ProviderCycle = "self" | "transitive";
type AssertNever<T extends never> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsNever<T> = [T] extends [never] ? true : false;
type IsExact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;
type IsExactNonNever<Left, Right> =
  IsNever<Left> extends true ? false : IsNever<Right> extends true ? false : IsExact<Left, Right>;
type DeepReadonly<Value> = Value extends readonly unknown[]
  ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value;
type IsDeepReadonlyNonAnyNonNever<Value> =
  IsAny<Value> extends true
    ? false
    : IsNever<Value> extends true
      ? false
      : IsExact<Value, DeepReadonly<Value>>;

const EXACT_COMPILER_DTO_TYPE_ORACLES = {
  bootgraphInput: true,
  compilationObservationSeed: true,
  compiledExecutableBoundaryInput: true,
  compiledExecutionPlan: true,
  compiledExecutionRegistryInput: true,
  compiledHarnessPlan: true,
  compiledProcessPlan: true,
  compiledResourceBinding: true,
  compiledResourcePlan: true,
  compiledServiceBindingPlan: true,
  compiledSurfacePlan: true,
  compiledWorkflowDispatcherPlan: true,
  providerDependencyClosure: true,
  providerDependencyEdge: true,
  providerDependencyGraph: true,
  providerDependencyNode: true,
} satisfies {
  readonly bootgraphInput: IsExactNonNever<BootgraphInput, Static<typeof BootgraphInputSchema>>;
  readonly compilationObservationSeed: IsExactNonNever<
    CompilationObservationSeed,
    Static<typeof CompilationObservationSeedSchema>
  >;
  readonly compiledExecutableBoundaryInput: IsExactNonNever<
    CompiledExecutableBoundaryInput,
    Static<typeof CompiledExecutableBoundaryInputSchema>
  >;
  readonly compiledExecutionPlan: IsExactNonNever<
    CompiledExecutionPlan,
    Static<typeof CompiledExecutionPlanSchema>
  >;
  readonly compiledExecutionRegistryInput: IsExactNonNever<
    CompiledExecutionRegistryInput,
    Static<typeof CompiledExecutionRegistryInputSchema>
  >;
  readonly compiledHarnessPlan: IsExactNonNever<
    CompiledHarnessPlan,
    Static<typeof CompiledHarnessPlanSchema>
  >;
  readonly compiledProcessPlan: IsExactNonNever<
    CompiledProcessPlan,
    Static<typeof CompiledProcessPlanSchema>
  >;
  readonly compiledResourceBinding: IsExactNonNever<
    CompiledResourceBinding,
    Static<typeof CompiledResourceBindingSchema>
  >;
  readonly compiledResourcePlan: IsExactNonNever<
    CompiledResourcePlan,
    Static<typeof CompiledResourcePlanSchema>
  >;
  readonly compiledServiceBindingPlan: IsExactNonNever<
    CompiledServiceBindingPlan,
    Static<typeof CompiledServiceBindingPlanSchema>
  >;
  readonly compiledSurfacePlan: IsExactNonNever<
    CompiledSurfacePlan,
    Static<typeof CompiledSurfacePlanSchema>
  >;
  readonly compiledWorkflowDispatcherPlan: IsExactNonNever<
    CompiledWorkflowDispatcherPlan,
    Static<typeof CompiledWorkflowDispatcherPlanSchema>
  >;
  readonly providerDependencyClosure: IsExactNonNever<
    ProviderDependencyClosure,
    Static<typeof ProviderDependencyClosureSchema>
  >;
  readonly providerDependencyEdge: IsExactNonNever<
    ProviderDependencyEdge,
    Static<typeof ProviderDependencyEdgeSchema>
  >;
  readonly providerDependencyGraph: IsExactNonNever<
    ProviderDependencyGraph,
    Static<typeof ProviderDependencyGraphSchema>
  >;
  readonly providerDependencyNode: IsExactNonNever<
    ProviderDependencyNode,
    Static<typeof ProviderDependencyNodeSchema>
  >;
};

const DEEP_READONLY_COMPILER_DTO_TYPE_ORACLES = {
  bootgraphInput: true,
  compilationObservationSeed: true,
  compiledExecutableBoundaryInput: true,
  compiledExecutionPlan: true,
  compiledExecutionRegistryInput: true,
  compiledHarnessPlan: true,
  compiledProcessPlan: true,
  compiledResourceBinding: true,
  compiledResourcePlan: true,
  compiledServiceBindingPlan: true,
  compiledSurfacePlan: true,
  compiledWorkflowDispatcherPlan: true,
  providerDependencyClosure: true,
  providerDependencyEdge: true,
  providerDependencyGraph: true,
  providerDependencyNode: true,
} satisfies {
  readonly bootgraphInput: IsDeepReadonlyNonAnyNonNever<BootgraphInput>;
  readonly compilationObservationSeed: IsDeepReadonlyNonAnyNonNever<CompilationObservationSeed>;
  readonly compiledExecutableBoundaryInput: IsDeepReadonlyNonAnyNonNever<CompiledExecutableBoundaryInput>;
  readonly compiledExecutionPlan: IsDeepReadonlyNonAnyNonNever<CompiledExecutionPlan>;
  readonly compiledExecutionRegistryInput: IsDeepReadonlyNonAnyNonNever<CompiledExecutionRegistryInput>;
  readonly compiledHarnessPlan: IsDeepReadonlyNonAnyNonNever<CompiledHarnessPlan>;
  readonly compiledProcessPlan: IsDeepReadonlyNonAnyNonNever<CompiledProcessPlan>;
  readonly compiledResourceBinding: IsDeepReadonlyNonAnyNonNever<CompiledResourceBinding>;
  readonly compiledResourcePlan: IsDeepReadonlyNonAnyNonNever<CompiledResourcePlan>;
  readonly compiledServiceBindingPlan: IsDeepReadonlyNonAnyNonNever<CompiledServiceBindingPlan>;
  readonly compiledSurfacePlan: IsDeepReadonlyNonAnyNonNever<CompiledSurfacePlan>;
  readonly compiledWorkflowDispatcherPlan: IsDeepReadonlyNonAnyNonNever<CompiledWorkflowDispatcherPlan>;
  readonly providerDependencyClosure: IsDeepReadonlyNonAnyNonNever<ProviderDependencyClosure>;
  readonly providerDependencyEdge: IsDeepReadonlyNonAnyNonNever<ProviderDependencyEdge>;
  readonly providerDependencyGraph: IsDeepReadonlyNonAnyNonNever<ProviderDependencyGraph>;
  readonly providerDependencyNode: IsDeepReadonlyNonAnyNonNever<ProviderDependencyNode>;
};

type ObservationPortInputKey = AssertNever<
  Extract<"observationPort", keyof RuntimeCompilationInput>
>;
type ForbiddenCompilationResultKey = AssertNever<
  Extract<"findings" | "diagnostics", keyof RuntimeCompilationResult>
>;
type ForbiddenCompiledPlanKey = AssertNever<
  Extract<"findings" | "diagnostics" | "observationSeed", keyof CompiledProcessPlan>
>;

// @ts-expect-error The compiler intentionally exposes no finding type.
type CompilationFindingMustRemainAbsent = import("../src/index").CompilationFinding;

const ZERO_PROCESS_CLOSURE_CALLS = {
  definitionCalls: 0,
  effectCalls: 0,
  loaderCalls: 0,
  observationContributionCalls: 0,
  projectCalls: 0,
  schemaCalls: 0,
} as const;

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const compareStringTuples = (left: readonly string[], right: readonly string[]): number => {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const order = compareStrings(left[index] ?? "", right[index] ?? "");
    if (order !== 0) return order;
  }
  return 0;
};

function executionRefOrderTuple(ref: ExecutionDescriptorRef): readonly string[] {
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

function sortByTuple<T>(
  values: readonly T[],
  tuple: (value: T) => readonly string[]
): readonly T[] {
  return [...values].sort((left, right) => compareStringTuples(tuple(left), tuple(right)));
}

function expectCanonicalTupleOrder<T>(
  values: readonly T[],
  tuple: (value: T) => readonly string[]
): void {
  const expected = sortByTuple(values, tuple);
  expect(values).toEqual(expected);
  for (let index = 1; index < values.length; index += 1) {
    expect(compareStringTuples(tuple(values[index - 1]!), tuple(values[index]!))).toBeLessThan(0);
  }
}

function expectAuthoredOrder<T>(
  actual: readonly T[],
  expected: readonly T[],
  identity: (value: T) => readonly string[]
): void {
  expect(actual.map(identity)).toEqual(expected.map(identity));
}

function collectObjectReferences(value: unknown, references = new Set<object>()): Set<object> {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) {
    return references;
  }
  if (references.has(value)) return references;
  references.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor !== undefined && "value" in descriptor) {
      collectObjectReferences(descriptor.value, references);
    }
  }
  return references;
}

interface CompleteInputPrimitiveSnapshot {
  readonly kind: "primitive";
  readonly value: unknown;
}

interface CompleteInputDataDescriptorSnapshot {
  readonly kind: "data";
  readonly key: string | symbol;
  readonly configurable: boolean | undefined;
  readonly enumerable: boolean | undefined;
  readonly writable: boolean | undefined;
  readonly value: CompleteInputValueSnapshot;
}

interface CompleteInputAccessorDescriptorSnapshot {
  readonly kind: "accessor";
  readonly key: string | symbol;
  readonly configurable: boolean | undefined;
  readonly enumerable: boolean | undefined;
  readonly get: CompleteInputValueSnapshot;
  readonly set: CompleteInputValueSnapshot;
}

type CompleteInputDescriptorSnapshot =
  | CompleteInputDataDescriptorSnapshot
  | CompleteInputAccessorDescriptorSnapshot;

interface CompleteInputReferenceSnapshot {
  readonly kind: "reference";
  readonly original: object;
  readonly prototype: object | null;
  readonly extensible: boolean;
  readonly keys: (string | symbol)[];
  readonly descriptors: CompleteInputDescriptorSnapshot[];
}

type CompleteInputValueSnapshot = CompleteInputPrimitiveSnapshot | CompleteInputReferenceSnapshot;

function isObjectReference(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function snapshotCompleteInput(
  value: unknown,
  snapshots = new Map<object, CompleteInputReferenceSnapshot>()
): CompleteInputValueSnapshot {
  if (!isObjectReference(value)) return { kind: "primitive", value };

  const prior = snapshots.get(value);
  if (prior !== undefined) return prior;

  const snapshot: CompleteInputReferenceSnapshot = {
    kind: "reference",
    original: value,
    prototype: Object.getPrototypeOf(value),
    extensible: Object.isExtensible(value),
    keys: [],
    descriptors: [],
  };
  snapshots.set(value, snapshot);

  for (const key of Reflect.ownKeys(value)) {
    snapshot.keys.push(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if ("value" in descriptor) {
      snapshot.descriptors.push({
        kind: "data",
        key,
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        writable: descriptor.writable,
        value: snapshotCompleteInput(descriptor.value, snapshots),
      });
    } else {
      snapshot.descriptors.push({
        kind: "accessor",
        key,
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get: snapshotCompleteInput(descriptor.get, snapshots),
        set: snapshotCompleteInput(descriptor.set, snapshots),
      });
    }
  }

  return snapshot;
}

function expectCompleteInputUnchanged(
  actual: unknown,
  snapshot: CompleteInputValueSnapshot,
  compared = new Set<CompleteInputReferenceSnapshot>()
): void {
  if (snapshot.kind === "primitive") {
    expect(actual).toBe(snapshot.value);
    return;
  }

  expect(actual).toBe(snapshot.original);
  if (!isObjectReference(actual) || compared.has(snapshot)) return;
  compared.add(snapshot);

  expect(Object.getPrototypeOf(actual)).toBe(snapshot.prototype);
  expect(Object.isExtensible(actual)).toBe(snapshot.extensible);
  const actualKeys = Reflect.ownKeys(actual);
  expect(actualKeys).toHaveLength(snapshot.keys.length);
  for (let index = 0; index < snapshot.keys.length; index += 1) {
    const key = snapshot.keys[index]!;
    expect(actualKeys[index]).toBe(key);
    const actualDescriptor = Object.getOwnPropertyDescriptor(actual, key);
    const descriptorSnapshot = snapshot.descriptors[index]!;
    expect(descriptorSnapshot.key).toBe(key);
    expect(actualDescriptor).toBeDefined();
    if (actualDescriptor === undefined) continue;

    expect({
      configurable: actualDescriptor.configurable,
      enumerable: actualDescriptor.enumerable,
    }).toEqual({
      configurable: descriptorSnapshot.configurable,
      enumerable: descriptorSnapshot.enumerable,
    });
    if (descriptorSnapshot.kind === "data") {
      expect("value" in actualDescriptor).toBe(true);
      if (!("value" in actualDescriptor)) continue;
      expect(actualDescriptor.writable).toBe(descriptorSnapshot.writable);
      expectCompleteInputUnchanged(actualDescriptor.value, descriptorSnapshot.value, compared);
    } else {
      expect("value" in actualDescriptor).toBe(false);
      if ("value" in actualDescriptor) continue;
      expectCompleteInputUnchanged(actualDescriptor.get, descriptorSnapshot.get, compared);
      expectCompleteInputUnchanged(actualDescriptor.set, descriptorSnapshot.set, compared);
    }
  }
}

function expectRecursivelyFrozenWithoutAliases(value: unknown, seen = new Set<object>()): void {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return;
  expect(seen.has(value)).toBe(false);
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) expectRecursivelyFrozenWithoutAliases(child, seen);
}

function expectStructurallyEqualButFresh(left: unknown, right: unknown): void {
  expect(right).toEqual(left);
  if (
    (typeof left !== "object" && typeof left !== "function") ||
    left === null ||
    (typeof right !== "object" && typeof right !== "function") ||
    right === null
  ) {
    return;
  }
  expect(right).not.toBe(left);
  const leftEntries = Object.entries(left);
  const rightRecord = right as Record<string, unknown>;
  expect(Object.keys(rightRecord)).toEqual(leftEntries.map(([key]) => key));
  for (const [key, leftValue] of leftEntries) {
    expectStructurallyEqualButFresh(leftValue, rightRecord[key]);
  }
}

interface ClosedSchemaCase {
  readonly name: string;
  readonly schema: TSchema;
  readonly value: object;
  readonly requiredKey: string;
}

function closedSchemaCase<Schema extends TSchema>(
  name: string,
  schema: Schema,
  value: Static<Schema>,
  requiredKey: Extract<keyof Static<Schema>, string>
): ClosedSchemaCase {
  return { name, schema, value: value as object, requiredKey };
}

function withoutOwnKey(value: object, key: string): object {
  const copy = { ...value } as Record<string, unknown>;
  expect(Reflect.deleteProperty(copy, key)).toBe(true);
  return copy;
}

function expectCompiledPlanOrder(plan: CompiledProcessPlan): void {
  expectCanonicalTupleOrder(plan.roles, (role) => [role]);
  expectCanonicalTupleOrder(plan.resourceRequirements, (requirement) => [
    requirement.requirementId,
  ]);
  expectCanonicalTupleOrder(plan.providerSelections, (selection) => [selection.selectionId]);
  expectCanonicalTupleOrder(plan.providerDependencyGraph.nodes, (node) => [node.selectionId]);
  expectCanonicalTupleOrder(plan.providerDependencyGraph.edges, (edge) => [
    edge.fromSelectionId,
    edge.requirementId,
    edge.toSelectionId,
  ]);
  expectCanonicalTupleOrder(plan.providerDependencyGraph.closure, (closure) => [
    closure.selectionId,
  ]);
  for (const closure of plan.providerDependencyGraph.closure) {
    expectCanonicalTupleOrder(closure.reachableSelectionIds, (selectionId) => [selectionId]);
  }
  expectCanonicalTupleOrder(plan.compiledResources, (resource) => [resource.selectionId]);
  for (const resource of plan.compiledResources) {
    expectCanonicalTupleOrder(resource.requirementIds, (requirementId) => [requirementId]);
    expectCanonicalTupleOrder(resource.dependencyRequirementIds, (requirementId) => [
      requirementId,
    ]);
  }
  expectCanonicalTupleOrder(plan.serviceBindings, (binding) => [binding.bindingId]);
  for (const binding of plan.serviceBindings) {
    expectCanonicalTupleOrder(binding.resources, (resource) => [
      resource.requirementId,
      resource.selectionId,
    ]);
    expectCanonicalTupleOrder(binding.serviceBindingIds, (bindingId) => [bindingId]);
    expectCanonicalTupleOrder(binding.semanticDependencyIds, (dependencyId) => [dependencyId]);
  }
  expectCanonicalTupleOrder(plan.surfaces, (surface) => [surface.surfacePlanId]);
  for (const surface of plan.surfaces) {
    expectCanonicalTupleOrder(surface.serviceBindingIds, (bindingId) => [bindingId]);
    expectCanonicalTupleOrder(surface.resources, (resource) => [
      resource.requirementId,
      resource.selectionId,
    ]);
    expectCanonicalTupleOrder(surface.workflowDispatcherIds, (descriptorId) => [descriptorId]);
    expectCanonicalTupleOrder(surface.executionDescriptorRefs, executionRefOrderTuple);
    expectCanonicalTupleOrder(surface.webRouteModuleRefs, (ref) => [
      ref.ownerId,
      ref.routeId,
      ref.path,
    ]);
  }
  expectCanonicalTupleOrder(plan.workflowDispatchers, (dispatcher) => [dispatcher.descriptorId]);
  for (const dispatcher of plan.workflowDispatchers) {
    expectCanonicalTupleOrder(dispatcher.workflowIds, (workflowId) => [workflowId]);
  }
  expectCanonicalTupleOrder(plan.executionPlans, ({ ref }) => executionRefOrderTuple(ref));
  expectCanonicalTupleOrder(plan.executionRegistryInput.boundaries, ({ ref }) =>
    executionRefOrderTuple(ref)
  );
  for (const boundary of plan.executionRegistryInput.boundaries) {
    expect(boundary.executionId).toBe(boundary.ref.executionId);
  }
  expectCanonicalTupleOrder(plan.harnesses, (harness) => [harness.harnessId]);
  expectCanonicalTupleOrder(plan.bootgraphInput.nodes, (node) => [node.selectionId]);
  expectCanonicalTupleOrder(plan.bootgraphInput.edges, (edge) => [
    edge.fromSelectionId,
    edge.requirementId,
    edge.toSelectionId,
  ]);
}

function sortFindings(
  findings: NormalizedAuthoringGraph["findings"]
): NormalizedAuthoringGraph["findings"] {
  return [...findings].sort((left, right) =>
    compareStrings(
      [
        left.code,
        left.requirementId,
        left.resource.resourceId,
        left.resource.lifetime,
        left.resource.role ?? "",
        left.resource.instance ?? "",
      ].join("\u0000"),
      [
        right.code,
        right.requirementId,
        right.resource.resourceId,
        right.resource.lifetime,
        right.resource.role ?? "",
        right.resource.instance ?? "",
      ].join("\u0000")
    )
  );
}

function makeFixture(): RuntimeCompilationInput {
  const app = defineApp({ id: "fixture", plugins: [] as const });
  const profile = defineRuntimeProfile({ id: "test", providers: [] as const });
  const processes = defineProcessCatalog({
    server: { id: "server", roles: ["server"] as const },
  });
  const entrypoint = defineEntrypoint({
    id: "fixture.server",
    app,
    profile,
    process: processes.server,
    identity: runtimeLaunchIdentity({
      app: app.id,
      process: processes.server.id,
      entrypoint: "fixture.server",
      deployment: "test",
      source: "compiler-baseline",
    }),
  });
  const graph: NormalizedAuthoringGraph = {
    kind: "normalized.authoring-graph",
    topology: {
      identity: entrypoint.identity,
      profileId: profile.id,
      pluginIdentities: [],
      roleRequirements: ["server"],
      surfaceRequirements: [],
      resourceRequirementIdentities: [],
      edges: [],
    },
    app: { kind: "normalized.app-definition", appId: app.id, pluginOwnerIds: [] },
    plugins: [],
    roleSurfaceIndex: { kind: "derived.role-surface-index", entries: [] },
    serviceUses: [],
    serviceDependencies: [],
    semanticDependencies: [],
    resourceRequirements: [],
    profile: {
      kind: "normalized.runtime-profile",
      profileId: profile.id,
      providerSelections: [],
      configSources: [],
      harnesses: [],
    },
    serviceBindingPlans: [],
    surfaceRuntimePlans: [],
    workflowDispatcherDescriptors: [],
    executionDescriptorRefs: [],
    webRouteModuleRefs: [],
    findings: [],
  };
  return { entrypoint, graph };
}

function makeProcessClosureFixture(
  options: {
    readonly authoredOrder?: "mixed" | "reverse";
    readonly configured?: boolean;
    readonly processHarness?: string;
  } = {}
) {
  let definitionCalls = 0;
  let effectCalls = 0;
  let loaderCalls = 0;
  let observationContributionCalls = 0;
  let projectCalls = 0;
  let schemaCalls = 0;

  const observationContributor = {
    toObservationRecord: (): never => {
      observationContributionCalls += 1;
      throw new Error("The compiler invoked a resource observation contributor.");
    },
  };
  const definitionCallback = (..._arguments: unknown[]): never => {
    definitionCalls += 1;
    throw new Error("The compiler invoked a cold service definition callback.");
  };
  const processClosureInputSchema = {
    kind: "runtime.schema" as const,
    serializable: { kind: "fixture.process-closure-schema" },
    decode: (_input: unknown): never => {
      schemaCalls += 1;
      throw new Error("The compiler decoded a cold workflow schema.");
    },
    validate: (_input: unknown): never => {
      schemaCalls += 1;
      throw new Error("The compiler validated a cold workflow schema.");
    },
    toRedactedShape: (): never => {
      schemaCalls += 1;
      throw new Error("The compiler projected a cold workflow schema.");
    },
  };
  const authoredConfigSources = [
    { kind: "test" as const },
    { kind: "env" as const, prefix: "FIXTURE_" },
    { kind: "file" as const, path: "runtime/compiler.json", optional: true },
  ] as const;
  const normalizedConfigSources = [
    { kind: "test" as const },
    { kind: "env" as const, prefix: "FIXTURE_" },
    { kind: "file" as const, path: "runtime/compiler.json", optional: true },
  ] as const;
  const providerConfigKey = "fixture.selected.plugin-provider";
  const providerConfigRef = {
    kind: "runtime.config-ref" as const,
    key: providerConfigKey,
    sources: [
      { kind: "runtime.config.test" as const, key: providerConfigKey },
      {
        kind: "runtime.config.env" as const,
        key: providerConfigKey,
        name: `FIXTURE_${providerConfigKey}`,
      },
      {
        kind: "runtime.config.file" as const,
        key: providerConfigKey,
        path: "runtime/compiler.json",
        optional: true,
      },
    ],
  };

  const selectedPluginResource = defineRuntimeResource<string, unknown>({
    id: "fixture.selected.plugin-resource",
    title: "Selected plugin resource",
    purpose: "Selected direct plugin resource",
    observationContributor,
  });
  const selectedServiceResource = defineRuntimeResource<string, unknown>({
    id: "fixture.selected.service-resource",
    title: "Selected service resource",
    purpose: "Selected transitive service resource",
    observationContributor,
  });
  const unrelatedServerResource = defineRuntimeResource<string, unknown>({
    id: "fixture.unrelated.server-resource",
    title: "Unrelated server resource",
    purpose: "Unselected server-only resource",
    observationContributor,
  });

  const selectedLeafBase = defineService({
    id: "fixture.selected.leaf-service",
    deps: { storage: resourceDep(selectedServiceResource) },
  });
  const selectedLeaf = {
    ...selectedLeafBase,
    deps: { ...selectedLeafBase.deps },
    createImplementer: definitionCallback as typeof selectedLeafBase.createImplementer,
  };
  const selectedRootBase = defineService({
    id: "fixture.selected.root-service",
    deps: {
      leaf: serviceDep(selectedLeaf),
      semantics: semanticDep("fixture.selected.semantic-adapter"),
    },
  });
  const selectedRoot = {
    ...selectedRootBase,
    deps: { ...selectedRootBase.deps },
    createImplementer: definitionCallback as typeof selectedRootBase.createImplementer,
  };

  const unrelatedLeaf = defineService({
    id: "fixture.unrelated.leaf-service",
    deps: { storage: resourceDep(unrelatedServerResource) },
  });
  const unrelatedRoot = defineService({
    id: "fixture.unrelated.root-service",
    deps: {
      leaf: serviceDep(unrelatedLeaf),
      semantics: semanticDep("fixture.unrelated.semantic-adapter"),
    },
  });

  const selectedStep = defineAsyncStepEffect({
    id: "deliver",
    policy: { interruptible: true },
    effect: () => {
      effectCalls += 1;
      return Effect.succeed("delivered");
    },
  });
  const selectedArchiveStep = defineAsyncStepEffect({
    id: "archive",
    policy: { interruptible: false },
    effect: () => {
      effectCalls += 1;
      return Effect.succeed("archived");
    },
  });
  const selectedWorkflow = defineWorkflow({
    id: "fixture.selected.workflow",
    inputSchema: processClosureInputSchema,
    steps: [selectedStep, selectedArchiveStep] as const,
  });
  const asyncPlugin = defineAsyncWorkflowPlugin.factory()({
    capability: "selected-jobs",
    services: {
      root: useService(selectedRoot, { contract: selectedRoot.oc }),
    },
    resourceRequirements: [
      requireResource({
        resource: selectedPluginResource,
        reason: "Selected plugin resource",
      }),
    ] as const,
    workflows: [selectedWorkflow] as const,
  })();
  const webLoader = async () => {
    loaderCalls += 1;
    return { page: "selected" } as const;
  };
  const webPlugin = defineWebAppPlugin.factory()({
    capability: "selected-web",
    routes: [{ id: "fixture.selected.route", path: "/selected", module: webLoader }] as const,
  })();
  const cliPlugin = definePlugin({
    id: "fixture.selected.cli",
    role: "cli",
    surface: "cli/command",
    capability: "selected-cli",
    services: {},
    resourceRequirements: [],
    project: ({ pluginId }) => {
      projectCalls += 1;
      return { kind: "plugin.projection", facts: { pluginId } };
    },
  });
  const unrelatedServerPlugin = definePlugin({
    id: "fixture.unrelated.server",
    role: "server",
    surface: "server/internal",
    capability: "unrelated-server",
    services: {
      root: useService(unrelatedRoot, { contract: unrelatedRoot.oc }),
    },
    resourceRequirements: [
      requireResource({
        resource: unrelatedServerResource,
        reason: "Unrelated server plugin resource",
      }),
    ] as const,
    project: ({ pluginId }) => {
      projectCalls += 1;
      return { kind: "plugin.projection", facts: { pluginId } };
    },
  });

  const selectedPluginProvider: RuntimeProvider = {
    kind: "runtime.provider",
    id: "fixture.selected.plugin-provider",
    title: "Selected plugin provider",
    provides: selectedPluginResource,
    requires: [],
    ...(options.configured ? { configSchema: processClosureInputSchema } : {}),
  };
  const selectedServiceProvider: RuntimeProvider = {
    kind: "runtime.provider",
    id: "fixture.selected.service-provider",
    title: "Selected service provider",
    provides: selectedServiceResource,
    requires: [],
  };
  const unrelatedServerProvider: RuntimeProvider = {
    kind: "runtime.provider",
    id: "fixture.unrelated.server-provider",
    title: "Unrelated server provider",
    provides: unrelatedServerResource,
    requires: [],
  };
  const selectedPluginProviderSelection = providerSelection({
    resource: selectedPluginResource,
    provider: selectedPluginProvider,
    ...(options.configured
      ? { config: { kind: "runtime.config" as const, key: providerConfigKey } }
      : {}),
  });
  const selectedServiceProviderSelection = providerSelection({
    resource: selectedServiceResource,
    provider: selectedServiceProvider,
  });
  const unrelatedServerProviderSelection = providerSelection({
    resource: unrelatedServerResource,
    provider: unrelatedServerProvider,
  });
  const authoredProviders =
    options.authoredOrder === "reverse"
      ? ([
          selectedPluginProviderSelection,
          selectedServiceProviderSelection,
          unrelatedServerProviderSelection,
        ] as const)
      : ([
          unrelatedServerProviderSelection,
          selectedServiceProviderSelection,
          selectedPluginProviderSelection,
        ] as const);
  const profile = defineRuntimeProfile({
    id: "fixture.process-closure-profile",
    providers: authoredProviders,
    configSources: options.configured ? authoredConfigSources : [],
    harnesses: ["harness.profile", "harness.shared"],
  });
  const authoredPlugins =
    options.authoredOrder === "reverse"
      ? ([asyncPlugin, cliPlugin, webPlugin, unrelatedServerPlugin] as const)
      : ([unrelatedServerPlugin, webPlugin, cliPlugin, asyncPlugin] as const);
  const app = defineApp({
    id: "fixture.process-closure-app",
    plugins: authoredPlugins,
  });
  const authoredRoles =
    options.authoredOrder === "reverse"
      ? (["async", "cli", "web"] as const)
      : (["web", "cli", "async"] as const);
  const process = defineProcessCatalog({
    selected: {
      id: "fixture.process-closure",
      roles: authoredRoles,
      harness: options.processHarness ?? "harness.process",
    },
  }).selected;
  const entrypoint = defineEntrypoint({
    id: "fixture.process-closure-entrypoint",
    app,
    profile,
    process,
    identity: runtimeLaunchIdentity({
      app: app.id,
      process: process.id,
      entrypoint: "fixture.process-closure-entrypoint",
      deployment: "test",
      source: "compiler-process-closure",
    }),
  });

  const asyncOwnerId = pluginOwnerId({ pluginId: asyncPlugin.id });
  const cliOwnerId = pluginOwnerId({ pluginId: cliPlugin.id });
  const serverOwnerId = pluginOwnerId({ pluginId: unrelatedServerPlugin.id });
  const webOwnerId = pluginOwnerId({ pluginId: webPlugin.id });
  const selectedPluginResourceIdentity = {
    resourceId: selectedPluginResource.id,
    lifetime: "process" as const,
  };
  const selectedServiceResourceIdentity = {
    resourceId: selectedServiceResource.id,
    lifetime: "process" as const,
  };
  const unrelatedServerResourceIdentity = {
    resourceId: unrelatedServerResource.id,
    lifetime: "process" as const,
  };

  const selectedPluginRequirementOwner = {
    kind: "plugin" as const,
    pluginOwnerId: asyncOwnerId,
  };
  const selectedPluginRequirementId = resourceRequirementId({
    owner: selectedPluginRequirementOwner,
    resource: selectedPluginResourceIdentity,
    optional: false,
  });
  const selectedPluginRequirement = {
    kind: "normalized.resource-requirement" as const,
    requirementId: selectedPluginRequirementId,
    owner: selectedPluginRequirementOwner,
    resource: selectedPluginResourceIdentity,
    optional: false,
    reason: "Selected plugin resource",
  };
  const selectedServiceRequirementOwner = {
    kind: "service" as const,
    serviceId: selectedLeaf.id,
    localName: "storage",
  };
  const selectedServiceRequirementId = resourceRequirementId({
    owner: selectedServiceRequirementOwner,
    resource: selectedServiceResourceIdentity,
    optional: false,
  });
  const selectedServiceRequirement = {
    kind: "normalized.resource-requirement" as const,
    requirementId: selectedServiceRequirementId,
    owner: selectedServiceRequirementOwner,
    resource: selectedServiceResourceIdentity,
    optional: false,
    reason: "storage",
  };
  const unrelatedPluginRequirementOwner = {
    kind: "plugin" as const,
    pluginOwnerId: serverOwnerId,
  };
  const unrelatedPluginRequirementId = resourceRequirementId({
    owner: unrelatedPluginRequirementOwner,
    resource: unrelatedServerResourceIdentity,
    optional: false,
  });
  const unrelatedPluginRequirement = {
    kind: "normalized.resource-requirement" as const,
    requirementId: unrelatedPluginRequirementId,
    owner: unrelatedPluginRequirementOwner,
    resource: unrelatedServerResourceIdentity,
    optional: false,
    reason: "Unrelated server plugin resource",
  };
  const unrelatedServiceRequirementOwner = {
    kind: "service" as const,
    serviceId: unrelatedLeaf.id,
    localName: "storage",
  };
  const unrelatedServiceRequirementId = resourceRequirementId({
    owner: unrelatedServiceRequirementOwner,
    resource: unrelatedServerResourceIdentity,
    optional: false,
  });
  const unrelatedServiceRequirement = {
    kind: "normalized.resource-requirement" as const,
    requirementId: unrelatedServiceRequirementId,
    owner: unrelatedServiceRequirementOwner,
    resource: unrelatedServerResourceIdentity,
    optional: false,
    reason: "storage",
  };

  const selectedServiceDependencyId = serviceDependencyId({
    serviceId: selectedRoot.id,
    localName: "leaf",
    dependencyServiceId: selectedLeaf.id,
  });
  const selectedServiceDependency = {
    kind: "normalized.service-dependency" as const,
    dependencyId: selectedServiceDependencyId,
    serviceId: selectedRoot.id,
    localName: "leaf",
    dependencyServiceId: selectedLeaf.id,
  };
  const unrelatedServiceDependencyId = serviceDependencyId({
    serviceId: unrelatedRoot.id,
    localName: "leaf",
    dependencyServiceId: unrelatedLeaf.id,
  });
  const unrelatedServiceDependency = {
    kind: "normalized.service-dependency" as const,
    dependencyId: unrelatedServiceDependencyId,
    serviceId: unrelatedRoot.id,
    localName: "leaf",
    dependencyServiceId: unrelatedLeaf.id,
  };
  const selectedSemanticDependencyId = semanticDependencyId({
    serviceId: selectedRoot.id,
    localName: "semantics",
    adapterId: "fixture.selected.semantic-adapter",
  });
  const selectedSemanticDependency = {
    kind: "normalized.semantic-dependency" as const,
    dependencyId: selectedSemanticDependencyId,
    serviceId: selectedRoot.id,
    localName: "semantics",
    adapterId: "fixture.selected.semantic-adapter",
  };
  const unrelatedSemanticDependencyId = semanticDependencyId({
    serviceId: unrelatedRoot.id,
    localName: "semantics",
    adapterId: "fixture.unrelated.semantic-adapter",
  });
  const unrelatedSemanticDependency = {
    kind: "normalized.semantic-dependency" as const,
    dependencyId: unrelatedSemanticDependencyId,
    serviceId: unrelatedRoot.id,
    localName: "semantics",
    adapterId: "fixture.unrelated.semantic-adapter",
  };

  const selectedLeafBindingIdentity = {
    role: "async" as const,
    serviceId: selectedLeaf.id,
    resourceRequirementIds: [selectedServiceRequirementId],
    serviceBindingIds: [],
    semanticDependencyIds: [],
  };
  const selectedLeafBinding = {
    kind: "service.binding-plan" as const,
    bindingId: serviceBindingId(selectedLeafBindingIdentity),
    ...selectedLeafBindingIdentity,
  };
  const selectedRootBindingIdentity = {
    role: "async" as const,
    serviceId: selectedRoot.id,
    resourceRequirementIds: [],
    serviceBindingIds: [selectedLeafBinding.bindingId],
    semanticDependencyIds: [selectedSemanticDependencyId],
  };
  const selectedRootBinding = {
    kind: "service.binding-plan" as const,
    bindingId: serviceBindingId(selectedRootBindingIdentity),
    ...selectedRootBindingIdentity,
  };
  const unrelatedLeafBindingIdentity = {
    role: "server" as const,
    serviceId: unrelatedLeaf.id,
    resourceRequirementIds: [unrelatedServiceRequirementId],
    serviceBindingIds: [],
    semanticDependencyIds: [],
  };
  const unrelatedLeafBinding = {
    kind: "service.binding-plan" as const,
    bindingId: serviceBindingId(unrelatedLeafBindingIdentity),
    ...unrelatedLeafBindingIdentity,
  };
  const unrelatedRootBindingIdentity = {
    role: "server" as const,
    serviceId: unrelatedRoot.id,
    resourceRequirementIds: [],
    serviceBindingIds: [unrelatedLeafBinding.bindingId],
    semanticDependencyIds: [unrelatedSemanticDependencyId],
  };
  const unrelatedRootBinding = {
    kind: "service.binding-plan" as const,
    bindingId: serviceBindingId(unrelatedRootBindingIdentity),
    ...unrelatedRootBindingIdentity,
  };

  const asyncExecutionIdentity = {
    boundary: "plugin.async-step" as const,
    ownerId: asyncOwnerId,
    workflowId: selectedWorkflow.id,
    stepId: selectedStep.id,
  };
  const asyncExecutionRef = {
    kind: "execution.descriptor-ref" as const,
    executionId: executionDescriptorId(asyncExecutionIdentity),
    ...asyncExecutionIdentity,
  };
  const asyncArchiveExecutionIdentity = {
    boundary: "plugin.async-step" as const,
    ownerId: asyncOwnerId,
    workflowId: selectedWorkflow.id,
    stepId: selectedArchiveStep.id,
  };
  const asyncArchiveExecutionRef = {
    kind: "execution.descriptor-ref" as const,
    executionId: executionDescriptorId(asyncArchiveExecutionIdentity),
    ...asyncArchiveExecutionIdentity,
  };
  const selectedExecutionRefs = sortByTuple(
    [asyncExecutionRef, asyncArchiveExecutionRef],
    executionRefOrderTuple
  );
  const webRouteRef = {
    kind: "web.route-module-ref" as const,
    ownerId: webOwnerId,
    routeId: "fixture.selected.route",
    path: "/selected",
  };
  const workflowIds = [selectedWorkflow.id] as const;
  const workflowDescriptorIdentity = {
    appId: app.id,
    pluginOwnerId: asyncOwnerId,
    role: "async" as const,
    surface: "async/workflow" as const,
    capability: asyncPlugin.capability,
    workflowIds,
  };
  const workflowDescriptor = {
    kind: "workflow.dispatcher-descriptor" as const,
    descriptorId: workflowDispatcherId(workflowDescriptorIdentity),
    ...workflowDescriptorIdentity,
  };
  const unrelatedWorkflowIds = ["fixture.unrelated.workflow"] as const;
  const unrelatedWorkflowDescriptorIdentity = {
    appId: app.id,
    pluginOwnerId: serverOwnerId,
    role: "async" as const,
    surface: "async/workflow" as const,
    capability: unrelatedServerPlugin.capability,
    workflowIds: unrelatedWorkflowIds,
  };
  const unrelatedWorkflowDescriptor = {
    kind: "workflow.dispatcher-descriptor" as const,
    descriptorId: workflowDispatcherId(unrelatedWorkflowDescriptorIdentity),
    ...unrelatedWorkflowDescriptorIdentity,
  };
  const unrelatedExecutionIdentity = {
    boundary: "plugin.async-step" as const,
    ownerId: serverOwnerId,
    workflowId: unrelatedWorkflowIds[0],
    stepId: "fixture.unrelated.step",
  };
  const unrelatedExecutionRef = {
    kind: "execution.descriptor-ref" as const,
    executionId: executionDescriptorId(unrelatedExecutionIdentity),
    ...unrelatedExecutionIdentity,
  };
  const unrelatedWebRouteRef = {
    kind: "web.route-module-ref" as const,
    ownerId: serverOwnerId,
    routeId: "fixture.unrelated.route",
    path: "/unrelated",
  };

  const asyncSurfaceIdentity = {
    pluginOwnerId: asyncOwnerId,
    role: asyncPlugin.role,
    surface: asyncPlugin.surface,
    capability: asyncPlugin.capability,
  };
  const asyncSurface = {
    kind: "surface.runtime-plan" as const,
    surfacePlanId: surfacePlanId(asyncSurfaceIdentity),
    ...asyncSurfaceIdentity,
    serviceBindingIds: [selectedRootBinding.bindingId],
    resourceRequirementIds: [selectedPluginRequirementId],
    workflowDispatcherDescriptorIds: [workflowDescriptor.descriptorId],
    executionDescriptorRefs: selectedExecutionRefs,
    webRouteModuleRefs: [],
  };
  const cliSurfaceIdentity = {
    pluginOwnerId: cliOwnerId,
    role: cliPlugin.role,
    surface: cliPlugin.surface,
    capability: cliPlugin.capability,
  };
  const cliSurface = {
    kind: "surface.runtime-plan" as const,
    surfacePlanId: surfacePlanId(cliSurfaceIdentity),
    ...cliSurfaceIdentity,
    serviceBindingIds: [],
    resourceRequirementIds: [],
    workflowDispatcherDescriptorIds: [],
    executionDescriptorRefs: [],
    webRouteModuleRefs: [],
  };
  const serverSurfaceIdentity = {
    pluginOwnerId: serverOwnerId,
    role: unrelatedServerPlugin.role,
    surface: unrelatedServerPlugin.surface,
    capability: unrelatedServerPlugin.capability,
  };
  const serverSurface = {
    kind: "surface.runtime-plan" as const,
    surfacePlanId: surfacePlanId(serverSurfaceIdentity),
    ...serverSurfaceIdentity,
    serviceBindingIds: [unrelatedRootBinding.bindingId],
    resourceRequirementIds: [unrelatedPluginRequirementId],
    workflowDispatcherDescriptorIds: [unrelatedWorkflowDescriptor.descriptorId],
    executionDescriptorRefs: [unrelatedExecutionRef],
    webRouteModuleRefs: [unrelatedWebRouteRef],
  };
  const webSurfaceIdentity = {
    pluginOwnerId: webOwnerId,
    role: webPlugin.role,
    surface: webPlugin.surface,
    capability: webPlugin.capability,
  };
  const webSurface = {
    kind: "surface.runtime-plan" as const,
    surfacePlanId: surfacePlanId(webSurfaceIdentity),
    ...webSurfaceIdentity,
    serviceBindingIds: [],
    resourceRequirementIds: [],
    workflowDispatcherDescriptorIds: [],
    executionDescriptorRefs: [],
    webRouteModuleRefs: [webRouteRef],
  };
  const surfaceRuntimePlans = sortByTuple(
    [serverSurface, cliSurface, webSurface, asyncSurface],
    (surface) => [surface.surfacePlanId]
  );

  const asyncServiceUse = {
    kind: "normalized.service-use" as const,
    useId: serviceUseId({
      pluginOwnerId: asyncOwnerId,
      localName: "root",
      serviceId: selectedRoot.id,
    }),
    pluginOwnerId: asyncOwnerId,
    localName: "root",
    serviceId: selectedRoot.id,
  };
  const serverServiceUse = {
    kind: "normalized.service-use" as const,
    useId: serviceUseId({
      pluginOwnerId: serverOwnerId,
      localName: "root",
      serviceId: unrelatedRoot.id,
    }),
    pluginOwnerId: serverOwnerId,
    localName: "root",
    serviceId: unrelatedRoot.id,
  };
  const normalizedPlugins = sortByTuple(
    [
      {
        kind: "normalized.plugin-definition" as const,
        ownerId: asyncOwnerId,
        plugin: { pluginId: asyncPlugin.id },
        role: asyncPlugin.role,
        surface: asyncPlugin.surface,
        capability: asyncPlugin.capability,
        serviceUseIds: [asyncServiceUse.useId],
        resourceRequirementIds: [selectedPluginRequirementId],
      },
      {
        kind: "normalized.plugin-definition" as const,
        ownerId: cliOwnerId,
        plugin: { pluginId: cliPlugin.id },
        role: cliPlugin.role,
        surface: cliPlugin.surface,
        capability: cliPlugin.capability,
        serviceUseIds: [],
        resourceRequirementIds: [],
      },
      {
        kind: "normalized.plugin-definition" as const,
        ownerId: serverOwnerId,
        plugin: { pluginId: unrelatedServerPlugin.id },
        role: unrelatedServerPlugin.role,
        surface: unrelatedServerPlugin.surface,
        capability: unrelatedServerPlugin.capability,
        serviceUseIds: [serverServiceUse.useId],
        resourceRequirementIds: [unrelatedPluginRequirementId],
      },
      {
        kind: "normalized.plugin-definition" as const,
        ownerId: webOwnerId,
        plugin: { pluginId: webPlugin.id },
        role: webPlugin.role,
        surface: webPlugin.surface,
        capability: webPlugin.capability,
        serviceUseIds: [],
        resourceRequirementIds: [],
      },
    ],
    (plugin) => [plugin.ownerId]
  );
  const selectedPluginSelection = {
    kind: "normalized.provider-selection" as const,
    selectionId: providerSelectionId({
      providerId: selectedPluginProvider.id,
      resource: selectedPluginResourceIdentity,
      ...(options.configured ? { configRef: providerConfigRef } : {}),
    }),
    providerId: selectedPluginProvider.id,
    resource: selectedPluginResourceIdentity,
    ...(options.configured ? { configRef: providerConfigRef } : {}),
  };
  const selectedServiceSelection = {
    kind: "normalized.provider-selection" as const,
    selectionId: providerSelectionId({
      providerId: selectedServiceProvider.id,
      resource: selectedServiceResourceIdentity,
    }),
    providerId: selectedServiceProvider.id,
    resource: selectedServiceResourceIdentity,
  };
  const unrelatedServerSelection = {
    kind: "normalized.provider-selection" as const,
    selectionId: providerSelectionId({
      providerId: unrelatedServerProvider.id,
      resource: unrelatedServerResourceIdentity,
    }),
    providerId: unrelatedServerProvider.id,
    resource: unrelatedServerResourceIdentity,
  };
  const normalizedProviderSelections = sortByTuple(
    [selectedPluginSelection, selectedServiceSelection, unrelatedServerSelection],
    (selection) => [selection.selectionId]
  );
  const pluginIdentities = sortByTuple(
    [
      { pluginId: asyncPlugin.id },
      { pluginId: cliPlugin.id },
      { pluginId: unrelatedServerPlugin.id },
      { pluginId: webPlugin.id },
    ],
    (plugin) => [plugin.pluginId]
  );
  const surfaceRequirements = sortByTuple(
    [
      { plugin: { pluginId: asyncPlugin.id }, ...asyncSurfaceIdentity },
      { plugin: { pluginId: cliPlugin.id }, ...cliSurfaceIdentity },
      { plugin: { pluginId: unrelatedServerPlugin.id }, ...serverSurfaceIdentity },
      { plugin: { pluginId: webPlugin.id }, ...webSurfaceIdentity },
    ].map(({ plugin, pluginOwnerId: _pluginOwnerId, ...surface }) => ({ plugin, ...surface })),
    (requirement) => [
      requirement.plugin.pluginId,
      requirement.role,
      requirement.surface,
      requirement.capability,
    ]
  );
  const topologyEdges: NormalizedAuthoringGraph["topology"]["edges"] = [
    ...pluginIdentities.map((plugin) => ({
      kind: "app.plugin" as const,
      appId: app.id,
      plugin,
    })),
    {
      kind: "plugin.resource",
      plugin: { pluginId: asyncPlugin.id },
      resource: selectedPluginResourceIdentity,
    },
    {
      kind: "plugin.resource",
      plugin: { pluginId: unrelatedServerPlugin.id },
      resource: unrelatedServerResourceIdentity,
    },
    {
      kind: "service.service",
      serviceId: selectedRoot.id,
      dependencyServiceId: selectedLeaf.id,
    },
    {
      kind: "service.service",
      serviceId: unrelatedRoot.id,
      dependencyServiceId: unrelatedLeaf.id,
    },
    {
      kind: "service.resource",
      serviceId: selectedLeaf.id,
      resourceId: selectedServiceResource.id,
    },
    {
      kind: "service.resource",
      serviceId: unrelatedLeaf.id,
      resourceId: unrelatedServerResource.id,
    },
    {
      kind: "service.semantic",
      serviceId: selectedRoot.id,
      adapterId: "fixture.selected.semantic-adapter",
    },
    {
      kind: "service.semantic",
      serviceId: unrelatedRoot.id,
      adapterId: "fixture.unrelated.semantic-adapter",
    },
  ];
  const sortedTopologyEdges = sortByTuple(topologyEdges, (edge) => {
    switch (edge.kind) {
      case "app.plugin":
        return [edge.kind, edge.appId, edge.plugin.pluginId, edge.plugin.instance ?? ""];
      case "plugin.resource":
        return [
          edge.kind,
          edge.plugin.pluginId,
          edge.plugin.instance ?? "",
          edge.resource.resourceId,
          edge.resource.lifetime,
          edge.resource.role ?? "",
          edge.resource.instance ?? "",
        ];
      case "service.service":
        return [edge.kind, edge.serviceId, edge.dependencyServiceId];
      case "service.resource":
        return [edge.kind, edge.serviceId, edge.resourceId];
      case "service.semantic":
        return [edge.kind, edge.serviceId, edge.adapterId];
    }
  });
  const roleSurfaceEntries = sortByTuple(
    surfaceRuntimePlans.map((surface) => ({
      role: surface.role,
      surface: surface.surface,
      surfacePlanIds: [surface.surfacePlanId],
    })),
    (entry) => [entry.role, entry.surface]
  );

  const graph: NormalizedAuthoringGraph = {
    kind: "normalized.authoring-graph",
    topology: {
      identity: entrypoint.identity,
      profileId: profile.id,
      pluginIdentities,
      roleRequirements: ["async", "cli", "web"],
      surfaceRequirements,
      resourceRequirementIdentities: sortByTuple(
        [selectedPluginResourceIdentity, unrelatedServerResourceIdentity],
        (resource) => [resource.resourceId, resource.lifetime, "", ""]
      ),
      edges: sortedTopologyEdges,
    },
    app: {
      kind: "normalized.app-definition",
      appId: app.id,
      pluginOwnerIds: normalizedPlugins.map(({ ownerId }) => ownerId),
    },
    plugins: normalizedPlugins,
    roleSurfaceIndex: {
      kind: "derived.role-surface-index",
      entries: roleSurfaceEntries,
    },
    serviceUses: sortByTuple([serverServiceUse, asyncServiceUse], (use) => [use.useId]),
    serviceDependencies: sortByTuple(
      [unrelatedServiceDependency, selectedServiceDependency],
      (dependency) => [dependency.dependencyId]
    ),
    semanticDependencies: sortByTuple(
      [unrelatedSemanticDependency, selectedSemanticDependency],
      (dependency) => [dependency.dependencyId]
    ),
    resourceRequirements: sortByTuple(
      [
        unrelatedPluginRequirement,
        selectedServiceRequirement,
        unrelatedServiceRequirement,
        selectedPluginRequirement,
      ],
      (requirement) => [requirement.requirementId]
    ),
    profile: {
      kind: "normalized.runtime-profile",
      profileId: profile.id,
      providerSelections: normalizedProviderSelections,
      configSources: options.configured ? normalizedConfigSources : [],
      harnesses: ["harness.profile", "harness.shared"],
    },
    serviceBindingPlans: sortByTuple(
      [selectedRootBinding, unrelatedLeafBinding, selectedLeafBinding, unrelatedRootBinding],
      (binding) => [binding.bindingId]
    ),
    surfaceRuntimePlans,
    workflowDispatcherDescriptors: sortByTuple(
      [workflowDescriptor, unrelatedWorkflowDescriptor],
      (descriptor) => [descriptor.descriptorId]
    ),
    executionDescriptorRefs: sortByTuple(
      [asyncExecutionRef, asyncArchiveExecutionRef, unrelatedExecutionRef],
      executionRefOrderTuple
    ),
    webRouteModuleRefs: sortByTuple([webRouteRef, unrelatedWebRouteRef], (ref) => [
      ref.ownerId,
      ref.routeId,
      ref.path,
    ]),
    findings: [],
  };

  return {
    input: { entrypoint, graph } satisfies RuntimeCompilationInput,
    counters: () => ({
      definitionCalls,
      effectCalls,
      loaderCalls,
      observationContributionCalls,
      projectCalls,
      schemaCalls,
    }),
    config: {
      authoredSources: options.configured ? authoredConfigSources : [],
      normalizedSources: options.configured ? normalizedConfigSources : [],
      providerRef: options.configured ? providerConfigRef : undefined,
    },
    providers: {
      selectedPlugin: selectedPluginProvider,
      selectedService: selectedServiceProvider,
      unrelatedServer: unrelatedServerProvider,
    },
    selections: {
      selectedPlugin: selectedPluginSelection,
      selectedService: selectedServiceSelection,
      unrelatedServer: unrelatedServerSelection,
    },
    services: {
      selectedLeaf,
      selectedRoot,
      unrelatedLeaf,
      unrelatedRoot,
    },
    facts: {
      asyncArchiveExecutionRef,
      asyncExecutionRef,
      asyncSurface,
      cliSurface,
      selectedLeafBinding,
      selectedPluginRequirement,
      selectedRootBinding,
      selectedSemanticDependency,
      selectedServiceRequirement,
      serverSurface,
      unrelatedLeafBinding,
      unrelatedExecutionRef,
      unrelatedPluginRequirement,
      unrelatedRootBinding,
      unrelatedSemanticDependency,
      unrelatedServiceRequirement,
      unrelatedWebRouteRef,
      unrelatedWorkflowDescriptor,
      webRouteRef,
      webSurface,
      workflowDescriptor,
    },
  };
}

function makeProviderBranchFixture(options: { readonly cycle?: ProviderCycle } = {}) {
  let projectCalls = 0;
  const resourceA = defineRuntimeResource<string, unknown>({
    id: "fixture.resource-a",
    title: "Resource A",
    purpose: "Provider closure root",
  });
  const resourceB = defineRuntimeResource<string, unknown>({
    id: "fixture.resource-b",
    title: "Resource B",
    purpose: "Provider closure middle",
  });
  const resourceC = defineRuntimeResource<string, unknown>({
    id: "fixture.resource-c",
    title: "Resource C",
    purpose: "Provider closure leaf",
  });
  const selectedOptionalResource = defineRuntimeResource<string, unknown>({
    id: "fixture.selected-optional",
    title: "Selected optional resource",
    purpose: "Selected optional branch",
  });
  const directOptionalResource = defineRuntimeResource<string, unknown>({
    id: "fixture.direct-optional",
    title: "Direct optional resource",
    purpose: "Unselected direct optional branch",
  });
  const providerOptionalResource = defineRuntimeResource<string, unknown>({
    id: "fixture.provider-optional",
    title: "Provider optional resource",
    purpose: "Unselected provider-owned optional branch",
  });

  const resourceAIdentity = {
    resourceId: resourceA.id,
    lifetime: "process" as const,
    instance: "tenant-two",
  };
  const competingResourceAIdentity = {
    resourceId: resourceA.id,
    lifetime: "process" as const,
    instance: "tenant-three",
  };
  const resourceBIdentity = {
    resourceId: resourceB.id,
    lifetime: "process" as const,
  };
  const resourceCIdentity = {
    resourceId: resourceC.id,
    lifetime: "process" as const,
  };
  const selectedOptionalIdentity = {
    resourceId: selectedOptionalResource.id,
    lifetime: "process" as const,
    instance: "secondary",
  };
  const directOptionalIdentity = {
    resourceId: directOptionalResource.id,
    lifetime: "process" as const,
  };
  const providerOptionalIdentity = {
    resourceId: providerOptionalResource.id,
    lifetime: "process" as const,
  };

  const providerC = defineRuntimeProvider({
    id: "fixture.provider-c",
    title: "Provider C",
    provides: resourceC,
    requires:
      options.cycle === "transitive"
        ? [
            requireResource({
              resource: resourceA,
              instance: resourceAIdentity.instance,
              reason: "C requires A",
            }),
          ]
        : [],
  });
  const providerB = defineRuntimeProvider({
    id: "fixture.provider-b",
    title: "Provider B",
    provides: resourceB,
    requires: [requireResource({ resource: resourceC, reason: "B requires C" })],
  });
  const providerA = defineRuntimeProvider({
    id: "fixture.provider-a",
    title: "Provider A",
    provides: resourceA,
    requires: [
      requireResource({ resource: resourceB, reason: "A requires B" }),
      requireResource({
        resource: providerOptionalResource,
        optional: true,
        reason: "A can use provider telemetry",
      }),
      ...(options.cycle === "self"
        ? [
            requireResource({
              resource: resourceA,
              instance: resourceAIdentity.instance,
              reason: "A requires itself",
            }),
          ]
        : []),
    ],
  });
  const competingProviderA = defineRuntimeProvider({
    id: "fixture.provider-a-competing",
    title: "Competing provider A",
    provides: resourceA,
    requires: [],
  });
  const selectedOptionalProvider = defineRuntimeProvider({
    id: "fixture.selected-optional-provider",
    title: "Selected optional provider",
    provides: selectedOptionalResource,
    requires: [],
  });

  const plugin = definePlugin({
    id: "fixture.provider-branch",
    instance: "primary",
    role: "server",
    surface: "server/internal",
    capability: "provider-closure",
    services: {},
    resourceRequirements: [
      requireResource({
        resource: resourceA,
        instance: resourceAIdentity.instance,
        reason: "Required provider root",
      }),
      requireResource({
        resource: resourceA,
        instance: competingResourceAIdentity.instance,
        reason: "Competing provider branch",
      }),
      requireResource({
        resource: selectedOptionalResource,
        instance: selectedOptionalIdentity.instance,
        optional: true,
        reason: "Selected optional branch",
      }),
      requireResource({
        resource: directOptionalResource,
        optional: true,
        reason: "Unselected direct optional branch",
      }),
    ] as const,
    project: ({ pluginId }) => {
      projectCalls += 1;
      return { kind: "plugin.projection", facts: { pluginId } };
    },
  });
  const authoredSelections = [
    providerSelection({
      resource: resourceA,
      provider: providerA,
      instance: resourceAIdentity.instance,
    }),
    providerSelection({
      resource: resourceA,
      provider: competingProviderA,
      instance: competingResourceAIdentity.instance,
    }),
    providerSelection({ resource: resourceB, provider: providerB }),
    providerSelection({ resource: resourceC, provider: providerC }),
    providerSelection({
      resource: selectedOptionalResource,
      provider: selectedOptionalProvider,
      instance: selectedOptionalIdentity.instance,
    }),
  ] as const;
  const profile = defineRuntimeProfile({
    id: "fixture.provider-profile",
    providers: authoredSelections,
  });
  const app = defineApp({ id: "fixture.provider-app", plugins: [plugin] as const });
  const process = defineProcessCatalog({
    server: { id: "fixture.provider-process", roles: ["server"] as const },
  }).server;
  const entrypoint = defineEntrypoint({
    id: "fixture.provider-entrypoint",
    app,
    profile,
    process,
    identity: runtimeLaunchIdentity({
      app: app.id,
      process: process.id,
      entrypoint: "fixture.provider-entrypoint",
      deployment: "test",
      source: "compiler-provider-closure",
    }),
  });
  const graph = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id }).graph;

  const ownerId = pluginOwnerId({
    pluginId: plugin.id,
    ...(plugin.instance === undefined ? {} : { instance: plugin.instance }),
  });
  const requirementIds = {
    directRequired: resourceRequirementId({
      owner: { kind: "plugin", pluginOwnerId: ownerId },
      resource: resourceAIdentity,
      optional: false,
    }),
    directCompetingA: resourceRequirementId({
      owner: { kind: "plugin", pluginOwnerId: ownerId },
      resource: competingResourceAIdentity,
      optional: false,
    }),
    directSelectedOptional: resourceRequirementId({
      owner: { kind: "plugin", pluginOwnerId: ownerId },
      resource: selectedOptionalIdentity,
      optional: true,
    }),
    directMissingOptional: resourceRequirementId({
      owner: { kind: "plugin", pluginOwnerId: ownerId },
      resource: directOptionalIdentity,
      optional: true,
    }),
    aRequiresB: resourceRequirementId({
      owner: { kind: "provider", providerId: providerA.id },
      resource: resourceBIdentity,
      optional: false,
    }),
    aMissingOptional: resourceRequirementId({
      owner: { kind: "provider", providerId: providerA.id },
      resource: providerOptionalIdentity,
      optional: true,
    }),
    bRequiresC: resourceRequirementId({
      owner: { kind: "provider", providerId: providerB.id },
      resource: resourceCIdentity,
      optional: false,
    }),
  } as const;
  const selectionIds = {
    a: providerSelectionId({ providerId: providerA.id, resource: resourceAIdentity }),
    competingA: providerSelectionId({
      providerId: competingProviderA.id,
      resource: competingResourceAIdentity,
    }),
    b: providerSelectionId({ providerId: providerB.id, resource: resourceBIdentity }),
    c: providerSelectionId({ providerId: providerC.id, resource: resourceCIdentity }),
    selectedOptional: providerSelectionId({
      providerId: selectedOptionalProvider.id,
      resource: selectedOptionalIdentity,
    }),
  } as const;

  return {
    input: { entrypoint, graph } satisfies RuntimeCompilationInput,
    authoredSelections,
    counters: () => ({ projectCalls }),
    providers: {
      a: providerA,
      competingA: competingProviderA,
      b: providerB,
      c: providerC,
      selectedOptionalProvider,
    },
    resources: {
      a: resourceAIdentity,
      competingA: competingResourceAIdentity,
      b: resourceBIdentity,
      c: resourceCIdentity,
      selectedOptional: selectedOptionalIdentity,
      directOptional: directOptionalIdentity,
      providerOptional: providerOptionalIdentity,
    },
    requirementIds,
    selectionIds,
  };
}

function replaceEntrypointProviders(
  entrypoint: Entrypoint,
  providers: readonly AuthoredProviderSelection[]
): Entrypoint {
  const profile = defineRuntimeProfile({
    id: entrypoint.profile.id,
    providers,
    configSources: entrypoint.profile.configSources,
    ...(entrypoint.profile.processDefaults === undefined
      ? {}
      : { processDefaults: entrypoint.profile.processDefaults }),
    ...(entrypoint.profile.harnesses === undefined
      ? {}
      : { harnesses: entrypoint.profile.harnesses }),
  });
  return defineEntrypoint({
    id: entrypoint.id,
    app: entrypoint.app,
    profile,
    process: entrypoint.process,
    identity: entrypoint.identity,
  });
}

function replaceAuthoredProvider(
  selection: AuthoredProviderSelection,
  provider: RuntimeProvider
): AuthoredProviderSelection {
  return providerSelection({
    provider,
    resource: selection.resource,
    ...(selection.lifetime === undefined ? {} : { lifetime: selection.lifetime }),
    ...(selection.role === undefined ? {} : { role: selection.role }),
    ...(selection.instance === undefined ? {} : { instance: selection.instance }),
    ...(selection.config === undefined ? {} : { config: selection.config }),
  });
}

function expectCompilerRefusal(
  input: RuntimeCompilationInput,
  counters: () => { readonly projectCalls: number }
): void {
  let result: ReturnType<typeof compileRuntimePlan> | undefined;
  let thrown: unknown;
  try {
    result = compileRuntimePlan(input);
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(TypeError);
  expect(result).toBeUndefined();
  expect(counters()).toEqual({ projectCalls: 0 });
}

describe("compileRuntimePlan", () => {
  test("returns the baseline compilation result", () => {
    const result = compileRuntimePlan(makeFixture());

    expect(Object.keys(result)).toEqual(["plan", "references", "observationSeed"]);
    expect(result.plan.kind).toBe("compiled.process-plan");
  });

  test("refuses invalid input", () => {
    const fixture = makeFixture();
    const entrypoint = {
      ...fixture.entrypoint,
      identity: { ...fixture.entrypoint.identity, process: "other" },
    } as RuntimeCompilationInput["entrypoint"];

    expect(() => compileRuntimePlan({ entrypoint, graph: fixture.graph })).toThrow();
  });

  test("projects the exact selected process closure and preserves cold references", () => {
    const fixture = makeProcessClosureFixture();
    const { facts, selections } = fixture;

    expect(Object.isFrozen(fixture.providers.selectedPlugin)).toBe(false);
    expect(Object.isFrozen(fixture.providers.selectedService)).toBe(false);
    expect(Object.isFrozen(fixture.services.selectedLeaf)).toBe(false);
    expect(Object.isFrozen(fixture.services.selectedRoot)).toBe(false);

    const result = compileRuntimePlan(fixture.input);

    const observationPortInputKey: ObservationPortInputKey | undefined = undefined;
    expect(Object.keys(fixture.input).sort()).toEqual(["entrypoint", "graph"]);
    expect(fixture.input).not.toHaveProperty("observationPort");
    expect(observationPortInputKey).toBeUndefined();
    expect(fixture.input.entrypoint.process.roles).toEqual(["web", "cli", "async"]);
    expect(fixture.input.graph.topology.roleRequirements).toEqual(["async", "cli", "web"]);
    expect(result.plan.identity).toEqual(fixture.input.entrypoint.identity);
    expect(result.plan.profileId).toBe(fixture.input.entrypoint.profile.id);
    expect(result.plan.roles).toEqual(["async", "cli", "web"]);

    const surfaces = new Map(
      result.plan.surfaces.map((surface) => [surface.surfacePlanId, surface] as const)
    );
    expect(new Set(surfaces.keys())).toEqual(
      new Set([
        facts.asyncSurface.surfacePlanId,
        facts.cliSurface.surfacePlanId,
        facts.webSurface.surfacePlanId,
      ])
    );
    expect(surfaces.get(facts.asyncSurface.surfacePlanId)).toEqual({
      kind: "compiled.surface-plan",
      surfacePlanId: facts.asyncSurface.surfacePlanId,
      pluginOwnerId: facts.asyncSurface.pluginOwnerId,
      role: facts.asyncSurface.role,
      surface: facts.asyncSurface.surface,
      capability: facts.asyncSurface.capability,
      serviceBindingIds: [facts.selectedRootBinding.bindingId],
      resources: [
        {
          requirementId: facts.selectedPluginRequirement.requirementId,
          selectionId: selections.selectedPlugin.selectionId,
        },
      ],
      workflowDispatcherIds: [facts.workflowDescriptor.descriptorId],
      executionDescriptorRefs: facts.asyncSurface.executionDescriptorRefs,
      webRouteModuleRefs: [],
    });
    expect(surfaces.get(facts.cliSurface.surfacePlanId)).toEqual({
      kind: "compiled.surface-plan",
      surfacePlanId: facts.cliSurface.surfacePlanId,
      pluginOwnerId: facts.cliSurface.pluginOwnerId,
      role: facts.cliSurface.role,
      surface: facts.cliSurface.surface,
      capability: facts.cliSurface.capability,
      serviceBindingIds: [],
      resources: [],
      workflowDispatcherIds: [],
      executionDescriptorRefs: [],
      webRouteModuleRefs: [],
    });
    expect(surfaces.get(facts.webSurface.surfacePlanId)).toEqual({
      kind: "compiled.surface-plan",
      surfacePlanId: facts.webSurface.surfacePlanId,
      pluginOwnerId: facts.webSurface.pluginOwnerId,
      role: facts.webSurface.role,
      surface: facts.webSurface.surface,
      capability: facts.webSurface.capability,
      serviceBindingIds: [],
      resources: [],
      workflowDispatcherIds: [],
      executionDescriptorRefs: [],
      webRouteModuleRefs: [facts.webRouteRef],
    });
    expect(result.plan.surfaces.every((surface) => !Object.hasOwn(surface, "adapterTarget"))).toBe(
      true
    );

    const serviceBindings = new Map(
      result.plan.serviceBindings.map((binding) => [binding.bindingId, binding] as const)
    );
    expect(new Set(serviceBindings.keys())).toEqual(
      new Set([facts.selectedLeafBinding.bindingId, facts.selectedRootBinding.bindingId])
    );
    expect(serviceBindings.get(facts.selectedRootBinding.bindingId)).toEqual({
      kind: "compiled.service-binding-plan",
      bindingId: facts.selectedRootBinding.bindingId,
      role: "async",
      serviceId: fixture.services.selectedRoot.id,
      resources: [],
      serviceBindingIds: [facts.selectedLeafBinding.bindingId],
      semanticDependencyIds: [facts.selectedSemanticDependency.dependencyId],
    });
    expect(serviceBindings.get(facts.selectedLeafBinding.bindingId)).toEqual({
      kind: "compiled.service-binding-plan",
      bindingId: facts.selectedLeafBinding.bindingId,
      role: "async",
      serviceId: fixture.services.selectedLeaf.id,
      resources: [
        {
          requirementId: facts.selectedServiceRequirement.requirementId,
          selectionId: selections.selectedService.selectionId,
        },
      ],
      serviceBindingIds: [],
      semanticDependencyIds: [],
    });

    const requirements = new Map(
      result.plan.resourceRequirements.map(
        (requirement) => [requirement.requirementId, requirement] as const
      )
    );
    expect(new Set(requirements.keys())).toEqual(
      new Set([
        facts.selectedPluginRequirement.requirementId,
        facts.selectedServiceRequirement.requirementId,
      ])
    );
    expect(requirements.get(facts.selectedPluginRequirement.requirementId)).toEqual(
      facts.selectedPluginRequirement
    );
    expect(requirements.get(facts.selectedServiceRequirement.requirementId)).toEqual(
      facts.selectedServiceRequirement
    );

    const providerSelections = new Map(
      result.plan.providerSelections.map((selection) => [selection.selectionId, selection] as const)
    );
    expect(new Set(providerSelections.keys())).toEqual(
      new Set([selections.selectedPlugin.selectionId, selections.selectedService.selectionId])
    );
    expect(providerSelections.get(selections.selectedPlugin.selectionId)).toEqual(
      selections.selectedPlugin
    );
    expect(providerSelections.get(selections.selectedService.selectionId)).toEqual(
      selections.selectedService
    );

    const providerNodes = new Map(
      result.plan.providerDependencyGraph.nodes.map((node) => [node.selectionId, node] as const)
    );
    expect(new Set(providerNodes.keys())).toEqual(
      new Set([selections.selectedPlugin.selectionId, selections.selectedService.selectionId])
    );
    expect(providerNodes.get(selections.selectedPlugin.selectionId)).toEqual({
      selectionId: selections.selectedPlugin.selectionId,
      providerId: fixture.providers.selectedPlugin.id,
      resource: selections.selectedPlugin.resource,
    });
    expect(providerNodes.get(selections.selectedService.selectionId)).toEqual({
      selectionId: selections.selectedService.selectionId,
      providerId: fixture.providers.selectedService.id,
      resource: selections.selectedService.resource,
    });
    expect(result.plan.providerDependencyGraph.edges).toEqual([]);
    expect(
      new Map(
        result.plan.providerDependencyGraph.closure.map((closure) => [
          closure.selectionId,
          closure.reachableSelectionIds,
        ])
      )
    ).toEqual(
      new Map([
        [selections.selectedPlugin.selectionId, []],
        [selections.selectedService.selectionId, []],
      ])
    );
    expect(result.plan.bootgraphInput).toEqual({
      kind: "bootgraph.input",
      nodes: result.plan.providerDependencyGraph.nodes,
      edges: [],
    });

    const compiledResources = new Map(
      result.plan.compiledResources.map((resource) => [resource.selectionId, resource] as const)
    );
    expect(compiledResources.get(selections.selectedPlugin.selectionId)).toEqual({
      kind: "compiled.resource-plan",
      selectionId: selections.selectedPlugin.selectionId,
      providerId: fixture.providers.selectedPlugin.id,
      resource: selections.selectedPlugin.resource,
      requirementIds: [facts.selectedPluginRequirement.requirementId],
      dependencyRequirementIds: [],
    });
    expect(compiledResources.get(selections.selectedService.selectionId)).toEqual({
      kind: "compiled.resource-plan",
      selectionId: selections.selectedService.selectionId,
      providerId: fixture.providers.selectedService.id,
      resource: selections.selectedService.resource,
      requirementIds: [facts.selectedServiceRequirement.requirementId],
      dependencyRequirementIds: [],
    });

    expect(result.plan.workflowDispatchers).toEqual([
      {
        kind: "compiled.workflow-dispatcher-plan",
        descriptorId: facts.workflowDescriptor.descriptorId,
        appId: facts.workflowDescriptor.appId,
        pluginOwnerId: facts.workflowDescriptor.pluginOwnerId,
        role: facts.workflowDescriptor.role,
        surface: facts.workflowDescriptor.surface,
        capability: facts.workflowDescriptor.capability,
        workflowIds: facts.workflowDescriptor.workflowIds,
      },
    ]);
    expect(result.plan.executionPlans).toEqual([
      {
        kind: "compiled.execution-plan",
        ref: facts.asyncArchiveExecutionRef,
        policy: { interruptible: false },
      },
      {
        kind: "compiled.execution-plan",
        ref: facts.asyncExecutionRef,
        policy: { interruptible: true },
      },
    ]);
    expect(result.plan.executionRegistryInput).toEqual({
      kind: "compiled.execution-registry-input",
      boundaries: [
        {
          executionId: facts.asyncArchiveExecutionRef.executionId,
          ref: facts.asyncArchiveExecutionRef,
        },
        {
          executionId: facts.asyncExecutionRef.executionId,
          ref: facts.asyncExecutionRef,
        },
      ],
    });

    expect(result.plan.harnesses).toEqual([
      { kind: "compiled.harness-plan", harnessId: "harness.process" },
      { kind: "compiled.harness-plan", harnessId: "harness.profile" },
      { kind: "compiled.harness-plan", harnessId: "harness.shared" },
    ]);
    expect(result.plan.harnesses.map((harness) => Object.keys(harness).sort())).toEqual([
      ["harnessId", "kind"],
      ["harnessId", "kind"],
      ["harnessId", "kind"],
    ]);

    expect(fixture.input.graph.surfaceRuntimePlans).toContainEqual(facts.serverSurface);
    expect(fixture.input.graph.semanticDependencies).toContainEqual(
      facts.unrelatedSemanticDependency
    );
    expect(fixture.input.graph.resourceRequirements).toEqual(
      expect.arrayContaining([facts.unrelatedPluginRequirement, facts.unrelatedServiceRequirement])
    );
    expect(fixture.input.graph.workflowDispatcherDescriptors).toContainEqual(
      facts.unrelatedWorkflowDescriptor
    );
    expect(fixture.input.graph.executionDescriptorRefs).toContainEqual(facts.unrelatedExecutionRef);
    expect(fixture.input.graph.webRouteModuleRefs).toContainEqual(facts.unrelatedWebRouteRef);
    expect(
      result.plan.surfaces.some(({ surfacePlanId: id }) => id === facts.serverSurface.surfacePlanId)
    ).toBe(false);
    expect(
      result.plan.serviceBindings.some(
        ({ bindingId }) =>
          bindingId === facts.unrelatedRootBinding.bindingId ||
          bindingId === facts.unrelatedLeafBinding.bindingId
      )
    ).toBe(false);
    expect(
      result.plan.serviceBindings
        .flatMap(({ semanticDependencyIds }) => semanticDependencyIds)
        .includes(facts.unrelatedSemanticDependency.dependencyId)
    ).toBe(false);
    expect(
      result.plan.resourceRequirements.some(
        ({ requirementId }) =>
          requirementId === facts.unrelatedPluginRequirement.requirementId ||
          requirementId === facts.unrelatedServiceRequirement.requirementId
      )
    ).toBe(false);
    expect(
      result.plan.providerSelections.some(
        ({ selectionId }) => selectionId === selections.unrelatedServer.selectionId
      )
    ).toBe(false);
    expect(
      result.plan.compiledResources.some(
        ({ selectionId }) => selectionId === selections.unrelatedServer.selectionId
      )
    ).toBe(false);
    expect(
      result.plan.workflowDispatchers.some(
        ({ descriptorId }) => descriptorId === facts.unrelatedWorkflowDescriptor.descriptorId
      )
    ).toBe(false);
    expect(
      result.plan.executionPlans.some(
        ({ ref }) => ref.executionId === facts.unrelatedExecutionRef.executionId
      )
    ).toBe(false);
    expect(
      result.plan.executionRegistryInput.boundaries.some(
        ({ executionId }) => executionId === facts.unrelatedExecutionRef.executionId
      )
    ).toBe(false);
    expect(
      result.plan.surfaces
        .flatMap(({ webRouteModuleRefs }) => webRouteModuleRefs)
        .some(
          ({ ownerId, routeId, path }) =>
            ownerId === facts.unrelatedWebRouteRef.ownerId &&
            routeId === facts.unrelatedWebRouteRef.routeId &&
            path === facts.unrelatedWebRouteRef.path
        )
    ).toBe(false);

    const firstProviderSnapshot = result.references.providerEntries();
    const secondProviderSnapshot = result.references.providerEntries();
    expect(secondProviderSnapshot).toBe(firstProviderSnapshot);
    expect(Object.isFrozen(firstProviderSnapshot)).toBe(true);
    expect(firstProviderSnapshot.every((entry) => Object.isFrozen(entry))).toBe(true);
    expect(firstProviderSnapshot.map(([selectionId]) => selectionId)).toEqual(
      [selections.selectedPlugin.selectionId, selections.selectedService.selectionId].sort(
        compareStrings
      )
    );
    expect(result.references.getProvider(selections.selectedPlugin.selectionId)).toBe(
      fixture.providers.selectedPlugin
    );
    expect(result.references.getProvider(selections.selectedService.selectionId)).toBe(
      fixture.providers.selectedService
    );
    expect(new Map(firstProviderSnapshot).get(selections.selectedPlugin.selectionId)).toBe(
      fixture.providers.selectedPlugin
    );
    expect(new Map(firstProviderSnapshot).get(selections.selectedService.selectionId)).toBe(
      fixture.providers.selectedService
    );

    const firstServiceSnapshot = result.references.serviceEntries();
    const secondServiceSnapshot = result.references.serviceEntries();
    expect(secondServiceSnapshot).toBe(firstServiceSnapshot);
    expect(Object.isFrozen(firstServiceSnapshot)).toBe(true);
    expect(firstServiceSnapshot.every((entry) => Object.isFrozen(entry))).toBe(true);
    expect(firstServiceSnapshot.map(([bindingId]) => bindingId)).toEqual(
      [facts.selectedLeafBinding.bindingId, facts.selectedRootBinding.bindingId].sort(
        compareStrings
      )
    );
    expect(result.references.getService(facts.selectedLeafBinding.bindingId)).toBe(
      fixture.services.selectedLeaf
    );
    expect(result.references.getService(facts.selectedRootBinding.bindingId)).toBe(
      fixture.services.selectedRoot
    );
    expect(new Map(firstServiceSnapshot).get(facts.selectedLeafBinding.bindingId)).toBe(
      fixture.services.selectedLeaf
    );
    expect(new Map(firstServiceSnapshot).get(facts.selectedRootBinding.bindingId)).toBe(
      fixture.services.selectedRoot
    );
    expect(Object.isFrozen(fixture.providers.selectedPlugin)).toBe(false);
    expect(Object.isFrozen(fixture.providers.selectedService)).toBe(false);
    expect(Object.isFrozen(fixture.services.selectedLeaf)).toBe(false);
    expect(Object.isFrozen(fixture.services.selectedRoot)).toBe(false);

    expect(result.observationSeed).toEqual({
      kind: "compilation.observation-seed",
      identity: fixture.input.entrypoint.identity,
      profileId: fixture.input.entrypoint.profile.id,
      roles: ["async", "cli", "web"],
    });
    expect(fixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
  });

  test("deduplicates a harness id shared by the profile and selected process", () => {
    const fixture = makeProcessClosureFixture({ processHarness: "harness.shared" });
    const result = compileRuntimePlan(fixture.input);

    expect(fixture.input.graph.profile.harnesses).toEqual(["harness.profile", "harness.shared"]);
    expect(fixture.input.entrypoint.process.harness).toBe("harness.shared");
    expect(result.plan.harnesses).toEqual([
      { kind: "compiled.harness-plan", harnessId: "harness.profile" },
      { kind: "compiled.harness-plan", harnessId: "harness.shared" },
    ]);
    expect(fixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
  });

  test("keeps all sixteen exported DTO types exact and their schemas closed", () => {
    const processFixture = makeProcessClosureFixture();
    const providerFixture = makeProviderBranchFixture();
    const processResult = compileRuntimePlan(processFixture.input);
    const providerResult = compileRuntimePlan(providerFixture.input);
    const processSurface = processResult.plan.surfaces.find(
      (surface) => surface.resources.length > 0
    );
    const providerSurface = providerResult.plan.surfaces.find(
      (surface) => surface.resources.length > 0
    );

    const representatives = {
      bootgraphInput: providerResult.plan.bootgraphInput,
      compilationObservationSeed: processResult.observationSeed,
      compiledExecutableBoundaryInput: processResult.plan.executionRegistryInput.boundaries[0],
      compiledExecutionPlan: processResult.plan.executionPlans[0],
      compiledExecutionRegistryInput: processResult.plan.executionRegistryInput,
      compiledHarnessPlan: processResult.plan.harnesses[0],
      compiledProcessPlan: processResult.plan,
      compiledResourceBinding: providerSurface?.resources[0],
      compiledResourcePlan: providerResult.plan.compiledResources[0],
      compiledServiceBindingPlan: processResult.plan.serviceBindings[0],
      compiledSurfacePlan: processSurface,
      compiledWorkflowDispatcherPlan: processResult.plan.workflowDispatchers[0],
      providerDependencyClosure: providerResult.plan.providerDependencyGraph.closure[0],
      providerDependencyEdge: providerResult.plan.providerDependencyGraph.edges[0],
      providerDependencyGraph: providerResult.plan.providerDependencyGraph,
      providerDependencyNode: providerResult.plan.providerDependencyGraph.nodes[0],
    } as const;
    for (const [name, value] of Object.entries(representatives)) {
      expect({ name, exists: value !== undefined }).toEqual({ name, exists: true });
    }

    const schemaCases = [
      closedSchemaCase(
        "CompiledResourceBinding",
        CompiledResourceBindingSchema,
        representatives.compiledResourceBinding!,
        "requirementId"
      ),
      closedSchemaCase(
        "ProviderDependencyNode",
        ProviderDependencyNodeSchema,
        representatives.providerDependencyNode!,
        "selectionId"
      ),
      closedSchemaCase(
        "ProviderDependencyEdge",
        ProviderDependencyEdgeSchema,
        representatives.providerDependencyEdge!,
        "fromSelectionId"
      ),
      closedSchemaCase(
        "ProviderDependencyClosure",
        ProviderDependencyClosureSchema,
        representatives.providerDependencyClosure!,
        "selectionId"
      ),
      closedSchemaCase(
        "ProviderDependencyGraph",
        ProviderDependencyGraphSchema,
        representatives.providerDependencyGraph,
        "kind"
      ),
      closedSchemaCase(
        "CompiledResourcePlan",
        CompiledResourcePlanSchema,
        representatives.compiledResourcePlan!,
        "kind"
      ),
      closedSchemaCase(
        "CompiledServiceBindingPlan",
        CompiledServiceBindingPlanSchema,
        representatives.compiledServiceBindingPlan!,
        "kind"
      ),
      closedSchemaCase(
        "CompiledSurfacePlan",
        CompiledSurfacePlanSchema,
        representatives.compiledSurfacePlan!,
        "kind"
      ),
      closedSchemaCase(
        "CompiledWorkflowDispatcherPlan",
        CompiledWorkflowDispatcherPlanSchema,
        representatives.compiledWorkflowDispatcherPlan!,
        "kind"
      ),
      closedSchemaCase(
        "CompiledExecutionPlan",
        CompiledExecutionPlanSchema,
        representatives.compiledExecutionPlan!,
        "kind"
      ),
      closedSchemaCase(
        "CompiledExecutableBoundaryInput",
        CompiledExecutableBoundaryInputSchema,
        representatives.compiledExecutableBoundaryInput!,
        "executionId"
      ),
      closedSchemaCase(
        "CompiledExecutionRegistryInput",
        CompiledExecutionRegistryInputSchema,
        representatives.compiledExecutionRegistryInput,
        "kind"
      ),
      closedSchemaCase(
        "CompiledHarnessPlan",
        CompiledHarnessPlanSchema,
        representatives.compiledHarnessPlan!,
        "kind"
      ),
      closedSchemaCase(
        "BootgraphInput",
        BootgraphInputSchema,
        representatives.bootgraphInput,
        "kind"
      ),
      closedSchemaCase(
        "CompilationObservationSeed",
        CompilationObservationSeedSchema,
        representatives.compilationObservationSeed,
        "kind"
      ),
      closedSchemaCase(
        "CompiledProcessPlan",
        CompiledProcessPlanSchema,
        representatives.compiledProcessPlan,
        "kind"
      ),
    ] as const;

    expect(Object.keys(EXACT_COMPILER_DTO_TYPE_ORACLES)).toHaveLength(16);
    expect(Object.values(EXACT_COMPILER_DTO_TYPE_ORACLES).every(Boolean)).toBe(true);
    expect(Object.keys(DEEP_READONLY_COMPILER_DTO_TYPE_ORACLES)).toHaveLength(16);
    expect(Object.values(DEEP_READONLY_COMPILER_DTO_TYPE_ORACLES).every(Boolean)).toBe(true);
    expect(schemaCases).toHaveLength(16);
    for (const schemaCase of schemaCases) {
      const surplus = { ...schemaCase.value, forbiddenCompilerField: true };
      const missing = withoutOwnKey(schemaCase.value, schemaCase.requiredKey);
      const malformed = { ...schemaCase.value, [schemaCase.requiredKey]: null };

      expect({
        name: schemaCase.name,
        accepted: Check(schemaCase.schema, schemaCase.value),
      }).toEqual({ name: schemaCase.name, accepted: true });
      expect({ name: schemaCase.name, rejected: !Check(schemaCase.schema, surplus) }).toEqual({
        name: schemaCase.name,
        rejected: true,
      });
      expect({ name: schemaCase.name, rejected: !Check(schemaCase.schema, missing) }).toEqual({
        name: schemaCase.name,
        rejected: true,
      });
      expect({ name: schemaCase.name, rejected: !Check(schemaCase.schema, malformed) }).toEqual({
        name: schemaCase.name,
        rejected: true,
      });
    }
    expect(processFixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
    expect(providerFixture.counters()).toEqual({ projectCalls: 0 });
  });

  test("is deterministic across equivalent authored app, provider, plugin, and role orders", () => {
    const mixed = makeProcessClosureFixture({ authoredOrder: "mixed", configured: true });
    const reverse = makeProcessClosureFixture({ authoredOrder: "reverse", configured: true });

    expect(mixed.input.entrypoint.app.plugins.map(({ id }) => id)).not.toEqual(
      reverse.input.entrypoint.app.plugins.map(({ id }) => id)
    );
    expect(mixed.input.entrypoint.profile.providers.map(({ provider }) => provider.id)).not.toEqual(
      reverse.input.entrypoint.profile.providers.map(({ provider }) => provider.id)
    );
    expect(mixed.input.entrypoint.process.roles).not.toEqual(
      reverse.input.entrypoint.process.roles
    );
    expect(reverse.input.graph).toEqual(mixed.input.graph);

    const mixedResult = compileRuntimePlan(mixed.input);
    const reverseResult = compileRuntimePlan(reverse.input);

    expect(reverseResult.plan).toEqual(mixedResult.plan);
    expect(reverseResult.observationSeed).toEqual(mixedResult.observationSeed);
    expect(reverseResult.references).not.toBe(mixedResult.references);
    expect(reverseResult.references.providerEntries()[0]?.[1]).not.toBe(
      mixedResult.references.providerEntries()[0]?.[1]
    );
    expect(reverseResult.references.serviceEntries()[0]?.[1]).not.toBe(
      mixedResult.references.serviceEntries()[0]?.[1]
    );
    expect(mixed.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
    expect(reverse.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
  });

  test("returns fresh recursively frozen DTO trees without freezing cold references", () => {
    const firstFixture = makeProcessClosureFixture({ authoredOrder: "mixed", configured: true });
    const secondFixture = makeProcessClosureFixture({ authoredOrder: "reverse", configured: true });
    const providerFixture = makeProviderBranchFixture();
    const first = compileRuntimePlan(firstFixture.input);
    const second = compileRuntimePlan(secondFixture.input);
    const providerResult = compileRuntimePlan(providerFixture.input);

    expectStructurallyEqualButFresh(first.plan, second.plan);
    expectStructurallyEqualButFresh(first.observationSeed, second.observationSeed);
    expectRecursivelyFrozenWithoutAliases(first.plan);
    expectRecursivelyFrozenWithoutAliases(first.observationSeed);
    expectRecursivelyFrozenWithoutAliases(second.plan);
    expectRecursivelyFrozenWithoutAliases(second.observationSeed);
    expectRecursivelyFrozenWithoutAliases(providerResult.plan);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);

    const firstInputReferences = collectObjectReferences(firstFixture.input);
    const firstDtoReferences = collectObjectReferences({
      plan: first.plan,
      observationSeed: first.observationSeed,
    });
    expect(firstDtoReferences.size).toBeGreaterThan(20);
    for (const reference of firstDtoReferences) {
      expect(firstInputReferences.has(reference)).toBe(false);
    }
    const planReferences = collectObjectReferences(first.plan);
    const seedReferences = collectObjectReferences(first.observationSeed);
    for (const reference of seedReferences) expect(planReferences.has(reference)).toBe(false);
    const providerInputReferences = collectObjectReferences(providerFixture.input);
    const providerPlanReferences = collectObjectReferences(providerResult.plan);
    expect(providerPlanReferences.size).toBeGreaterThan(20);
    for (const reference of providerPlanReferences) {
      expect(providerInputReferences.has(reference)).toBe(false);
    }

    const forbiddenResultKey: ForbiddenCompilationResultKey | undefined = undefined;
    const forbiddenPlanKey: ForbiddenCompiledPlanKey | undefined = undefined;
    expect(forbiddenResultKey).toBeUndefined();
    expect(forbiddenPlanKey).toBeUndefined();
    expect(Object.keys(first)).toEqual(["plan", "references", "observationSeed"]);
    expect(first).not.toHaveProperty("findings");
    expect(first).not.toHaveProperty("diagnostics");
    expect(first.plan).not.toHaveProperty("findings");
    expect(first.plan).not.toHaveProperty("diagnostics");
    expect(first.plan).not.toHaveProperty("observationSeed");
    expect(runtimeCompiler).not.toHaveProperty("CompilationFinding");
    expect(Check(CompiledProcessPlanSchema, { ...first.plan, findings: [] })).toBe(false);
    expect(
      Check(CompiledProcessPlanSchema, { ...first.plan, observationSeed: first.observationSeed })
    ).toBe(false);

    expect(first.references.getProvider(firstFixture.selections.selectedPlugin.selectionId)).toBe(
      firstFixture.providers.selectedPlugin
    );
    expect(first.references.getService(firstFixture.facts.selectedRootBinding.bindingId)).toBe(
      firstFixture.services.selectedRoot
    );
    expect(Object.isFrozen(firstFixture.providers.selectedPlugin)).toBe(false);
    expect(Object.isFrozen(firstFixture.providers.selectedService)).toBe(false);
    expect(Object.isFrozen(firstFixture.services.selectedLeaf)).toBe(false);
    expect(Object.isFrozen(firstFixture.services.selectedRoot)).toBe(false);
    expect(firstFixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
    expect(secondFixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
    expect(providerFixture.counters()).toEqual({ projectCalls: 0 });
  });

  test("orders every plan and seed DTO collection by its exact behavior tuple", () => {
    const processFixture = makeProcessClosureFixture({ configured: true });
    const providerFixture = makeProviderBranchFixture();
    const processResult = compileRuntimePlan(processFixture.input);
    const providerResult = compileRuntimePlan(providerFixture.input);

    expectCompiledPlanOrder(processResult.plan);
    expectCompiledPlanOrder(providerResult.plan);
    expectCanonicalTupleOrder(processResult.observationSeed.roles, (role) => [role]);
    expectCanonicalTupleOrder(providerResult.observationSeed.roles, (role) => [role]);

    const configuredSelection = processResult.plan.providerSelections.find(
      (selection) => selection.configRef !== undefined
    );
    const configuredResource = processResult.plan.compiledResources.find(
      (resource) => resource.configRef !== undefined
    );
    expect(configuredSelection?.configRef).toBeDefined();
    expect(configuredResource?.configRef).toBeDefined();
    expect(processFixture.config.providerRef).toBeDefined();
    expectAuthoredOrder(
      configuredSelection!.configRef!.sources,
      processFixture.config.providerRef!.sources,
      (source) => [source.kind, source.key]
    );
    expectAuthoredOrder(
      configuredResource!.configRef!.sources,
      processFixture.config.providerRef!.sources,
      (source) => [source.kind, source.key]
    );
    expect(configuredSelection!.configRef!.sources.map(({ kind }) => kind)).not.toEqual(
      [...configuredSelection!.configRef!.sources]
        .sort((left, right) => compareStrings(left.kind, right.kind))
        .map(({ kind }) => kind)
    );

    expect(processResult.plan.roles.length).toBeGreaterThan(1);
    expect(processResult.plan.serviceBindings.length).toBeGreaterThan(1);
    expect(processResult.plan.surfaces.length).toBeGreaterThan(1);
    expect(processResult.plan.harnesses.length).toBeGreaterThan(1);
    expect(
      processResult.plan.surfaces.some(
        ({ executionDescriptorRefs }) => executionDescriptorRefs.length > 1
      )
    ).toBe(true);
    expect(processResult.plan.executionPlans.length).toBeGreaterThan(1);
    expect(processResult.plan.executionRegistryInput.boundaries.length).toBeGreaterThan(1);
    expect(providerResult.plan.resourceRequirements.length).toBeGreaterThan(1);
    expect(providerResult.plan.providerSelections.length).toBeGreaterThan(1);
    expect(providerResult.plan.providerDependencyGraph.nodes.length).toBeGreaterThan(1);
    expect(providerResult.plan.providerDependencyGraph.edges.length).toBeGreaterThan(1);
    expect(providerResult.plan.providerDependencyGraph.closure.length).toBeGreaterThan(1);
    expect(
      providerResult.plan.providerDependencyGraph.closure.some(
        ({ reachableSelectionIds }) => reachableSelectionIds.length > 1
      )
    ).toBe(true);
    expect(providerResult.plan.compiledResources.length).toBeGreaterThan(1);
    expect(providerResult.plan.surfaces[0]?.resources.length).toBeGreaterThan(1);
    expect(processFixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
    expect(providerFixture.counters()).toEqual({ projectCalls: 0 });
  });

  test("refuses malformed closed admission before result or downstream work", () => {
    const fixture = makeProcessClosureFixture({ configured: true });
    const closedAdmissionGraph = {
      ...fixture.input.graph,
      forbiddenCompilerInput: true,
    } as NormalizedAuthoringGraph;
    const refusalCases = [{ label: "closed admission", graph: closedAdmissionGraph }] as const;

    for (const refusalCase of refusalCases) {
      const input = {
        entrypoint: fixture.input.entrypoint,
        graph: refusalCase.graph,
      } satisfies RuntimeCompilationInput;
      const inputBefore = snapshotCompleteInput(input);
      let result: RuntimeCompilationResult | undefined;
      let thrown: unknown;
      try {
        result = compileRuntimePlan(input);
      } catch (error) {
        thrown = error;
      }

      expect({ label: refusalCase.label, typeError: thrown instanceof TypeError }).toEqual({
        label: refusalCase.label,
        typeError: true,
      });
      expect(result).toBeUndefined();
      expectCompleteInputUnchanged(input, inputBefore);
      expect(fixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
    }
  });

  test("refuses nonduplicate entrypoint and graph role disagreement", () => {
    const fixture = makeProcessClosureFixture();
    const processHarness = fixture.input.entrypoint.process.harness;
    const process = defineProcessCatalog({
      selected: {
        id: fixture.input.entrypoint.process.id,
        roles: ["web", "cli"] as const,
        ...(processHarness === undefined ? {} : { harness: processHarness }),
      },
    }).selected;
    const entrypoint = defineEntrypoint({
      id: fixture.input.entrypoint.id,
      app: fixture.input.entrypoint.app,
      profile: fixture.input.entrypoint.profile,
      process,
      identity: fixture.input.entrypoint.identity,
    });
    let result: ReturnType<typeof compileRuntimePlan> | undefined;

    expect(() => {
      result = compileRuntimePlan({ entrypoint, graph: fixture.input.graph });
    }).toThrow();
    expect(result).toBeUndefined();
    expect(fixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
  });

  test("refuses duplicate roles even when entrypoint and graph duplicates agree", () => {
    const fixture = makeProcessClosureFixture();
    const processHarness = fixture.input.entrypoint.process.harness;
    const process = defineProcessCatalog({
      selected: {
        id: fixture.input.entrypoint.process.id,
        roles: ["web", "async", "cli", "async"] as const,
        ...(processHarness === undefined ? {} : { harness: processHarness }),
      },
    }).selected;
    const entrypoint = defineEntrypoint({
      id: fixture.input.entrypoint.id,
      app: fixture.input.entrypoint.app,
      profile: fixture.input.entrypoint.profile,
      process,
      identity: fixture.input.entrypoint.identity,
    });
    const graph: NormalizedAuthoringGraph = {
      ...fixture.input.graph,
      topology: {
        ...fixture.input.graph.topology,
        roleRequirements: ["async", "async", "cli", "web"],
      },
    };
    let result: ReturnType<typeof compileRuntimePlan> | undefined;

    expect(() => {
      result = compileRuntimePlan({ entrypoint, graph });
    }).toThrow();
    expect(result).toBeUndefined();
    expect(fixture.counters()).toEqual(ZERO_PROCESS_CLOSURE_CALLS);
    const canonicalEntrypointRoles: readonly string[] = [...entrypoint.process.roles].sort(
      compareStrings
    );
    const agreeingGraphRoles: readonly string[] = [...graph.topology.roleRequirements];
    expect(canonicalEntrypointRoles).toEqual(agreeingGraphRoles);
  });

  test("matches required and optional branches through the exact provider fixed point", () => {
    const fixture = makeProviderBranchFixture();
    const result = compileRuntimePlan(fixture.input);
    const { requirementIds, selectionIds } = fixture;

    const findingsByRequirement = new Map(
      fixture.input.graph.findings.map((finding) => [finding.requirementId, finding] as const)
    );
    expect(findingsByRequirement.size).toBe(2);
    expect(findingsByRequirement.get(requirementIds.directMissingOptional)).toEqual({
      kind: "derivation.finding",
      code: "provider-selection.optional-missing",
      requirementId: requirementIds.directMissingOptional,
      resource: fixture.resources.directOptional,
    });
    expect(findingsByRequirement.get(requirementIds.aMissingOptional)).toEqual({
      kind: "derivation.finding",
      code: "provider-selection.optional-missing",
      requirementId: requirementIds.aMissingOptional,
      resource: fixture.resources.providerOptional,
    });

    const expectedRequirementIds = new Set([
      requirementIds.directRequired,
      requirementIds.directCompetingA,
      requirementIds.directSelectedOptional,
      requirementIds.directMissingOptional,
      requirementIds.aRequiresB,
      requirementIds.aMissingOptional,
      requirementIds.bRequiresC,
    ]);
    const graphRequirementIds = new Set(
      fixture.input.graph.resourceRequirements.map(({ requirementId }) => requirementId)
    );
    const planRequirements = new Map(
      result.plan.resourceRequirements.map(
        (requirement) => [requirement.requirementId, requirement] as const
      )
    );
    expect(fixture.input.graph.resourceRequirements).toHaveLength(expectedRequirementIds.size);
    expect(result.plan.resourceRequirements).toHaveLength(expectedRequirementIds.size);
    expect(graphRequirementIds).toEqual(expectedRequirementIds);
    expect(new Set(planRequirements.keys())).toEqual(expectedRequirementIds);

    const expectedSelectionIds = new Set([
      selectionIds.a,
      selectionIds.competingA,
      selectionIds.b,
      selectionIds.c,
      selectionIds.selectedOptional,
    ]);
    const graphSelectionIds = new Set(
      fixture.input.graph.profile.providerSelections.map(({ selectionId }) => selectionId)
    );
    const planSelections = new Map(
      result.plan.providerSelections.map((selection) => [selection.selectionId, selection] as const)
    );
    expect(fixture.input.graph.profile.providerSelections).toHaveLength(expectedSelectionIds.size);
    expect(result.plan.providerSelections).toHaveLength(expectedSelectionIds.size);
    expect(graphSelectionIds).toEqual(expectedSelectionIds);
    expect(new Set(planSelections.keys())).toEqual(expectedSelectionIds);
    const resourceASelections = [...planSelections.values()].filter(
      ({ resource }) => resource.resourceId === fixture.resources.a.resourceId
    );
    expect(resourceASelections).toHaveLength(2);
    expect(
      new Map(
        resourceASelections.map(
          (selection) =>
            [
              selection.resource.instance,
              { selectionId: selection.selectionId, providerId: selection.providerId },
            ] as const
        )
      )
    ).toEqual(
      new Map([
        [
          fixture.resources.a.instance,
          { selectionId: selectionIds.a, providerId: fixture.providers.a.id },
        ],
        [
          fixture.resources.competingA.instance,
          {
            selectionId: selectionIds.competingA,
            providerId: fixture.providers.competingA.id,
          },
        ],
      ])
    );

    expect(result.plan.surfaces).toHaveLength(1);
    const surfaceBindings = new Map(
      result.plan.surfaces[0]!.resources.map(
        (binding) => [binding.requirementId, binding.selectionId] as const
      )
    );
    expect(surfaceBindings.size).toBe(3);
    expect(surfaceBindings.get(requirementIds.directRequired)).toBe(selectionIds.a);
    expect(surfaceBindings.get(requirementIds.directCompetingA)).toBe(selectionIds.competingA);
    expect(surfaceBindings.get(requirementIds.directSelectedOptional)).toBe(
      selectionIds.selectedOptional
    );

    const providerNodes = new Map(
      result.plan.providerDependencyGraph.nodes.map((node) => [node.selectionId, node] as const)
    );
    expect(result.plan.providerDependencyGraph.nodes).toHaveLength(expectedSelectionIds.size);
    expect(new Set(providerNodes.keys())).toEqual(expectedSelectionIds);
    expect(providerNodes.get(selectionIds.a)).toEqual({
      selectionId: selectionIds.a,
      providerId: fixture.providers.a.id,
      resource: fixture.resources.a,
    });
    expect(providerNodes.get(selectionIds.competingA)).toEqual({
      selectionId: selectionIds.competingA,
      providerId: fixture.providers.competingA.id,
      resource: fixture.resources.competingA,
    });
    expect(providerNodes.get(selectionIds.b)).toEqual({
      selectionId: selectionIds.b,
      providerId: fixture.providers.b.id,
      resource: fixture.resources.b,
    });
    expect(providerNodes.get(selectionIds.c)).toEqual({
      selectionId: selectionIds.c,
      providerId: fixture.providers.c.id,
      resource: fixture.resources.c,
    });
    expect(providerNodes.get(selectionIds.selectedOptional)).toEqual({
      selectionId: selectionIds.selectedOptional,
      providerId: fixture.providers.selectedOptionalProvider.id,
      resource: fixture.resources.selectedOptional,
    });

    const providerEdges = new Map(
      result.plan.providerDependencyGraph.edges.map((edge) => [edge.requirementId, edge] as const)
    );
    expect(result.plan.providerDependencyGraph.edges).toHaveLength(2);
    expect(new Set(providerEdges.keys())).toEqual(
      new Set([requirementIds.aRequiresB, requirementIds.bRequiresC])
    );
    expect(providerEdges.get(requirementIds.aRequiresB)).toEqual({
      fromSelectionId: selectionIds.a,
      requirementId: requirementIds.aRequiresB,
      toSelectionId: selectionIds.b,
    });
    expect(providerEdges.get(requirementIds.bRequiresC)).toEqual({
      fromSelectionId: selectionIds.b,
      requirementId: requirementIds.bRequiresC,
      toSelectionId: selectionIds.c,
    });

    const providerClosure = new Map(
      result.plan.providerDependencyGraph.closure.map(
        ({ selectionId, reachableSelectionIds }) =>
          [selectionId, new Set(reachableSelectionIds)] as const
      )
    );
    expect(result.plan.providerDependencyGraph.closure).toHaveLength(expectedSelectionIds.size);
    expect(new Set(providerClosure.keys())).toEqual(expectedSelectionIds);
    expect(providerClosure.get(selectionIds.a)).toEqual(new Set([selectionIds.b, selectionIds.c]));
    expect(providerClosure.get(selectionIds.competingA)).toEqual(new Set());
    expect(providerClosure.get(selectionIds.b)).toEqual(new Set([selectionIds.c]));
    expect(providerClosure.get(selectionIds.c)).toEqual(new Set());
    expect(providerClosure.get(selectionIds.selectedOptional)).toEqual(new Set());

    expect(result.plan.bootgraphInput.kind).toBe("bootgraph.input");
    expect(result.plan.bootgraphInput.nodes).toHaveLength(expectedSelectionIds.size);
    expect(result.plan.bootgraphInput.edges).toHaveLength(2);
    expect(new Set(result.plan.bootgraphInput.nodes.map(({ selectionId }) => selectionId))).toEqual(
      expectedSelectionIds
    );
    expect(
      new Set(result.plan.bootgraphInput.edges.map(({ requirementId }) => requirementId))
    ).toEqual(new Set([requirementIds.aRequiresB, requirementIds.bRequiresC]));

    const providerEntries = result.references.providerEntries();
    const providerReferences = new Map(
      providerEntries.map(([selectionId, provider]) => [selectionId, provider.id] as const)
    );
    expect(providerEntries).toHaveLength(expectedSelectionIds.size);
    expect(providerReferences).toEqual(
      new Map([
        [selectionIds.a, fixture.providers.a.id],
        [selectionIds.competingA, fixture.providers.competingA.id],
        [selectionIds.b, fixture.providers.b.id],
        [selectionIds.c, fixture.providers.c.id],
        [selectionIds.selectedOptional, fixture.providers.selectedOptionalProvider.id],
      ])
    );

    const resourcePlans = new Map(
      result.plan.compiledResources.map((plan) => [plan.selectionId, plan] as const)
    );
    const expectedResourcePlans = new Map([
      [
        selectionIds.a,
        {
          resource: fixture.resources.a,
          requirementIds: new Set([requirementIds.directRequired]),
          dependencyRequirementIds: new Set([
            requirementIds.aMissingOptional,
            requirementIds.aRequiresB,
          ]),
        },
      ],
      [
        selectionIds.competingA,
        {
          resource: fixture.resources.competingA,
          requirementIds: new Set([requirementIds.directCompetingA]),
          dependencyRequirementIds: new Set<string>(),
        },
      ],
      [
        selectionIds.b,
        {
          resource: fixture.resources.b,
          requirementIds: new Set([requirementIds.aRequiresB]),
          dependencyRequirementIds: new Set([requirementIds.bRequiresC]),
        },
      ],
      [
        selectionIds.c,
        {
          resource: fixture.resources.c,
          requirementIds: new Set([requirementIds.bRequiresC]),
          dependencyRequirementIds: new Set<string>(),
        },
      ],
      [
        selectionIds.selectedOptional,
        {
          resource: fixture.resources.selectedOptional,
          requirementIds: new Set([requirementIds.directSelectedOptional]),
          dependencyRequirementIds: new Set<string>(),
        },
      ],
    ]);
    expect(result.plan.compiledResources).toHaveLength(expectedSelectionIds.size);
    expect(new Set(resourcePlans.keys())).toEqual(expectedSelectionIds);
    for (const [selectionId, expected] of expectedResourcePlans) {
      const plan = resourcePlans.get(selectionId);
      expect(plan?.resource).toEqual(expected.resource);
      expect(new Set(plan?.requirementIds)).toEqual(expected.requirementIds);
      expect(new Set(plan?.dependencyRequirementIds)).toEqual(expected.dependencyRequirementIds);
    }

    const missingRequirementIds = [
      requirementIds.directMissingOptional,
      requirementIds.aMissingOptional,
    ];
    const missingResourceIds = [
      fixture.resources.directOptional.resourceId,
      fixture.resources.providerOptional.resourceId,
    ];
    expect(planRequirements.has(requirementIds.directMissingOptional)).toBe(true);
    expect(planRequirements.has(requirementIds.aMissingOptional)).toBe(true);
    expect(
      result.plan.surfaces
        .flatMap(({ resources }) => resources)
        .some(({ requirementId }) => missingRequirementIds.includes(requirementId))
    ).toBe(false);
    expect(
      result.plan.serviceBindings
        .flatMap(({ resources }) => resources)
        .some(({ requirementId }) => missingRequirementIds.includes(requirementId))
    ).toBe(false);
    expect(
      result.plan.providerDependencyGraph.nodes.some(({ resource }) =>
        missingResourceIds.includes(resource.resourceId)
      )
    ).toBe(false);
    expect(
      result.plan.providerSelections.some(({ resource }) =>
        missingResourceIds.includes(resource.resourceId)
      )
    ).toBe(false);
    expect(
      result.plan.providerDependencyGraph.edges.some(({ requirementId }) =>
        missingRequirementIds.includes(requirementId)
      )
    ).toBe(false);
    expect(
      result.plan.compiledResources.some(({ resource }) =>
        missingResourceIds.includes(resource.resourceId)
      )
    ).toBe(false);
    expect(
      providerEntries.some(([, provider]) => missingResourceIds.includes(provider.provides.id))
    ).toBe(false);
    expect(result).not.toHaveProperty("findings");
    expect(result.plan).not.toHaveProperty("findings");
    expect(fixture.counters()).toEqual({ projectCalls: 0 });
  });

  test("refuses a reason-only disagreement in the cold provider handoff", () => {
    const fixture = makeProviderBranchFixture();
    const driftedProviderA = defineRuntimeProvider({
      id: fixture.providers.a.id,
      title: fixture.providers.a.title,
      provides: fixture.providers.a.provides,
      requires: fixture.providers.a.requires.map((requirement) =>
        requirement.resource.id === fixture.providers.b.provides.id
          ? requireResource({ ...requirement, reason: "A requires B after drift" })
          : requirement
      ),
    });
    const providers = fixture.authoredSelections.map((selection) =>
      selection.provider.id === fixture.providers.a.id
        ? replaceAuthoredProvider(selection, driftedProviderA)
        : selection
    );
    const entrypoint = replaceEntrypointProviders(fixture.input.entrypoint, providers);

    expectCompilerRefusal({ entrypoint, graph: fixture.input.graph }, fixture.counters);
  });

  test("refuses an instance disagreement in the cold authored provider selection", () => {
    const fixture = makeProviderBranchFixture();
    const providers = fixture.authoredSelections.map((selection) =>
      selection.provider.id === fixture.providers.a.id
        ? providerSelection({
            resource: selection.resource,
            provider: selection.provider,
            instance: "tenant-drift",
          })
        : selection
    );
    const entrypoint = replaceEntrypointProviders(fixture.input.entrypoint, providers);

    expectCompilerRefusal({ entrypoint, graph: fixture.input.graph }, fixture.counters);
  });

  test("refuses a selected optional branch with a spurious missing finding", () => {
    const fixture = makeProviderBranchFixture();
    const spuriousFinding: NormalizedAuthoringGraph["findings"][number] = {
      kind: "derivation.finding",
      code: "provider-selection.optional-missing",
      requirementId: fixture.requirementIds.directSelectedOptional,
      resource: fixture.resources.selectedOptional,
    };
    const graph: NormalizedAuthoringGraph = {
      ...fixture.input.graph,
      findings: sortFindings([...fixture.input.graph.findings, spuriousFinding]),
    };

    expectCompilerRefusal({ entrypoint: fixture.input.entrypoint, graph }, fixture.counters);
  });

  test("refuses a missing finding whose resource identity disagrees", () => {
    const fixture = makeProviderBranchFixture();
    const graph: NormalizedAuthoringGraph = {
      ...fixture.input.graph,
      findings: sortFindings(
        fixture.input.graph.findings.map((finding) =>
          finding.requirementId === fixture.requirementIds.directMissingOptional
            ? { ...finding, resource: fixture.resources.providerOptional }
            : finding
        )
      ),
    };

    expectCompilerRefusal({ entrypoint: fixture.input.entrypoint, graph }, fixture.counters);
  });

  const missingFindingCases = [
    ["direct optional", "directMissingOptional"],
    ["provider-owned optional", "aMissingOptional"],
  ] as const;
  for (const [label, branch] of missingFindingCases) {
    test(`refuses a missing derivation finding for the ${label} branch`, () => {
      const fixture = makeProviderBranchFixture();
      const graph: NormalizedAuthoringGraph = {
        ...fixture.input.graph,
        findings: fixture.input.graph.findings.filter(
          ({ requirementId }) => requirementId !== fixture.requirementIds[branch]
        ),
      };

      expectCompilerRefusal({ entrypoint: fixture.input.entrypoint, graph }, fixture.counters);
    });
  }

  test("refuses a dangling required provider dependency", () => {
    const fixture = makeProviderBranchFixture();
    const providers = fixture.authoredSelections.filter(
      ({ provider }) => provider.id !== fixture.providers.c.id
    );
    const entrypoint = replaceEntrypointProviders(fixture.input.entrypoint, providers);
    const graph: NormalizedAuthoringGraph = {
      ...fixture.input.graph,
      profile: {
        ...fixture.input.graph.profile,
        providerSelections: fixture.input.graph.profile.providerSelections.filter(
          ({ providerId }) => providerId !== fixture.providers.c.id
        ),
      },
    };

    expectCompilerRefusal({ entrypoint, graph }, fixture.counters);
  });

  for (const cycle of ["self", "transitive"] as const) {
    test(`refuses a provider ${cycle} cycle`, () => {
      const fixture = makeProviderBranchFixture({ cycle });

      expectCompilerRefusal(fixture.input, fixture.counters);
    });
  }
});
