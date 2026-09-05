import { expect, test } from "bun:test";

import { readRuntimeDerivationHandoff } from "../../derivation/src/derivation-handoff";
import { workflowDispatcherId } from "../../derivation/src/identity-policy";
import {
  workflowAdmissionFixture,
  zeroAdmissionCalls,
} from "../../derivation/test/helpers/workflow-admission-fixture";
import { compileRuntimePlan } from "../src/compile-runtime-plan";
import { readRuntimeCompilationWorkflowAdmissions } from "../src/runtime-compilation-reference-table";
import { alterHandoff } from "./helpers/handoff-fixture";

test("compiled admission preserves cross-owner named sources and exact acquired-client selections cold", () => {
  const fixture = workflowAdmissionFixture();
  const original = readRuntimeDerivationHandoff(fixture.derivation).workflowAdmissions;
  const compiled = compileRuntimePlan({ derivation: fixture.derivation });
  const entries = readRuntimeCompilationWorkflowAdmissions(compiled.references);
  expect(entries).toHaveLength(2);
  expect(compiled.plan.roles).toEqual(["server"]);
  expect(compiled.plan.surfaces).toHaveLength(2);
  expect(compiled.plan.workflowDispatchers).toHaveLength(3);
  expect(compiled.plan.executionPlans).toEqual([]);
  expect(compiled.plan.serviceBindings).toEqual([]);
  expect(compiled.plan.harnesses).toEqual([]);
  expect(compiled.plan.compiledResources).toHaveLength(2);
  for (const [surfacePlanId, admissions] of entries) {
    const authored = original.find(([id]) => id === surfacePlanId)![1];
    const surface = compiled.plan.surfaces.find((item) => item.surfacePlanId === surfacePlanId)!;
    expect(admissions).toHaveLength(authored.length);
    for (const [index, admission] of admissions.entries()) {
      const source = authored[index]!;
      expect(admission.caller).toBe(source.caller);
      expect(admission.use).toBe(source.use);
      expect(admission.target).toBe(source.target);
      expect(admission.workflows).toBe(source.workflows);
      expect(admission.client).toBe(source.client);
      expect(admission.descriptorId).toBe(source.descriptorId);
      expect(surface.workflowDispatcherIds).toContain(admission.descriptorId);
      expect(surface.resources).toContainEqual({
        requirementId: admission.clientRequirementId,
        selectionId: admission.clientSelectionId,
      });
      expect(compiled.references.getProvider(admission.clientSelectionId)).toBe(fixture.provider);
      expect(Object.isFrozen(admission)).toBe(true);
    }
  }
  const allAdmissions = entries.flatMap(([, admissions]) => admissions);
  const alpha = allAdmissions.find((entry) => entry.useName === "alpha")!;
  const alias = allAdmissions.find((entry) => entry.useName === "alias")!;
  const right = allAdmissions.find((entry) => entry.useName === "right")!;
  const forwarded = allAdmissions.find((entry) => entry.useName === "forwarded")!;
  expect(allAdmissions).toHaveLength(6);
  expect(alias.descriptorId).toBe(alpha.descriptorId);
  expect(right.descriptorId).toBe(alpha.descriptorId);
  expect(forwarded.descriptorId).toBe(alpha.descriptorId);
  expect(alias.clientSelectionId).toBe(alpha.clientSelectionId);
  expect(right.clientSelectionId).not.toBe(alpha.clientSelectionId);
  expect(forwarded.clientSelectionId).toBe(right.clientSelectionId);
  expect(forwarded.clientRequirementId).not.toBe(right.clientRequirementId);
  expect(Object.isFrozen(entries)).toBe(true);
  expect(entries.every(([_, admissions]) => Object.isFrozen(admissions))).toBe(true);
  expect(JSON.stringify(compiled)).not.toContain("admission/shared-event");
  expect(JSON.stringify(compiled)).not.toContain("clientSelectionId");
  expect(JSON.stringify(compiled)).not.toContain("inputSchema");
  expect(fixture.calls).toEqual(zeroAdmissionCalls);
});

test("compiled admission data is deterministic without collapsing caller-local live bindings", () => {
  const left = workflowAdmissionFixture();
  const right = workflowAdmissionFixture(true);
  expect(compileRuntimePlan({ derivation: left.derivation }).plan).toEqual(
    compileRuntimePlan({ derivation: right.derivation }).plan
  );
  expect(left.calls).toEqual(zeroAdmissionCalls);
  expect(right.calls).toEqual(zeroAdmissionCalls);
});

for (const corruption of [
  "missing source",
  "missing shared alias",
  "duplicate surface",
  "unreachable surface",
  "duplicate name",
  "reordered names",
  "wrong caller",
  "wrong use",
  "copied target",
  "copied workflow subset",
  "copied client",
  "wrong client requirement",
  "wrong descriptor subset",
  "mutable source",
] as const) {
  test(`compilation refuses workflow admission ${corruption} before invoking any native source`, () => {
    const fixture = workflowAdmissionFixture();
    const changed = alterHandoff(fixture.derivation, (handoff) => {
      const [id, sources] = handoff.workflowAdmissions.find(
        ([, admissions]) => admissions[0]?.caller === fixture.api
      )!;
      const source = { ...sources[0]! };
      if (corruption === "wrong caller") source.caller = fixture.internal;
      if (corruption === "wrong use") source.use = fixture.rightUse;
      if (corruption === "copied target") source.target = Object.freeze({ ...source.target });
      if (corruption === "copied workflow subset")
        source.workflows = Object.freeze([...source.workflows]);
      if (corruption === "copied client") source.client = Object.freeze({ ...source.client });
      if (corruption === "wrong client requirement")
        source.clientRequirementId = sources.find(
          (entry) => entry.useName === "right"
        )!.clientRequirementId;
      if (corruption === "wrong descriptor subset")
        source.descriptorId = sources.find((entry) => entry.useName === "zeta")!.descriptorId;
      const replacement = corruption === "mutable source" ? source : Object.freeze(source);
      const admissions = Object.freeze(
        corruption === "missing shared alias"
          ? sources.slice(1)
          : corruption === "duplicate name"
            ? [replacement, replacement, ...sources.slice(1)]
            : corruption === "reordered names"
              ? [...sources].reverse()
              : [replacement, ...sources.slice(1)]
      );
      const entries = handoff.workflowAdmissions.map((entry) =>
        entry[0] === id
          ? Object.freeze([
              corruption === "unreachable surface" ? "absent" : id,
              admissions,
            ] as const)
          : entry
      );
      return {
        ...handoff,
        workflowAdmissions: Object.freeze(
          corruption === "missing source"
            ? entries.filter(([key]) => key !== id)
            : corruption === "duplicate surface"
              ? [...entries, ...entries]
              : entries
        ),
      };
    });
    expect(() => compileRuntimePlan({ derivation: changed })).toThrow(TypeError);
    expect(fixture.calls).toEqual(zeroAdmissionCalls);
  });
}

test("compilation refuses an unrequested otherwise-valid dispatcher descriptor", () => {
  const fixture = workflowAdmissionFixture();
  const changed = alterHandoff(fixture.derivation, (handoff) => {
    const original = handoff.graph.workflowDispatcherDescriptors[0]!;
    const { kind: _kind, descriptorId: _id, ...identity } = original;
    const extraIdentity = { ...identity, capability: "unrequested" };
    const extra = {
      ...original,
      ...extraIdentity,
      descriptorId: workflowDispatcherId(extraIdentity),
    };
    const descriptors = [...handoff.graph.workflowDispatcherDescriptors, extra].sort(
      (left, right) => (left.descriptorId < right.descriptorId ? -1 : 1)
    );
    return { ...handoff, graph: { ...handoff.graph, workflowDispatcherDescriptors: descriptors } };
  });
  expect(() => compileRuntimePlan({ derivation: changed })).toThrow(TypeError);
  expect(fixture.calls).toEqual(zeroAdmissionCalls);
});
