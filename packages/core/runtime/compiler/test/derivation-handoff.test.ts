import { expect, test } from "bun:test";
import { Effect } from "effect";
import { requireResource } from "../../definition/src/index";
import {
  executionDescriptorId,
  resourceRequirementId,
  surfacePlanId,
} from "../../derivation/src/identity-policy";
import { readRuntimeDerivationHandoff } from "../../derivation/src/index";
import { compileRuntimePlan } from "../src/index";
import { alterHandoff, produceHandoff, zeroCalls } from "./helpers/handoff-fixture";

for (const [name, profileHarnesses, processHarness, expected] of [
  ["process-only", [], "process-only", ["process-only"]],
  ["distinct union", ["profile"], "process", ["process", "profile"]],
  ["shared dedupe", ["shared", "base"], "shared", ["base", "shared"]],
] as const) {
  test(`selected harnesses preserve ${name} without changing profile-only metadata`, () => {
    const { derivation, counters } = produceHandoff({ profileHarnesses, processHarness });
    const handoff = readRuntimeDerivationHandoff(derivation);
    const { plan } = compileRuntimePlan({ derivation });
    expect(handoff.harnessIds).toEqual(expected);
    expect(plan.harnesses.map(({ harnessId }) => harnessId)).toEqual([...expected]);
    expect(derivation.graph.profile.harnesses).toEqual([...profileHarnesses].sort());
    expect(counters).toEqual(zeroCalls);
  });
}

test("nonempty native service/provider handoff survives producer locals without cold execution", async () => {
  const { derivation, counters } = produceHandoff();
  const handoff = readRuntimeDerivationHandoff(derivation);
  const { plan, references } = compileRuntimePlan({ derivation });
  expect(handoff.services).toHaveLength(3);
  expect(handoff.providers).toHaveLength(4);
  expect(plan.executionPlans).toHaveLength(1);
  expect(plan.surfaces.flatMap((s) => s.webRouteModuleRefs)).toHaveLength(1);
  for (const [id, service] of handoff.services) {
    expect(references.getService(id)).toBe(service);
    expect(references.getService(id).construct).toBe(service.construct);
  }
  for (const [id, provider] of handoff.providers) expect(references.getProvider(id)).toBe(provider);
  expect(counters).toEqual(zeroCalls);
  // Deliberately cross the native callable boundary only after checking the complete cold story.
  const child = plan.serviceBindings.find(
    (s) => s.serviceId === "child" && s.serviceInstance === "alpha"
  )!;
  const service = references.getService(child.bindingId);
  const client = service.construct({ deps: { resource: {} }, scope: undefined, config: "ready" });
  const call = client.withInvocation({ invocation: undefined });
  expect(typeof call).toBe("object");
  const selected = handoff.services.find(([id]) => id === child.bindingId)![1];
  expect(selected.contract).toHaveProperty("read");
  expect(counters.construct).toBe(1);
  expect(counters.operation).toBe(0);
  if (typeof call === "function" || typeof call.read !== "function")
    throw new Error("Missing native fixture operation");
  expect(await Effect.runPromise(call.read("input"))).toBe("ready:input");
  expect(counters.operation).toBe(1);
});

test("selected API excludes sibling config/providers and keeps unused schema provider inert", () => {
  const { derivation, counters } = produceHandoff({ apiOnly: true });
  const { plan, references } = compileRuntimePlan({ derivation });
  expect(plan.roles).toEqual(["server"]);
  expect(plan.providerSelections.map((p) => p.providerId).sort()).toEqual([
    "leaf.provider",
    "middle.provider",
    "root.provider",
  ]);
  expect(references.providerEntries()).toHaveLength(3);
  expect(plan.compiledResources.every((p) => p.configRef === undefined)).toBe(true);
  expect(plan.surfaces).toHaveLength(1);
  expect(plan.workflowDispatchers).toEqual([]);
  expect(plan.executionPlans).toEqual([]);
  expect(
    plan.serviceBindings
      .filter((s) => s.serviceId === "child")
      .map((s) => s.configRef?.key)
      .sort()
  ).toEqual(["child.alpha", "child.beta"]);
  expect(JSON.stringify(plan)).not.toContain("sibling.config");
  expect(JSON.stringify(plan)).not.toContain("unused.provider");
  expect(counters).toEqual(zeroCalls);
});

test("required first-hit source policy survives zero selected config refs", () => {
  const { derivation, counters } = produceHandoff({ apiOnly: true, zeroConfig: true });
  const { plan } = compileRuntimePlan({ derivation });
  expect(plan.compiledResources.every((p) => p.configRef === undefined)).toBe(true);
  expect(
    plan.serviceBindings.every((s) => s.configRef === undefined && s.scopeRef === undefined)
  ).toBe(true);
  expect(plan.configSources).toEqual([
    { kind: "file", path: "required.json", optional: false },
    { kind: "env", prefix: "APP_" },
    { kind: "test" },
  ]);
  expect(counters).toEqual(zeroCalls);
});

test("required and optional provider fixed point lowers a genuine three-node diamond", () => {
  const { derivation, counters } = produceHandoff({ apiOnly: true });
  const { plan } = compileRuntimePlan({ derivation });
  const byProvider = new Map(plan.providerSelections.map((s) => [s.providerId, s.selectionId]));
  expect(
    plan.providerDependencyGraph.edges.map((e) => [e.fromSelectionId, e.toSelectionId]).sort()
  ).toEqual(
    [
      [byProvider.get("root.provider")!, byProvider.get("middle.provider")!],
      [byProvider.get("root.provider")!, byProvider.get("leaf.provider")!],
      [byProvider.get("middle.provider")!, byProvider.get("leaf.provider")!],
    ].sort()
  );
  expect(
    plan.providerDependencyGraph.closure.find(
      (c) => c.selectionId === byProvider.get("root.provider")
    )?.reachableSelectionIds
  ).toEqual([byProvider.get("middle.provider")!, byProvider.get("leaf.provider")!].sort());
  expect(
    plan.providerDependencyGraph.closure.find(
      (c) => c.selectionId === byProvider.get("leaf.provider")
    )?.reachableSelectionIds
  ).toEqual([]);
  expect(derivation.graph.findings).toHaveLength(1);
  expect(derivation.graph.findings[0]?.resource.resourceId).toBe("optional");
  expect(plan.compiledResources.some((p) => p.resource.resourceId === "optional")).toBe(false);
  const selected = produceHandoff({ apiOnly: true, optionalSelected: true });
  const selectedPlan = compileRuntimePlan({ derivation: selected.derivation }).plan;
  expect(selected.derivation.graph.findings).toEqual([]);
  expect(selectedPlan.compiledResources.some((p) => p.resource.resourceId === "optional")).toBe(
    true
  );
  expect(counters).toEqual(zeroCalls);
  expect(selected.counters).toEqual(zeroCalls);
});

const corruptions: readonly [string, Parameters<typeof alterHandoff>[1]][] = [
  ["surplus closed graph field", (h) => ({ ...h, graph: { ...h.graph, unexpected: true } })],
  ["identity", (h) => ({ ...h, identity: { ...h.identity, deployment: "different" } })],
  ["profile", (h) => ({ ...h, profileId: "different" })],
  ["roles", (h) => ({ ...h, roles: ["server"] })],
  ["duplicate roles", (h) => ({ ...h, roles: [...h.roles, ...h.roles] })],
  ["duplicate harness", (h) => ({ ...h, harnessIds: ["duplicate", "duplicate"] })],
  ["missing provider reference", (h) => ({ ...h, providers: h.providers.slice(1) })],
  ["duplicate provider reference", (h) => ({ ...h, providers: [...h.providers, ...h.providers] })],
  [
    "wrong provider identity",
    (h) => ({
      ...h,
      providers: h.providers.map(
        ([id, p], i) => [id, i === 0 ? { ...p, id: "wrong" } : p] as const
      ),
    }),
  ],
  ["missing service reference", (h) => ({ ...h, services: h.services.slice(1) })],
  [
    "wrong service identity",
    (h) => ({
      ...h,
      services: h.services.map(
        ([id, s], i) =>
          [id, i === 0 ? { ...s, definition: { ...s.definition, id: "wrong" } } : s] as const
      ),
    }),
  ],
  [
    "conflicting complete export",
    (h) => ({
      ...h,
      services: h.services.map(
        ([id, s]) =>
          [
            id,
            id === h.services.find(([, item]) => item.definition.id === "child")?.[0]
              ? { ...s }
              : s,
          ] as const
      ),
    }),
  ],
  ["missing execution policy", (h) => ({ ...h, executionPolicies: [] })],
  [
    "dangling resource binding",
    (h) => ({
      ...h,
      resourceBindings: h.resourceBindings.map(
        ([id, target], i) => [id, i === 0 ? "dangling" : target] as const
      ),
    }),
  ],
  [
    "missing required resource binding",
    (h) => ({ ...h, resourceBindings: h.resourceBindings.slice(1) }),
  ],
  [
    "duplicate requirement",
    (h) => ({
      ...h,
      graph: {
        ...h.graph,
        resourceRequirements: [...h.graph.resourceRequirements, ...h.graph.resourceRequirements],
      },
    }),
  ],
  [
    "wrong requirement identity",
    (h) => ({
      ...h,
      graph: {
        ...h.graph,
        resourceRequirements: h.graph.resourceRequirements.map((r, i) =>
          i === 0 ? { ...r, requirementId: "wrong" } : r
        ),
      },
    }),
  ],
  [
    "dangling child binding",
    (h) => ({
      ...h,
      graph: {
        ...h.graph,
        serviceBindingPlans: h.graph.serviceBindingPlans.map((b) =>
          b.serviceId === "parent"
            ? {
                ...b,
                serviceDependencies: b.serviceDependencies.map((s, i) =>
                  i === 0 ? { ...s, bindingId: "missing" } : s
                ),
              }
            : b
        ),
      },
    }),
  ],
  [
    "dangling surface binding",
    (h) => ({
      ...h,
      graph: {
        ...h.graph,
        surfaceRuntimePlans: h.graph.surfaceRuntimePlans.map((s) =>
          s.role === "server"
            ? {
                ...s,
                serviceBindings: s.serviceBindings.map((b, i) =>
                  i === 0 ? { ...b, bindingId: "missing" } : b
                ),
              }
            : s
        ),
      },
    }),
  ],
  ["missing optional finding", (h) => ({ ...h, graph: { ...h.graph, findings: [] } })],
  [
    "wrong optional finding resource",
    (h) => ({
      ...h,
      graph: {
        ...h.graph,
        findings: h.graph.findings.map((f) => ({
          ...f,
          resource: { ...f.resource, resourceId: "wrong" },
        })),
      },
    }),
  ],
  [
    "provider reason disagreement",
    (h) => ({
      ...h,
      providers: h.providers.map(
        ([id, p]) =>
          [
            id,
            p.id === "root.provider"
              ? {
                  ...p,
                  requires: p.requires.map((r, i) => (i === 0 ? { ...r, reason: "wrong" } : r)),
                }
              : p,
          ] as const
      ),
    }),
  ],
  [
    "provider missing dependency",
    (h) => ({
      ...h,
      providers: h.providers.map(
        ([id, p]) => [id, p.id === "root.provider" ? { ...p, requires: [] } : p] as const
      ),
    }),
  ],
];

test("direct and provider-owned missing optional branches each require their own finding", () => {
  const { derivation, counters } = produceHandoff({ apiOnly: true, directOptional: true });
  expect(derivation.graph.findings).toHaveLength(2);
  expect(() => compileRuntimePlan({ derivation })).not.toThrow();
  for (const finding of derivation.graph.findings) {
    const bad = alterHandoff(derivation, (h) => ({
      ...h,
      graph: {
        ...h.graph,
        findings: h.graph.findings.filter((f) => f.requirementId !== finding.requirementId),
      },
    }));
    expect(() => compileRuntimePlan({ derivation: bad })).toThrow(TypeError);
  }
  const selected = produceHandoff({ apiOnly: true, directOptional: true, optionalSelected: true });
  expect(selected.derivation.graph.findings).toEqual([]);
  expect(
    compileRuntimePlan({ derivation: selected.derivation }).references.providerEntries()
  ).toHaveLength(4);
  expect(counters).toEqual(zeroCalls);
  expect(selected.counters).toEqual(zeroCalls);
});

for (const field of ["app", "process", "entrypoint", "deployment", "source"] as const)
  test(`refuses launch identity ${field} disagreement`, () => {
    const { derivation, counters } = produceHandoff();
    const bad = alterHandoff(derivation, (h) => ({
      ...h,
      identity: { ...h.identity, [field]: "mismatch" },
    }));
    expect(() => compileRuntimePlan({ derivation: bad })).toThrow(TypeError);
    expect(counters).toEqual(zeroCalls);
  });

test("a selected optional provider cannot retain a missing-provider finding", () => {
  const missing = produceHandoff({ apiOnly: true });
  const selected = produceHandoff({ apiOnly: true, optionalSelected: true });
  const bad = alterHandoff(selected.derivation, (h) => ({
    ...h,
    graph: { ...h.graph, findings: missing.derivation.graph.findings },
  }));
  expect(() => compileRuntimePlan({ derivation: bad })).toThrow(TypeError);
  expect(selected.counters).toEqual(zeroCalls);
});
for (const [name, change] of corruptions)
  test(`refuses trusted handoff corruption: ${name}`, () => {
    const { derivation, counters } = produceHandoff();
    const bad = alterHandoff(derivation, change);
    // The witness is present, so these exercise actual compiler input/relation checks.
    expect(readRuntimeDerivationHandoff(bad)).toBeDefined();
    expect(() => compileRuntimePlan({ derivation: bad })).toThrow(TypeError);
    expect(counters).toEqual(zeroCalls);
  });

for (const cycle of ["self", "transitive"] as const)
  test(`refuses a genuine provider ${cycle} cycle after references and requirement identities agree`, () => {
    const { derivation, counters } = produceHandoff({ apiOnly: true });
    const bad = alterHandoff(derivation, (h) => {
      const root = h.providers.find(
        ([, p]) => p.id === (cycle === "self" ? "leaf.provider" : "root.provider")
      )!;
      const leaf = h.providers.find(([, p]) => p.id === "leaf.provider")!;
      const owner = { kind: "provider" as const, providerId: leaf[1].id };
      const resource = { resourceId: root[1].provides.id, lifetime: "process" as const };
      const requirement = {
        kind: "normalized.resource-requirement" as const,
        requirementId: resourceRequirementId({ owner, resource, optional: false }),
        owner,
        resource,
        optional: false,
        reason: "cycle",
      };
      return {
        ...h,
        graph: {
          ...h.graph,
          resourceRequirements: [...h.graph.resourceRequirements, requirement].sort((a, b) =>
            a.requirementId.localeCompare(b.requirementId)
          ),
        },
        resourceBindings: [
          ...h.resourceBindings,
          [requirement.requirementId, root[0]] as const,
        ].sort(([a], [b]) => a.localeCompare(b)),
        providers: h.providers.map(
          ([id, p]) =>
            [
              id,
              p === leaf[1]
                ? {
                    ...p,
                    requires: [requireResource({ resource: root[1].provides, reason: "cycle" })],
                  }
                : p,
            ] as const
        ),
      };
    });
    expect(() => compileRuntimePlan({ derivation: bad })).toThrow("dependency cycle");
    expect(counters).toEqual(zeroCalls);
  });

test("plain imported graph or spread copy is not executable derivation authority", () => {
  const { derivation } = produceHandoff();
  const copied = { ...derivation };
  expect(() => compileRuntimePlan({ derivation: copied })).toThrow(TypeError);
  if (false) {
    // @ts-expect-error Independent authoring/graph input is retired.
    compileRuntimePlan({ entrypoint: {}, graph: derivation.graph });
  }
});

for (const missing of [true, false])
  test(`refuses ${missing ? "missing" : "nonfunction"} selected provider build`, () => {
    const { derivation, counters } = produceHandoff();
    const bad = alterHandoff(derivation, (h) => ({
      ...h,
      providers: h.providers.map(([id, provider], i) => {
        if (i !== 0) return [id, provider] as const;
        const copy = { ...provider };
        if (missing) Reflect.deleteProperty(copy, "build");
        else Reflect.set(copy, "build", 7);
        return [id, copy] as const;
      }),
    }));
    expect(() => compileRuntimePlan({ derivation: bad })).toThrow(TypeError);
    expect(counters).toEqual(zeroCalls);
  });

test("cyclic retry delay from real authoring refuses as TypeError before data cloning", () => {
  const { derivation, counters } = produceHandoff({ cyclicPolicy: true });
  expect(() => compileRuntimePlan({ derivation })).toThrow(TypeError);
  expect(counters).toEqual(zeroCalls);
});

test("refuses a rehashed matching server API surface carrying an async execution", () => {
  const { derivation, counters } = produceHandoff();
  const bad = alterHandoff(derivation, (h) => {
    const source = h.graph.surfaceRuntimePlans.find((s) => s.role === "async")!;
    const replacement = {
      ...source,
      role: "server" as const,
      surface: "api.public",
      workflowDispatcherDescriptorIds: [],
    };
    const changed = { ...replacement, surfacePlanId: surfacePlanId(replacement) };
    return {
      ...h,
      graph: {
        ...h.graph,
        plugins: h.graph.plugins.map((p) =>
          p.ownerId === source.pluginOwnerId
            ? { ...p, role: "server" as const, surface: "api.public" }
            : p
        ),
        surfaceRuntimePlans: h.graph.surfaceRuntimePlans
          .map((s) => (s === source ? changed : s))
          .sort((a, b) => a.surfacePlanId.localeCompare(b.surfacePlanId)),
        workflowDispatcherDescriptors: [],
      },
    };
  });
  expect(() => compileRuntimePlan({ derivation: bad })).toThrow(TypeError);
  expect(counters).toEqual(zeroCalls);
});

test("refuses an internally matching schedule-parent ref on workflow surface", () => {
  const { derivation, counters } = produceHandoff();
  const bad = alterHandoff(derivation, (h) => {
    const old = h.graph.executionDescriptorRefs[0]!;
    if (old.boundary !== "plugin.async-step" || !("workflowId" in old))
      throw new Error("Expected workflow fixture");
    const identity = {
      ownerId: old.ownerId,
      boundary: "plugin.async-step" as const,
      scheduleId: old.workflowId,
      stepId: old.stepId,
    };
    const changed = {
      kind: "execution.descriptor-ref" as const,
      executionId: executionDescriptorId(identity),
      ...identity,
    };
    return {
      ...h,
      executionPolicies: h.executionPolicies.map(
        ([ref, policy]) =>
          [ref === old || ref.executionId === old.executionId ? changed : ref, policy] as const
      ),
      graph: {
        ...h.graph,
        executionDescriptorRefs: [changed],
        surfaceRuntimePlans: h.graph.surfaceRuntimePlans.map((s) =>
          s.role === "async" ? { ...s, executionDescriptorRefs: [changed] } : s
        ),
      },
    };
  });
  expect(() => compileRuntimePlan({ derivation: bad })).toThrow(TypeError);
  expect(counters).toEqual(zeroCalls);
});
