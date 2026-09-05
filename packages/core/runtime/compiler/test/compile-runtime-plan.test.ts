import { expect, test } from "bun:test";
import { type TSchema } from "typebox";
import { Check } from "typebox/value";
import { executionDescriptorRefTuple } from "../../derivation/src/execution-descriptor-ref";
import { readRuntimeDerivationHandoff } from "../../derivation/src/index";
import * as C from "../src/index";
import {
  DEEP_READONLY_COMPILER_DTO_TYPE_ORACLES,
  EXACT_COMPILER_DTO_TYPE_ORACLES,
} from "./dto-types";
import { produceHandoff, zeroCalls } from "./helpers/handoff-fixture";

function order<T>(values: readonly T[], tuple: (value: T) => readonly string[]): void {
  const tuples = values.map(tuple);
  const compare = (a: readonly string[], b: readonly string[]) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] ?? "") < (b[i] ?? "")) return -1;
      if ((a[i] ?? "") > (b[i] ?? "")) return 1;
    }
    return 0;
  };
  expect(tuples).toEqual([...tuples].sort(compare));
  expect(new Set(tuples.map((x) => JSON.stringify(x))).size).toBe(tuples.length);
}

function fresh(left: unknown, right: unknown): void {
  expect(left).toEqual(right);
  if (left === null || typeof left !== "object") return;
  expect(left).not.toBe(right);
  expect(Object.isFrozen(left)).toBe(true);
  for (const key of Object.keys(left))
    fresh(Reflect.get(left, key), Reflect.get(right as object, key));
}

test("sixteen DTO types remain exact, deeply readonly and closed", () => {
  const { plan, observationSeed } = C.compileRuntimePlan({
    derivation: produceHandoff().derivation,
  });
  const cases: readonly [TSchema, object, string][] = [
    [C.BootgraphInputSchema, plan.bootgraphInput, "kind"],
    [C.CompilationObservationSeedSchema, observationSeed, "kind"],
    [
      C.CompiledExecutableBoundaryInputSchema,
      plan.executionRegistryInput.boundaries[0]!,
      "executionId",
    ],
    [C.CompiledExecutionPlanSchema, plan.executionPlans[0]!, "kind"],
    [C.CompiledExecutionRegistryInputSchema, plan.executionRegistryInput, "kind"],
    [C.CompiledHarnessPlanSchema, plan.harnesses[0]!, "kind"],
    [C.CompiledProcessPlanSchema, plan, "kind"],
    [
      C.CompiledResourceBindingSchema,
      plan.serviceBindings.find((b) => b.resources.length)!.resources[0]!,
      "requirementId",
    ],
    [C.CompiledResourcePlanSchema, plan.compiledResources[0]!, "kind"],
    [C.CompiledServiceBindingPlanSchema, plan.serviceBindings[0]!, "kind"],
    [C.CompiledSurfacePlanSchema, plan.surfaces[0]!, "kind"],
    [C.CompiledWorkflowDispatcherPlanSchema, plan.workflowDispatchers[0]!, "kind"],
    [C.ProviderDependencyClosureSchema, plan.providerDependencyGraph.closure[0]!, "selectionId"],
    [C.ProviderDependencyEdgeSchema, plan.providerDependencyGraph.edges[0]!, "fromSelectionId"],
    [C.ProviderDependencyGraphSchema, plan.providerDependencyGraph, "kind"],
    [C.ProviderDependencyNodeSchema, plan.providerDependencyGraph.nodes[0]!, "selectionId"],
  ];
  expect(Object.values(EXACT_COMPILER_DTO_TYPE_ORACLES)).toEqual(Array(16).fill(true));
  expect(Object.values(DEEP_READONLY_COMPILER_DTO_TYPE_ORACLES)).toEqual(Array(16).fill(true));
  for (const [schema, value, key] of cases) {
    expect(value).toBeDefined();
    expect(Check(schema, value)).toBe(true);
    expect(Check(schema, { ...value, forbidden: true })).toBe(false);
    const missing = { ...value };
    Reflect.deleteProperty(missing, key);
    expect(Check(schema, missing)).toBe(false);
    expect(Check(schema, { ...value, [key]: null })).toBe(false);
  }
  const parent = plan.serviceBindings.find((b) => b.serviceId === "parent")!;
  expect(parent.serviceDependencies.map((s) => s.localName)).toEqual(["left", "right"]);
  expect(parent.semanticDependencies[0]).toMatchObject({
    serviceId: "parent",
    localName: "audit",
    adapterId: "audit.native",
  });
  expect(
    plan.surfaces.find((s) => s.role === "server")!.serviceBindings.map((s) => s.localName)
  ).toEqual(["alias", "primary"]);
  expect(parent).not.toHaveProperty("serviceBindingIds");
  expect(parent).not.toHaveProperty("semanticDependencyIds");
  expect(plan.configSources.map((s) => s.kind)).toEqual(["file", "env", "test"]);
});

test("cold result channels and every DTO collection follow canonical order", () => {
  const { derivation, counters } = produceHandoff();
  const result = C.compileRuntimePlan({ derivation });
  const p = result.plan;
  expect(Object.keys(result).sort()).toEqual(["observationSeed", "plan", "references"]);
  expect(C).not.toHaveProperty("CompilationFinding");
  expect(p).not.toHaveProperty("findings");
  expect(p).not.toHaveProperty("observationSeed");
  order(p.roles, (x) => [x]);
  order(p.resourceRequirements, (x) => [x.requirementId]);
  order(p.providerSelections, (x) => [x.selectionId]);
  order(p.compiledResources, (x) => [x.selectionId]);
  order(p.serviceBindings, (x) => [x.bindingId]);
  order(p.surfaces, (x) => [x.surfacePlanId]);
  order(p.workflowDispatchers, (x) => [x.descriptorId]);
  order(p.executionPlans, (x) => executionDescriptorRefTuple(x.ref));
  order(p.executionRegistryInput.boundaries, (x) => executionDescriptorRefTuple(x.ref));
  order(p.harnesses, (x) => [x.harnessId]);
  order(p.providerDependencyGraph.nodes, (x) => [x.selectionId]);
  order(p.providerDependencyGraph.edges, (x) => [
    x.fromSelectionId,
    x.requirementId,
    x.toSelectionId,
  ]);
  order(p.providerDependencyGraph.closure, (x) => [x.selectionId]);
  for (const c of p.providerDependencyGraph.closure) order(c.reachableSelectionIds, (x) => [x]);
  for (const r of p.compiledResources) {
    order(r.requirementIds, (x) => [x]);
    order(r.dependencyRequirementIds, (x) => [x]);
  }
  for (const s of p.serviceBindings) {
    order(s.serviceDependencies, (x) => [x.localName]);
    order(s.semanticDependencies, (x) => [x.dependencyId]);
    order(s.resources, (x) => [x.requirementId, x.selectionId]);
  }
  for (const s of p.surfaces) {
    order(s.serviceBindings, (x) => [x.localName]);
    order(s.executionDescriptorRefs, executionDescriptorRefTuple);
    order(s.webRouteModuleRefs, (x) => [x.ownerId, x.routeId, x.path]);
    order(s.workflowDispatcherIds, (x) => [x]);
    order(s.resources, (x) => [x.requirementId, x.selectionId]);
  }
  expect(p.bootgraphInput.nodes).toEqual(p.providerDependencyGraph.nodes);
  expect(p.bootgraphInput.edges).toEqual(p.providerDependencyGraph.edges);
  expect(p.harnesses.map((h) => h.harnessId)).toEqual(["base", "shared"]);
  expect(counters).toEqual(zeroCalls);
});

test("fresh frozen DTOs neither mutate input nor deep-freeze cold references", () => {
  const { derivation, counters } = produceHandoff();
  const before = JSON.stringify(derivation.graph);
  const handoff = readRuntimeDerivationHandoff(derivation);
  const a = C.compileRuntimePlan({ derivation }),
    b = C.compileRuntimePlan({ derivation });
  fresh(a.plan, b.plan);
  fresh(a.observationSeed, b.observationSeed);
  expect(JSON.stringify(derivation.graph)).toBe(before);
  expect(a.plan.identity).not.toBe(handoff.identity);
  expect(a.plan.configSources).not.toBe(derivation.graph.profile.configSources);
  for (const [id, p] of handoff.providers) {
    expect(a.references.getProvider(id)).toBe(p);
    expect(Object.isFrozen(p.build)).toBe(false);
  }
  for (const [id, s] of handoff.services) {
    expect(a.references.getService(id)).toBe(s);
    expect(Object.isFrozen(s.construct)).toBe(false);
    expect(Object.isFrozen(s.contract)).toBe(false);
  }
  expect(Object.isFrozen(a.references.providerEntries())).toBe(true);
  expect(Object.isFrozen(a.references.providerEntries()[0])).toBe(true);
  expect(() => a.references.getProvider("missing")).toThrow(TypeError);
  expect(() => a.references.getService("missing")).toThrow(TypeError);
  expect(counters).toEqual(zeroCalls);
});

test("authored reordering is stable; named slot swaps alter parent identity while equal aliases reuse", () => {
  const a = C.compileRuntimePlan({ derivation: produceHandoff().derivation });
  const b = C.compileRuntimePlan({ derivation: produceHandoff({ reverse: true }).derivation });
  expect(a.plan).toEqual(b.plan);
  const swapped = C.compileRuntimePlan({ derivation: produceHandoff({ swap: true }).derivation });
  const parent = a.plan.serviceBindings.find((s) => s.serviceId === "parent")!,
    changed = swapped.plan.serviceBindings.find((s) => s.serviceId === "parent")!;
  expect(parent.bindingId).not.toBe(changed.bindingId);
  expect(parent.serviceDependencies.map((s) => s.bindingId)).toEqual(
    changed.serviceDependencies.map((s) => s.bindingId).reverse()
  );
  expect(
    a.plan.serviceBindings.filter((s) => s.serviceId === "child").map((s) => s.bindingId)
  ).toEqual(
    swapped.plan.serviceBindings.filter((s) => s.serviceId === "child").map((s) => s.bindingId)
  );
  const api = a.plan.surfaces.find((s) => s.role === "server")!;
  expect(api.serviceBindings[0]!.bindingId).toBe(api.serviceBindings[1]!.bindingId);
});
