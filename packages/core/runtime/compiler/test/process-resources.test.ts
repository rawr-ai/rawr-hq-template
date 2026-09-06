import { expect, test } from "bun:test";

import {
  processResourceFixture,
  zeroProcessResourceCalls,
} from "../../derivation/test/helpers/process-resource-fixture";
import { compileRuntimePlan } from "../src/compile-runtime-plan";
import { readRuntimeCompilationResourceReferences } from "../src/runtime-compilation-reference-table";
import { alterHandoff } from "./helpers/handoff-fixture";

test("process roots reuse exact resource references, source policy and the ordinary provider bootgraph", () => {
  const fixture = processResourceFixture();
  const compiled = compileRuntimePlan({ derivation: fixture.derive() });
  expect(compiled.plan.compiledResources).toHaveLength(3);
  expect(compiled.plan.bootgraphInput.nodes).toHaveLength(3);
  expect(compiled.plan.bootgraphInput.edges).toHaveLength(2);
  expect(compiled.plan.serviceBindings).toEqual([]);
  expect(compiled.plan.surfaces[0]?.resources).toEqual([]);
  const selections = compiled.plan.compiledResources.filter(
    ({ resource }) => resource.resourceId === fixture.resource.id
  );
  expect(selections.map(({ resource }) => resource.instance).sort()).toEqual([
    "primary",
    "secondary",
  ]);
  for (const selection of selections) {
    expect(compiled.references.getProvider(selection.selectionId)).toBe(fixture.provider);
    expect(selection.configRef?.key).toBe(`${selection.resource.instance}.config`);
  }
  const references = readRuntimeCompilationResourceReferences(compiled.references);
  expect(references.some(([, requirement]) => requirement === fixture.primary)).toBe(true);
  expect(references.some(([, requirement]) => requirement === fixture.secondary)).toBe(true);
  expect(references.some(([, requirement]) => requirement === fixture.dependencyRequirement)).toBe(
    true
  );
  expect(references.some(([, requirement]) => requirement === fixture.sibling)).toBe(false);
  expect(compiled.plan).toEqual(
    compileRuntimePlan({ derivation: processResourceFixture({ reverse: true }).derive() }).plan
  );
  expect(fixture.calls).toEqual(zeroProcessResourceCalls);
});

test("absent and unselected process roots add neither supply nor dependency obligations", () => {
  const inactive = processResourceFixture({ roots: "none" });
  const absent = processResourceFixture({ roots: "primary", missing: true, optional: true });
  for (const fixture of [inactive, absent]) {
    const compiled = compileRuntimePlan({ derivation: fixture.derive() });
    expect(compiled.plan.compiledResources).toEqual([]);
    expect(compiled.plan.bootgraphInput).toEqual({ kind: "bootgraph.input", nodes: [], edges: [] });
    expect(compiled.references.providerEntries()).toEqual([]);
    expect(fixture.calls).toEqual(zeroProcessResourceCalls);
  }
});

for (const corruption of [
  "other process",
  "missing topology root",
  "missing cold reference",
  "changed cold requirement",
  "copied resource identity",
  "plugin access leak",
] as const) {
  test(`compiler refuses process-root ${corruption} before any live work`, () => {
    const fixture = processResourceFixture({ roots: "primary" });
    const derived = fixture.derive();
    const root = derived.graph.resourceRequirements.find(({ owner }) => owner.kind === "process");
    if (root === undefined) throw new Error("Expected a process root.");
    const changed = alterHandoff(derived, (handoff) => {
      switch (corruption) {
        case "other process": {
          const identity = { ...handoff.identity, process: "other-process" };
          return {
            ...handoff,
            identity,
            graph: {
              ...handoff.graph,
              topology: { ...handoff.graph.topology, identity },
            },
          };
        }
        case "missing topology root":
          return {
            ...handoff,
            graph: {
              ...handoff.graph,
              topology: {
                ...handoff.graph.topology,
                edges: handoff.graph.topology.edges.filter(
                  ({ kind }) => kind !== "process.resource"
                ),
              },
            },
          };
        case "missing cold reference":
          return {
            ...handoff,
            resourceReferences: handoff.resourceReferences.filter(
              ([id]) => id !== root.requirementId
            ),
          };
        case "changed cold requirement":
        case "copied resource identity":
          return {
            ...handoff,
            resourceReferences: handoff.resourceReferences.map(
              ([id, requirement]) =>
                [
                  id,
                  id !== root.requirementId
                    ? requirement
                    : corruption === "changed cold requirement"
                      ? { ...requirement, reason: "Different requirement" }
                      : { ...requirement, resource: { ...requirement.resource } },
                ] as const
            ),
          };
        case "plugin access leak":
          return {
            ...handoff,
            graph: {
              ...handoff.graph,
              plugins: handoff.graph.plugins.map((plugin) => ({
                ...plugin,
                resourceRequirementIds: [root.requirementId],
              })),
              surfaceRuntimePlans: handoff.graph.surfaceRuntimePlans.map((surface) => ({
                ...surface,
                resourceRequirementIds: [root.requirementId],
              })),
            },
          };
      }
    });
    expect(() => compileRuntimePlan({ derivation: changed })).toThrow(TypeError);
    expect(fixture.calls).toEqual(zeroProcessResourceCalls);
  });
}
