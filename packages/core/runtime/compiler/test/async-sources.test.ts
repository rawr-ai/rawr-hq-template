import { expect, test } from "bun:test";

import { readRuntimeDerivationHandoff } from "../../derivation/src/index";
import { asyncSourceFixture } from "../../derivation/test/helpers/async-source-fixture";
import { compileRuntimePlan, readRuntimeCompilationAsyncSources } from "../src/index";
import { alterHandoff } from "./helpers/handoff-fixture";

test("compilation keeps exact selected native async source identity without producer rediscovery", () => {
  const { derivation, calls } = (() => {
    const fixture = asyncSourceFixture();
    return { derivation: fixture.derivation, calls: fixture.calls };
  })();
  const expected = readRuntimeDerivationHandoff(derivation).asyncSources;
  const compiled = compileRuntimePlan({ derivation });
  const sources = readRuntimeCompilationAsyncSources(compiled.references);
  expect(sources).toHaveLength(3);
  sources.forEach(([id, source], index) => {
    expect(id).toBe(expected[index]![0]);
    expect(source).toBe(expected[index]![1]);
    const surface = compiled.plan.surfaces.find((item) => item.surfacePlanId === id);
    expect(surface?.surface).toBe(source.kind);
    for (const declaration of source.declarations) {
      for (const [, ref] of declaration.descriptorReferences) {
        expect(
          compiled.plan.executionPlans.find(
            (execution) => execution.ref.executionId === ref.executionId
          )
        ).toBeDefined();
      }
    }
  });
  expect(Object.isFrozen(sources)).toBe(true);
  expect(sources.every(Object.isFrozen)).toBe(true);
  expect(Object.keys(compiled.references)).not.toContain("asyncSources");
  expect(JSON.stringify(compiled)).not.toContain("descriptorReferences");
  expect(JSON.stringify(compiled)).not.toContain("shared/event");
  expect(JSON.stringify(compiled)).not.toContain("checkpointing");
  expect(calls).toEqual({ run: 0, effect: 0, decode: 0, failure: 0 });
});

for (const corruption of [
  "missing source",
  "duplicate source",
  "absent surface",
  "wrong source kind",
  "missing run",
  "missing schema",
  "wrong declaration kind",
  "duplicate declaration",
  "wrong descriptor id",
  "wrong occurrence owner",
  "duplicate descriptor",
  "missing descriptor",
  "identity override",
  "nonfunction failure handler",
] as const) {
  test(`compilation refuses native async source ${corruption} without executing authoring`, () => {
    const { derivation, calls } = asyncSourceFixture();
    const changed = alterHandoff(derivation, (handoff) => {
      const entry = handoff.asyncSources.find(([, source]) => source.kind === "async/workflow");
      if (entry === undefined || entry[1].kind !== "async/workflow")
        throw new Error("fixture source");
      const [id, source] = entry;
      const declaration = { ...source.declarations[0]! };
      if (corruption === "missing run") Reflect.set(declaration, "run", undefined);
      if (corruption === "missing schema") Reflect.set(declaration, "inputSchema", undefined);
      if (corruption === "wrong declaration kind")
        Reflect.set(declaration, "kind", "async.consumer");
      if (corruption === "wrong descriptor id") {
        const [descriptor, ref] = declaration.descriptorReferences[0]!;
        declaration.descriptorReferences = Object.freeze([
          Object.freeze([Object.freeze({ ...descriptor, id: "another-step" }), ref] as const),
          ...declaration.descriptorReferences.slice(1),
        ]);
      }
      if (corruption === "wrong occurrence owner") {
        const [descriptor, ref] = declaration.descriptorReferences[0]!;
        declaration.descriptorReferences = Object.freeze([
          Object.freeze([descriptor, Object.freeze({ ...ref, ownerId: "absent" })] as const),
          ...declaration.descriptorReferences.slice(1),
        ]);
      }
      if (corruption === "duplicate descriptor")
        declaration.descriptorReferences = Object.freeze([
          ...declaration.descriptorReferences,
          declaration.descriptorReferences[0]!,
        ]);
      if (corruption === "missing descriptor")
        declaration.descriptorReferences = Object.freeze(declaration.descriptorReferences.slice(1));
      if (corruption === "identity override" || corruption === "nonfunction failure handler") {
        const options = { ...declaration.options };
        Reflect.set(
          options,
          corruption === "identity override" ? "id" : "onFailure",
          "replacement"
        );
        declaration.options = Object.freeze(options);
      }
      const declarations = Object.freeze(
        corruption === "duplicate declaration"
          ? [Object.freeze(declaration), Object.freeze(declaration)]
          : [Object.freeze(declaration)]
      );
      const replacement = { ...source, declarations };
      if (corruption === "wrong source kind") Reflect.set(replacement, "kind", "async/consumer");
      const sources = handoff.asyncSources.map((original) =>
        original[0] === id
          ? Object.freeze([
              corruption === "absent surface" ? "absent" : id,
              Object.freeze(replacement),
            ] as const)
          : original
      );
      return {
        ...handoff,
        asyncSources:
          corruption === "missing source"
            ? sources.filter(([key]) => key !== id)
            : corruption === "duplicate source"
              ? [...sources, ...sources]
              : sources,
      };
    });
    expect(() => compileRuntimePlan({ derivation: changed })).toThrow(TypeError);
    expect(calls).toEqual({ run: 0, effect: 0, decode: 0, failure: 0 });
  });
}
