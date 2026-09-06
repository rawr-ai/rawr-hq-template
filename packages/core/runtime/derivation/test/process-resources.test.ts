import { expect, test } from "bun:test";

import { defineEntrypoint, defineProcessCatalog } from "../../definition/src/app";
import { requireResource } from "../../definition/src/resource";
import { readRuntimeDerivationHandoff } from "../src/derivation-handoff";
import { deriveRuntimeArtifacts } from "../src/derive-runtime-artifacts";
import {
  processResourceFixture,
  zeroProcessResourceCalls,
} from "./helpers/process-resource-fixture";

test("selected process demand reaches named provider instances without widening plugin capabilities", () => {
  const fixture = processResourceFixture();
  const derived = fixture.derive();
  const roots = derived.graph.resourceRequirements.filter(({ owner }) => owner.kind === "process");
  expect(roots).toHaveLength(2);
  expect(roots.map(({ resource }) => resource.instance).sort()).toEqual(["primary", "secondary"]);
  expect(
    roots.every(({ owner }) => owner.kind === "process" && owner.processId === "selected-cli")
  ).toBe(true);
  expect(derived.topology.edges.filter(({ kind }) => kind === "process.resource")).toHaveLength(2);
  expect(derived.graph.resourceRequirements).toHaveLength(3);
  expect(derived.graph.profile.providerSelections).toHaveLength(3);
  expect(derived.graph.plugins[0]?.resourceRequirementIds).toEqual([]);
  expect(derived.graph.surfaceRuntimePlans[0]?.resourceRequirementIds).toEqual([]);
  expect(JSON.stringify(derived.graph)).not.toContain("sibling-resource");
  const handoff = readRuntimeDerivationHandoff(derived);
  for (const root of roots) {
    const expected = root.resource.instance === "primary" ? fixture.primary : fixture.secondary;
    expect(handoff.resourceReferences.find(([id]) => id === root.requirementId)?.[1]).toBe(
      expected
    );
  }
  const primary = derived.graph.profile.providerSelections.find(
    ({ resource }) => resource.instance === "primary"
  );
  expect(primary?.configRef).toEqual({
    kind: "runtime.config-ref",
    key: "primary.config",
    sources: [
      { kind: "runtime.config.env", key: "primary.config", name: "EXPLICIT_primary.config" },
      { kind: "runtime.config.file", key: "primary.config", path: "runtime.json", optional: true },
      { kind: "runtime.config.memory", key: "primary.config" },
    ],
  });
  expect(fixture.calls).toEqual(zeroProcessResourceCalls);
  expect(derived.graph).toEqual(processResourceFixture({ reverse: true }).derive().graph);
});

test("a reusable profile with no selected process demand leaves all candidates inert", () => {
  const fixture = processResourceFixture({ roots: "none" });
  const derived = fixture.derive();
  expect(derived.graph.resourceRequirements).toEqual([]);
  expect(derived.graph.profile.providerSelections).toEqual([]);
  expect(derived.topology.resourceRequirementIdentities).toEqual([]);
  expect(readRuntimeDerivationHandoff(derived).providers).toEqual([]);
  expect(fixture.calls).toEqual(zeroProcessResourceCalls);
});

test("missing required process supply refuses cold while optional absence remains a finding", () => {
  const required = processResourceFixture({ roots: "primary", missing: true });
  expect(required.derive).toThrow(TypeError);
  expect(required.calls).toEqual(zeroProcessResourceCalls);
  const optional = processResourceFixture({ roots: "primary", missing: true, optional: true });
  const derived = optional.derive();
  expect(derived.graph.profile.providerSelections).toEqual([]);
  expect(derived.graph.findings).toHaveLength(1);
  expect(derived.graph.findings[0]?.resource.instance).toBe("primary");
  expect(optional.calls).toEqual(zeroProcessResourceCalls);
});

for (const invalid of ["duplicate", "unselected role"] as const) {
  test(`process demand refuses ${invalid} without live work`, () => {
    const fixture = processResourceFixture();
    const process = defineProcessCatalog({
      cli: {
        id: fixture.entrypoint.process.id,
        roles: ["cli"],
        resourceRequirements:
          invalid === "duplicate"
            ? [fixture.primary, fixture.primary]
            : [
                requireResource({
                  resource: fixture.resource,
                  role: "server",
                  reason: "Unselected role",
                }),
              ],
      },
    }).cli;
    const entrypoint = defineEntrypoint({ ...fixture.entrypoint, process });
    expect(() => deriveRuntimeArtifacts({ entrypoint, profileId: entrypoint.profile.id })).toThrow(
      TypeError
    );
    expect(fixture.calls).toEqual(zeroProcessResourceCalls);
  });
}
