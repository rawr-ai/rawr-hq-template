import { describe, expect, test } from "bun:test";

import {
  type ProviderSelection as AuthoredProviderSelection,
  defineApp,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  type Entrypoint,
  providerSelection,
  type RuntimeProvider,
  requireResource,
  runtimeLaunchIdentity,
} from "../../definition/src/index";
import {
  pluginOwnerId,
  providerSelectionId,
  resourceRequirementId,
} from "../../derivation/src/identity-policy";
import { deriveRuntimeArtifacts } from "../../derivation/src/index";
import type { NormalizedAuthoringGraph } from "../../derivation/src/normalized-authoring-graph";
import { compileRuntimePlan, type RuntimeCompilationInput } from "../src/index";

type ProviderCycle = "self" | "transitive";

const compareStrings = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

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
