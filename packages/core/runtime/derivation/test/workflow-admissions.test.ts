import { expect, test } from "bun:test";

import { defineServerApiPlugin, requireResource } from "../../definition/src/index";
import { useWorkflowDispatcher } from "../../definition/src/workflow-dispatcher-use";
import { readRuntimeDerivationHandoff } from "../src/derivation-handoff";
import { pluginOwnerId, workflowDispatcherId } from "../src/identity-policy";
import { asyncSourceFixture } from "./helpers/async-source-fixture";
import { deriveServerFixture } from "./helpers/server-source-fixture";
import { workflowAdmissionFixture, zeroAdmissionCalls } from "./helpers/workflow-admission-fixture";

test("server-only admission selects exact named subsets and client closure, not target execution", () => {
  const fixture = workflowAdmissionFixture();
  const { derivation, target, alpha, leftClient, rightClient } = fixture;
  const handoff = readRuntimeDerivationHandoff(derivation);
  expect(derivation.graph.plugins).toHaveLength(2);
  expect(derivation.topology.roleRequirements).toEqual(["server"]);
  expect(derivation.graph.plugins.every((plugin) => plugin.role === "server")).toBe(true);
  expect(derivation.graph.serviceUses).toEqual([]);
  expect(derivation.graph.serviceBindingPlans).toEqual([]);
  expect(handoff.asyncSources).toEqual([]);
  expect(handoff.services).toEqual([]);
  expect(handoff.harnessIds).toEqual([]);
  expect(derivation.executionDescriptorTable.entries()).toEqual([]);
  expect(derivation.graph.resourceRequirements).toHaveLength(3);
  expect(
    derivation.graph.resourceRequirements.every(
      (entry) => entry.resource.resourceId === "admission-client"
    )
  ).toBe(true);
  expect(derivation.graph.profile.providerSelections).toHaveLength(2);
  expect(fixture.api.resourceRequirements).toEqual([leftClient, rightClient]);
  expect(handoff.workflowAdmissions).toHaveLength(2);
  const apiAdmissions = handoff.workflowAdmissions.find(
    ([, entries]) => entries[0]?.caller === fixture.api
  )![1];
  expect(apiAdmissions.map((entry) => entry.useName)).toEqual([
    "alias",
    "alpha",
    "both",
    "right",
    "zeta",
  ]);
  const alias = apiAdmissions.find((entry) => entry.useName === "alias")!;
  const alphaAdmission = apiAdmissions.find((entry) => entry.useName === "alpha")!;
  const right = apiAdmissions.find((entry) => entry.useName === "right")!;
  expect(alias.descriptorId).toBe(alphaAdmission.descriptorId);
  expect(right.descriptorId).toBe(alphaAdmission.descriptorId);
  expect(alphaAdmission.target).toBe(target);
  expect(alphaAdmission.workflows[0]).toBe(alpha);
  expect(alphaAdmission.workflows[0]!.inputSchema).toBe(fixture.schema);
  expect(alphaAdmission.client).toBe(leftClient);
  expect(right.client).toBe(rightClient);
  expect(alphaAdmission.clientRequirementId).not.toBe(right.clientRequirementId);
  expect(derivation.graph.workflowDispatcherDescriptors).toHaveLength(3);
  for (const descriptor of derivation.graph.workflowDispatcherDescriptors) {
    expect(Object.keys(descriptor).sort()).toEqual([
      "appId",
      "capability",
      "descriptorId",
      "kind",
      "pluginOwnerId",
      "role",
      "surface",
      "workflowIds",
    ]);
    expect(descriptor.pluginOwnerId).toBe(
      pluginOwnerId({ pluginId: target.id, instance: target.instance! })
    );
    const { kind: _kind, descriptorId, ...identity } = descriptor;
    expect(descriptorId).toBe(workflowDispatcherId(identity));
  }
  const allSubsets = derivation.graph.workflowDispatcherDescriptors.map(
    (descriptor) => descriptor.workflowIds
  );
  expect(allSubsets).toContainEqual(["alpha"]);
  expect(allSubsets).toContainEqual(["zeta"]);
  expect(allSubsets).toContainEqual(["alpha", "zeta"]);
  expect(Object.isFrozen(handoff.workflowAdmissions)).toBe(true);
  expect(
    handoff.workflowAdmissions.every(
      ([_, entries]) => Object.isFrozen(entries) && entries.every(Object.isFrozen)
    )
  ).toBe(true);
  expect(JSON.stringify(derivation)).not.toContain("admission/shared-event");
  expect(JSON.stringify(derivation)).not.toContain("clientRequirementId");
  expect(fixture.calls).toEqual(zeroAdmissionCalls);
});

test("reordered app members, named uses and requested subset produce identical cold data", () => {
  const forward = workflowAdmissionFixture();
  const reverse = workflowAdmissionFixture(true);
  expect(forward.derivation.graph).toEqual(reverse.derivation.graph);
  expect(forward.derivation.portableArtifact).toEqual(reverse.derivation.portableArtifact);
  expect(forward.calls).toEqual(zeroAdmissionCalls);
  expect(reverse.calls).toEqual(zeroAdmissionCalls);
});

test("async execution alone no longer manufactures unused admission descriptors", () => {
  const { derivation } = asyncSourceFixture();
  expect(derivation.graph.workflowDispatcherDescriptors).toEqual([]);
  expect(
    derivation.graph.surfaceRuntimePlans.every(
      (surface) => surface.workflowDispatcherDescriptorIds.length === 0
    )
  ).toBe(true);
  expect(readRuntimeDerivationHandoff(derivation).workflowAdmissions).toEqual([]);
  expect(readRuntimeDerivationHandoff(derivation).asyncSources).toHaveLength(3);
  expect(derivation.executionDescriptorTable.entries().length).toBeGreaterThan(0);
});

for (const wrongTarget of ["foreign", "copied", "duplicate occurrence"] as const) {
  test(`admission refuses ${wrongTarget} target even when the async role is not selected`, () => {
    const { target, api, providers, calls } = workflowAdmissionFixture();
    const copy = Object.freeze({ ...target });
    const plugins =
      wrongTarget === "foreign"
        ? [api]
        : wrongTarget === "copied"
          ? [copy, api]
          : [target, copy, api];
    expect(() => deriveServerFixture(plugins, ["server"], providers)).toThrow(TypeError);
    expect(calls).toEqual(zeroAdmissionCalls);
  });
}

test("admission refuses ambiguous target member IDs without selecting its execution surface", () => {
  const { target, alpha, leftClient, providers, calls } = workflowAdmissionFixture();
  const ambiguous = Object.freeze({
    ...target,
    workflows: Object.freeze([alpha, Object.freeze({ ...alpha })]),
  });
  const use = useWorkflowDispatcher(ambiguous, { workflows: [alpha], client: leftClient });
  const api = defineServerApiPlugin.factory()({
    capability: "ambiguous",
    services: {},
    routeBase: "/ambiguous",
    workflows: { submit: use },
    api: () => ({}),
  })();
  expect(() => deriveServerFixture([ambiguous, api], ["server"], providers)).toThrow(TypeError);
  expect(calls).toEqual(zeroAdmissionCalls);
});

test("an unselected server caller does not admit workflows or pull its client", () => {
  const { api, providers, calls } = workflowAdmissionFixture();
  const derivation = deriveServerFixture([api], ["cli"], providers);
  expect(derivation.graph.workflowDispatcherDescriptors).toEqual([]);
  expect(derivation.graph.profile.providerSelections).toEqual([]);
  expect(readRuntimeDerivationHandoff(derivation).workflowAdmissions).toEqual([]);
  expect(calls).toEqual(zeroAdmissionCalls);
});

test("copied, foreign and empty workflow subsets refuse without invoking schemas or workflows", () => {
  const fixture = workflowAdmissionFixture();
  const foreign = workflowAdmissionFixture();
  for (const workflows of [[Object.freeze({ ...fixture.alpha })], [foreign.alpha], []]) {
    expect(() =>
      Reflect.apply(useWorkflowDispatcher, undefined, [
        fixture.target,
        { workflows, client: fixture.leftClient },
      ])
    ).toThrow(TypeError);
  }
  expect(fixture.calls).toEqual(zeroAdmissionCalls);
  expect(foreign.calls).toEqual(zeroAdmissionCalls);
});

test("distinct client requirement references keep the ordinary conflicting-identity refusal", () => {
  const { target, alphaUse, leftClient, providers, calls } = workflowAdmissionFixture();
  const api = defineServerApiPlugin.factory()({
    capability: "conflicting-clients",
    services: {},
    routeBase: "/conflicting-clients",
    resourceRequirements: [requireResource({ ...leftClient, reason: "Another requirement" })],
    workflows: { submit: alphaUse },
    api: () => ({}),
  })();
  expect(() => deriveServerFixture([target, api], ["server"], providers)).toThrow(TypeError);
  expect(calls).toEqual(zeroAdmissionCalls);
});
