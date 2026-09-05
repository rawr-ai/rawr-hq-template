import { expect, test } from "bun:test";

import { attachExecutionProjection, readExecutionProjection } from "../../definition/src/execution";
import { createExecutionDescriptorTable } from "../../derivation/src/derive-execution-descriptor-table";
import { executionDescriptorRefTuple } from "../../derivation/src/execution-descriptor-ref";
import { executionDescriptorId } from "../../derivation/src/identity-policy";
import { webSourceFixture, zeroWebCalls } from "../../derivation/test/helpers/web-source-fixture";
import { compileRuntimePlan } from "../src/compile-runtime-plan";
import { alterHandoff } from "./helpers/handoff-fixture";

test("compilation preserves both selected web channels and exact references without discovery", () => {
  const fixture = webSourceFixture();
  const compiled = compileRuntimePlan({ derivation: fixture.derivation });
  expect(compiled.plan.roles).toEqual(["web"]);
  expect(compiled.plan.surfaces).toHaveLength(2);
  expect(compiled.plan.executionPlans).toHaveLength(4);
  expect(compiled.plan.serviceBindings).toEqual([]);
  expect(compiled.plan.workflowDispatchers).toEqual([]);
  expect(compiled.plan.compiledResources).toHaveLength(1);
  expect(compiled.references.providerEntries()[0]![1]).toBe(fixture.provider);
  for (const surface of compiled.plan.surfaces) {
    expect(surface.role).toBe("web");
    expect(surface.executionDescriptorRefs).toHaveLength(2);
    expect(surface.webRouteModuleRefs).toHaveLength(1);
    for (const ref of surface.executionDescriptorRefs) {
      expect(ref.boundary).toBe("plugin.web-surface");
      const descriptor = fixture.derivation.executionDescriptorTable.get(ref);
      expect(descriptor.policy).toBe(fixture.effect.policy);
      const projection = readExecutionProjection(descriptor);
      expect(projection?.kind).toBe("web.route");
      expect(Object.isFrozen(projection)).toBe(true);
    }
    for (const ref of surface.webRouteModuleRefs) {
      expect(fixture.derivation.webRouteModuleTable.get(ref)).toBe(fixture.module);
    }
  }
  expect(JSON.stringify(compiled)).not.toContain("/request");
  expect(JSON.stringify(compiled)).not.toContain("web.effect");
  expect(fixture.calls).toEqual(zeroWebCalls);
});

test("authored web route ordering is cold-plan stable", () => {
  const forward = webSourceFixture();
  const reverse = webSourceFixture({ reverse: true });
  expect(compileRuntimePlan({ derivation: forward.derivation }).plan).toEqual(
    compileRuntimePlan({ derivation: reverse.derivation }).plan
  );
  expect(forward.calls).toEqual(zeroWebCalls);
  expect(reverse.calls).toEqual(zeroWebCalls);
});

for (const corruption of [
  "missing projection",
  "wrong projection kind",
  "invalid path",
  "different policy reference",
] as const) {
  test(`compilation refuses selected web Effect ${corruption} without executing its body`, () => {
    const fixture = webSourceFixture();
    const changed = alterHandoff(fixture.derivation, (handoff) => handoff);
    const entries = fixture.derivation.executionDescriptorTable.entries();
    const [ref, descriptor] = entries[0]!;
    const replacement =
      corruption === "missing projection"
        ? Object.freeze({ ...descriptor })
        : corruption === "wrong projection kind"
          ? attachExecutionProjection(
              { ...descriptor },
              { kind: "desktop.background", cadence: 1000 }
            )
          : corruption === "different policy reference"
            ? attachExecutionProjection(
                { ...descriptor, policy: Object.freeze({ ...descriptor.policy }) },
                { kind: "web.route", path: "/request" }
              )
            : (() => {
                const projection = { kind: "web.route" as const, path: "/request" };
                Reflect.set(projection, "path", 123);
                return attachExecutionProjection({ ...descriptor }, projection);
              })();
    Reflect.set(
      changed,
      "executionDescriptorTable",
      createExecutionDescriptorTable([[ref, replacement], ...entries.slice(1)])
    );
    expect(() => compileRuntimePlan({ derivation: changed })).toThrow(
      "selected web execution projection"
    );
    expect(fixture.calls).toEqual(zeroWebCalls);
  });
}

test("a rehashed web Effect ref still requires its exact selected operational occurrence", () => {
  const fixture = webSourceFixture();
  const original = fixture.derivation.graph.executionDescriptorRefs[0]!;
  if (original.boundary !== "plugin.web-surface") throw new Error("Expected web fixture ref.");
  const identity = {
    boundary: "plugin.web-surface" as const,
    ownerId: original.ownerId,
    surfaceId: "absent",
  };
  const replacement = {
    kind: "execution.descriptor-ref" as const,
    ...identity,
    executionId: executionDescriptorId(identity),
  };
  const rewrite = (
    ref: typeof original | (typeof fixture.derivation.graph.executionDescriptorRefs)[number]
  ) => (ref.executionId === original.executionId ? replacement : ref);
  const compareRefs = (
    left: Parameters<typeof rewrite>[0],
    right: Parameters<typeof rewrite>[0]
  ) => {
    const a = JSON.stringify(executionDescriptorRefTuple(left));
    const b = JSON.stringify(executionDescriptorRefTuple(right));
    return a < b ? -1 : a > b ? 1 : 0;
  };
  const changed = alterHandoff(fixture.derivation, (handoff) => ({
    ...handoff,
    graph: {
      ...handoff.graph,
      executionDescriptorRefs: handoff.graph.executionDescriptorRefs.map(rewrite).sort(compareRefs),
      surfaceRuntimePlans: handoff.graph.surfaceRuntimePlans.map((surface) => ({
        ...surface,
        executionDescriptorRefs: surface.executionDescriptorRefs.map(rewrite).sort(compareRefs),
      })),
    },
    executionPolicies: handoff.executionPolicies
      .map(([ref, policy]) => [rewrite(ref), policy] as const)
      .sort(([left], [right]) => compareRefs(left, right)),
  }));
  expect(() => compileRuntimePlan({ derivation: changed })).toThrow(
    "Execution descriptor reference is absent"
  );
  expect(fixture.calls).toEqual(zeroWebCalls);
});

test("a changed compiled module path cannot resolve the original module loader", () => {
  const fixture = webSourceFixture();
  const original = fixture.derivation.graph.webRouteModuleRefs[0]!;
  const rewrite = (ref: typeof original) =>
    ref.ownerId === original.ownerId ? { ...ref, path: "/absent" } : ref;
  const changed = alterHandoff(fixture.derivation, (handoff) => ({
    ...handoff,
    graph: {
      ...handoff.graph,
      webRouteModuleRefs: handoff.graph.webRouteModuleRefs.map(rewrite),
      surfaceRuntimePlans: handoff.graph.surfaceRuntimePlans.map((surface) => ({
        ...surface,
        webRouteModuleRefs: surface.webRouteModuleRefs.map(rewrite),
      })),
    },
  }));
  expect(() => compileRuntimePlan({ derivation: changed })).toThrow(
    "Web route-module reference is absent"
  );
  expect(fixture.calls).toEqual(zeroWebCalls);
});
