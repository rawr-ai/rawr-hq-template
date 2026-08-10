import { describe, expect, test } from "bun:test";
import { Type } from "typebox";

import {
  type AppRole,
  defineApp,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeResource,
  defineService,
  defineWebAppPlugin,
  defineWorkflow,
  Effect,
  type Entrypoint,
  type PluginDefinition,
  requireResource,
  resourceDep,
  type ServiceDefinition,
  type ServiceDependencyDeclaration,
  type ServiceUses,
  semanticDep,
  serviceDep,
  useService,
} from "../../definition/src/index";
import { RuntimeSchema } from "../../schema/src/index";
import {
  deriveNormalizedRuntimeTopology,
  type NormalizedRuntimeTopology,
  type NormalizedRuntimeTopologyEdge,
  NormalizedRuntimeTopologyRuntimeSchema,
} from "../src/index";

interface ColdCounters {
  effect: number;
  loader: number;
  project: number;
}

function makeEntrypoint(
  plugins: readonly PluginDefinition[],
  roles: readonly AppRole[] = ["server"]
): Entrypoint {
  const app = defineApp({ id: "fixture.app", plugins });
  const process = defineProcessCatalog({
    primary: { id: "fixture.process", roles },
  }).primary;
  const profile = defineRuntimeProfile({ id: "fixture.profile", providers: [] });

  return defineEntrypoint({
    id: "fixture.entrypoint",
    app,
    process,
    profile,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "fixture.entrypoint",
      deployment: "opaque://deployment/%2Fdo-not-parse",
      source: "opaque+git:not-a-runtime-locator#selected",
    },
  });
}

function makePlugin(input: {
  readonly id: string;
  readonly role?: AppRole;
  readonly surface?: string;
  readonly capability?: string;
  readonly instance?: string;
  readonly services?: ServiceUses;
  readonly resourceRequirements?: PluginDefinition["resourceRequirements"];
  readonly project?: PluginDefinition["project"];
}): PluginDefinition {
  return definePlugin({
    id: input.id,
    role: input.role ?? "server",
    surface: input.surface ?? "server/api",
    capability: input.capability ?? input.id,
    ...(input.instance === undefined ? {} : { instance: input.instance }),
    services: input.services ?? {},
    resourceRequirements: input.resourceRequirements ?? [],
    project:
      input.project ??
      (({ pluginId }) => ({
        kind: "plugin.projection",
        facts: { pluginId },
      })),
  });
}

function makeOrderedFixture(reverse: boolean, counters: ColdCounters) {
  const sharedResource = defineRuntimeResource<string, Readonly<{ shared: true }>>({
    id: "shared.resource",
    title: "Shared resource",
    purpose: "Prove shared plugin demand",
    defaultLifetime: "role",
    allowedLifetimes: ["role", "process"],
  });
  const upperResource = defineRuntimeResource<string, Readonly<{ upper: true }>>({
    id: "Z.resource",
    title: "Upper resource",
    purpose: "Prove code-unit ordering",
  });
  const serviceResource = defineRuntimeResource<string, Readonly<{ service: true }>>({
    id: "service.only.resource",
    title: "Service resource",
    purpose: "Prove transitive service topology",
  });
  const hiddenResource = defineRuntimeResource<string, Readonly<{ hidden: true }>>({
    id: "hidden.resource",
    title: "Hidden resource",
    purpose: "Must not be discovered outside ServiceUse carriers",
  });

  const leafDependencies = reverse
    ? {
        semantic: semanticDep("Z.adapter"),
        resource: resourceDep(serviceResource),
      }
    : {
        resource: resourceDep(serviceResource),
        semantic: semanticDep("Z.adapter"),
      };
  const leaf = defineService({ id: "leaf.service", deps: leafDependencies });
  const upper = defineService({ id: "Z.branch", deps: { leaf: serviceDep(leaf) } });
  const lower = defineService({ id: "a.branch", deps: { leaf: serviceDep(leaf) } });
  const rootDependencies = reverse
    ? { lower: serviceDep(lower), upper: serviceDep(upper) }
    : { upper: serviceDep(upper), lower: serviceDep(lower) };
  const root = defineService({ id: "root.service", deps: rootDependencies });
  const hidden = defineService({
    id: "hidden.service",
    deps: { hidden: resourceDep(hiddenResource) },
  });
  const services = { root: useService(root, { contract: { root: true } as const }) };

  const sharedRequirement = requireResource({
    resource: sharedResource,
    reason: "shared demand",
  });
  const upperRequirement = requireResource({
    resource: upperResource,
    lifetime: "process",
    role: "server",
    instance: "z-instance",
    reason: "complete resource tuple",
  });

  const upperPluginInput = {
    id: "Z.plugin",
    role: "server" as const,
    surface: "server/api",
    capability: "Z-capability",
    services,
    resourceRequirements: reverse
      ? [sharedRequirement, upperRequirement]
      : [upperRequirement, sharedRequirement],
    hiddenService: hidden,
    project: ({ pluginId }: { readonly pluginId: string }) => {
      counters.project += 1;
      return { kind: "plugin.projection" as const, facts: { pluginId } };
    },
  };
  const upperPlugin = definePlugin(upperPluginInput);
  const lowerPlugin = makePlugin({
    id: "a.plugin",
    role: "desktop",
    surface: "desktop/window",
    capability: "a-capability",
    instance: "secondary",
    services,
    resourceRequirements: [sharedRequirement],
  });

  const step = defineAsyncStepEffect({
    id: "cold-step",
    policy: {},
    effect: () => {
      counters.effect += 1;
      return Effect.succeed("not-run");
    },
  });
  const inputSchema = RuntimeSchema.fromTypeBox(
    Type.Object({ value: Type.String() }, { additionalProperties: false })
  );
  const workflow = defineWorkflow({ id: "cold-workflow", inputSchema, steps: [step] as const });
  const asyncPlugin = defineAsyncWorkflowPlugin.factory()({
    capability: "cold",
    services,
    workflows: [workflow] as const,
  })();
  const webPlugin = defineWebAppPlugin.factory()({
    capability: "cold",
    routes: [
      {
        id: "cold.index",
        path: "/cold",
        module: async () => {
          counters.loader += 1;
          return { mount: "not-run" } as const;
        },
      },
    ] as const,
  })();

  const plugins = reverse
    ? [webPlugin, lowerPlugin, asyncPlugin, upperPlugin]
    : [upperPlugin, asyncPlugin, lowerPlugin, webPlugin];
  const roles = reverse ? (["async", "server"] as const) : (["server", "async"] as const);
  const entrypoint = makeEntrypoint(plugins, roles);

  return {
    entrypoint,
    topology: deriveNormalizedRuntimeTopology({
      entrypoint,
      profileId: entrypoint.profile.id,
    }),
  };
}

function expectRecursivelyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;

  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectRecursivelyFrozen(nested);
}

function expectFreshEquivalent(left: unknown, right: unknown): void {
  expect(right).toEqual(left);
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return;
  }

  expect(right).not.toBe(left);
  const leftRecord = left as Readonly<Record<string, unknown>>;
  const rightRecord = right as Readonly<Record<string, unknown>>;
  for (const key of Object.keys(leftRecord)) {
    expectFreshEquivalent(leftRecord[key], rightRecord[key]);
  }
}

function edgeOfKind<TKind extends NormalizedRuntimeTopologyEdge["kind"]>(
  topology: NormalizedRuntimeTopology,
  kind: TKind
): Extract<NormalizedRuntimeTopologyEdge, { readonly kind: TKind }> {
  const edge = topology.edges.find((candidate) => candidate.kind === kind);
  if (edge === undefined) throw new Error(`Fixture lacks ${kind} edge.`);
  return edge as Extract<NormalizedRuntimeTopologyEdge, { readonly kind: TKind }>;
}

describe("normalized runtime topology", () => {
  test("derives the exact deterministic topology without executing cold declarations", () => {
    const forwardCounters: ColdCounters = { effect: 0, loader: 0, project: 0 };
    const reverseCounters: ColdCounters = { effect: 0, loader: 0, project: 0 };
    const forward = makeOrderedFixture(false, forwardCounters);
    const reverse = makeOrderedFixture(true, reverseCounters);

    expect(forward.topology).toEqual(reverse.topology);
    expect(forward.topology).toEqual({
      identity: {
        app: "fixture.app",
        process: "fixture.process",
        entrypoint: "fixture.entrypoint",
        deployment: "opaque://deployment/%2Fdo-not-parse",
        source: "opaque+git:not-a-runtime-locator#selected",
      },
      profileId: "fixture.profile",
      pluginIdentities: [
        { pluginId: "Z.plugin" },
        { pluginId: "a.plugin", instance: "secondary" },
        { pluginId: "async.workflow.cold" },
        { pluginId: "web.app.cold" },
      ],
      roleRequirements: ["async", "server"],
      surfaceRequirements: [
        {
          plugin: { pluginId: "Z.plugin" },
          role: "server",
          surface: "server/api",
          capability: "Z-capability",
        },
        {
          plugin: { pluginId: "a.plugin", instance: "secondary" },
          role: "desktop",
          surface: "desktop/window",
          capability: "a-capability",
        },
        {
          plugin: { pluginId: "async.workflow.cold" },
          role: "async",
          surface: "async/workflow",
          capability: "cold",
        },
        {
          plugin: { pluginId: "web.app.cold" },
          role: "web",
          surface: "web/app",
          capability: "cold",
        },
      ],
      resourceRequirementIdentities: [
        {
          resourceId: "Z.resource",
          lifetime: "process",
          role: "server",
          instance: "z-instance",
        },
        { resourceId: "shared.resource", lifetime: "role" },
      ],
      edges: [
        { kind: "app.plugin", appId: "fixture.app", plugin: { pluginId: "Z.plugin" } },
        {
          kind: "app.plugin",
          appId: "fixture.app",
          plugin: { pluginId: "a.plugin", instance: "secondary" },
        },
        {
          kind: "app.plugin",
          appId: "fixture.app",
          plugin: { pluginId: "async.workflow.cold" },
        },
        { kind: "app.plugin", appId: "fixture.app", plugin: { pluginId: "web.app.cold" } },
        {
          kind: "plugin.resource",
          plugin: { pluginId: "Z.plugin" },
          resource: {
            resourceId: "Z.resource",
            lifetime: "process",
            role: "server",
            instance: "z-instance",
          },
        },
        {
          kind: "plugin.resource",
          plugin: { pluginId: "Z.plugin" },
          resource: { resourceId: "shared.resource", lifetime: "role" },
        },
        {
          kind: "plugin.resource",
          plugin: { pluginId: "a.plugin", instance: "secondary" },
          resource: { resourceId: "shared.resource", lifetime: "role" },
        },
        {
          kind: "service.resource",
          serviceId: "leaf.service",
          resourceId: "service.only.resource",
        },
        {
          kind: "service.semantic",
          serviceId: "leaf.service",
          adapterId: "Z.adapter",
        },
        {
          kind: "service.service",
          serviceId: "Z.branch",
          dependencyServiceId: "leaf.service",
        },
        {
          kind: "service.service",
          serviceId: "a.branch",
          dependencyServiceId: "leaf.service",
        },
        {
          kind: "service.service",
          serviceId: "root.service",
          dependencyServiceId: "Z.branch",
        },
        {
          kind: "service.service",
          serviceId: "root.service",
          dependencyServiceId: "a.branch",
        },
      ],
    });

    expect(forwardCounters).toEqual({ effect: 0, loader: 0, project: 0 });
    expect(reverseCounters).toEqual({ effect: 0, loader: 0, project: 0 });
    expect(forward.topology.identity).not.toBe(forward.entrypoint.identity);
    expect(forward.topology.edges.some((edge) => edge.kind === ("plugin.service" as string))).toBe(
      false
    );
    expect(
      forward.topology.edges.some(
        (edge) => "serviceId" in edge && edge.serviceId === "hidden.service"
      )
    ).toBe(false);
    expect(
      forward.topology.resourceRequirementIdentities.some(
        (resource) => resource.resourceId === "service.only.resource"
      )
    ).toBe(false);
    expect(NormalizedRuntimeTopologyRuntimeSchema.decode(forward.topology).success).toBe(true);
  });

  test("returns fresh recursively frozen copies on every derivation", () => {
    const counters: ColdCounters = { effect: 0, loader: 0, project: 0 };
    const { entrypoint, topology: first } = makeOrderedFixture(false, counters);
    const second = deriveNormalizedRuntimeTopology({
      entrypoint,
      profileId: entrypoint.profile.id,
    });

    expectFreshEquivalent(first, second);
    expectRecursivelyFrozen(first);
    expectRecursivelyFrozen(second);
    expect(first.identity).not.toBe(entrypoint.identity);
    expect(second.identity).not.toBe(entrypoint.identity);
    expect(second.surfaceRequirements[0]?.plugin).not.toBe(second.pluginIdentities[0]);
    expect(counters).toEqual({ effect: 0, loader: 0, project: 0 });

    const selectedIdentityWithUnownedData = {
      ...entrypoint.identity,
      placementHint: "must-not-cross-the-boundary",
    };
    const exactIdentityTopology = deriveNormalizedRuntimeTopology({
      entrypoint: { ...entrypoint, identity: selectedIdentityWithUnownedData },
      profileId: entrypoint.profile.id,
    });
    expect(Object.keys(exactIdentityTopology.identity)).toEqual([
      "app",
      "process",
      "entrypoint",
      "deployment",
      "source",
    ]);

    if (false) {
      // @ts-expect-error The TypeBox-derived topology root is readonly.
      second.profileId = "other";
      // @ts-expect-error The TypeBox-derived nested identity is readonly.
      second.identity.app = "other";
      // @ts-expect-error Every TypeBox-derived collection is readonly.
      second.pluginIdentities.push({ pluginId: "other" });
      // @ts-expect-error Objects nested inside collections are readonly.
      second.surfaceRequirements[0]!.plugin.pluginId = "other";
    }
  });

  test("sorts absent optional tuple members as empty strings under authored-order reversal", () => {
    const resource = defineRuntimeResource<string, unknown>({
      id: "ordered.resource",
      title: "Ordered resource",
      purpose: "Prove optional resource tuple ordering",
    });
    const requirements = [
      requireResource({ resource, lifetime: "process", reason: "no optional members" }),
      requireResource({
        resource,
        lifetime: "process",
        instance: "resource-instance",
        reason: "instance only",
      }),
      requireResource({
        resource,
        lifetime: "process",
        role: "server",
        reason: "role only",
      }),
      requireResource({
        resource,
        lifetime: "process",
        role: "server",
        instance: "resource-instance",
        reason: "role and instance",
      }),
    ] as const;
    const derive = (reverse: boolean) => {
      const withoutInstance = makePlugin({
        id: "same.plugin",
        resourceRequirements: reverse ? [...requirements].reverse() : requirements,
      });
      const withInstance = makePlugin({ id: "same.plugin", instance: "plugin-instance" });
      const entrypoint = makeEntrypoint(
        reverse ? [withInstance, withoutInstance] : [withoutInstance, withInstance]
      );

      return deriveNormalizedRuntimeTopology({
        entrypoint,
        profileId: entrypoint.profile.id,
      });
    };

    const forward = derive(false);
    const reverse = derive(true);
    const expectedPluginIdentities = [
      { pluginId: "same.plugin" },
      { pluginId: "same.plugin", instance: "plugin-instance" },
    ];
    const expectedResourceIdentities = [
      { resourceId: "ordered.resource", lifetime: "process" },
      {
        resourceId: "ordered.resource",
        lifetime: "process",
        instance: "resource-instance",
      },
      { resourceId: "ordered.resource", lifetime: "process", role: "server" },
      {
        resourceId: "ordered.resource",
        lifetime: "process",
        role: "server",
        instance: "resource-instance",
      },
    ] as const;

    expect(forward).toEqual(reverse);
    expect(forward.pluginIdentities).toEqual(expectedPluginIdentities);
    expect(forward.resourceRequirementIdentities).toEqual(expectedResourceIdentities);
    expect(forward.edges.filter((edge) => edge.kind === "plugin.resource")).toEqual(
      expectedResourceIdentities.map((resourceIdentity) => ({
        kind: "plugin.resource",
        plugin: { pluginId: "same.plugin" },
        resource: resourceIdentity,
      }))
    );
  });

  test("projects tuple-equivalent resource identities from deterministic edge order", () => {
    const resource = defineRuntimeResource<string, unknown>({
      id: "equivalent.resource",
      title: "Equivalent resource",
      purpose: "Prove deterministic projection of tuple-equivalent optionals",
    });
    const withoutInstance = requireResource({ resource, reason: "missing instance" });
    const withEmptyInstance = requireResource({
      resource,
      instance: "",
      reason: "explicit empty instance",
    });
    const first = makePlugin({ id: "a.plugin", resourceRequirements: [withoutInstance] });
    const second = makePlugin({ id: "z.plugin", resourceRequirements: [withEmptyInstance] });
    const derive = (plugins: readonly PluginDefinition[]) => {
      const entrypoint = makeEntrypoint(plugins);
      return deriveNormalizedRuntimeTopology({
        entrypoint,
        profileId: entrypoint.profile.id,
      });
    };

    const forward = derive([first, second]);
    const reverse = derive([second, first]);

    expect(forward).toEqual(reverse);
    expect(forward.resourceRequirementIdentities).toEqual([
      { resourceId: "equivalent.resource", lifetime: "process" },
    ]);
    expect(forward.edges.filter((edge) => edge.kind === "plugin.resource")).toEqual([
      {
        kind: "plugin.resource",
        plugin: { pluginId: "a.plugin" },
        resource: { resourceId: "equivalent.resource", lifetime: "process" },
      },
      {
        kind: "plugin.resource",
        plugin: { pluginId: "z.plugin" },
        resource: { resourceId: "equivalent.resource", lifetime: "process", instance: "" },
      },
    ]);
  });

  test("refuses every selected identity mismatch", () => {
    const { entrypoint } = makeOrderedFixture(false, { effect: 0, loader: 0, project: 0 });
    const mismatchedIdentities = [
      { ...entrypoint.identity, app: "other.app" },
      { ...entrypoint.identity, process: "other.process" },
      { ...entrypoint.identity, entrypoint: "other.entrypoint" },
    ];

    for (const identity of mismatchedIdentities) {
      expect(() =>
        deriveNormalizedRuntimeTopology({
          entrypoint: { ...entrypoint, identity },
          profileId: entrypoint.profile.id,
        })
      ).toThrow();
    }

    expect(() =>
      deriveNormalizedRuntimeTopology({ entrypoint, profileId: "other.profile" })
    ).toThrow();
  });

  test("admits a shared resource diamond but refuses duplicate exact plugin-resource edges", () => {
    const resource = defineRuntimeResource<string, unknown>({
      id: "shared",
      title: "Shared",
      purpose: "Shared",
    });
    const requirement = requireResource({ resource, reason: "shared" });
    const left = makePlugin({ id: "left", resourceRequirements: [requirement] });
    const right = makePlugin({ id: "right", resourceRequirements: [requirement] });
    const admittedEntrypoint = makeEntrypoint([right, left]);
    const admitted = deriveNormalizedRuntimeTopology({
      entrypoint: admittedEntrypoint,
      profileId: admittedEntrypoint.profile.id,
    });

    expect(admitted.resourceRequirementIdentities).toEqual([
      { resourceId: "shared", lifetime: "process" },
    ]);
    expect(admitted.edges.filter((edge) => edge.kind === "plugin.resource")).toHaveLength(2);

    const duplicateEdgePlugin = makePlugin({
      id: "duplicate-edge",
      resourceRequirements: [requirement, requireResource({ resource, reason: "again" })],
    });
    const refusedEntrypoint = makeEntrypoint([duplicateEdgePlugin]);
    expect(() =>
      deriveNormalizedRuntimeTopology({
        entrypoint: refusedEntrypoint,
        profileId: refusedEntrypoint.profile.id,
      })
    ).toThrow();
  });

  test("refuses duplicate plugin identities, role literals, and surface tuples", () => {
    const duplicateIdentityEntrypoint = makeEntrypoint([
      makePlugin({ id: "duplicate", capability: "first" }),
      makePlugin({ id: "duplicate", capability: "second" }),
    ]);
    expect(() =>
      deriveNormalizedRuntimeTopology({
        entrypoint: duplicateIdentityEntrypoint,
        profileId: duplicateIdentityEntrypoint.profile.id,
      })
    ).toThrow();

    const duplicateSurfaceTupleEntrypoint = makeEntrypoint([
      makePlugin({ id: "same", surface: "server/api", capability: "same" }),
      makePlugin({ id: "same", surface: "server/api", capability: "same" }),
    ]);
    expect(() =>
      deriveNormalizedRuntimeTopology({
        entrypoint: duplicateSurfaceTupleEntrypoint,
        profileId: duplicateSurfaceTupleEntrypoint.profile.id,
      })
    ).toThrow();

    const duplicateRoleEntrypoint = makeEntrypoint(
      [makePlugin({ id: "plugin" })],
      ["server", "server"]
    );
    expect(() =>
      deriveNormalizedRuntimeTopology({
        entrypoint: duplicateRoleEntrypoint,
        profileId: duplicateRoleEntrypoint.profile.id,
      })
    ).toThrow();
  });

  test("refuses duplicate exact service edge tuples", () => {
    const resource = defineRuntimeResource<string, unknown>({
      id: "resource",
      title: "Resource",
      purpose: "Resource",
    });
    const dependency = defineService({ id: "dependency", deps: {} });
    const duplicateServices = [
      defineService({
        id: "dependent",
        deps: { first: serviceDep(dependency), second: serviceDep(dependency) },
      }),
      defineService({
        id: "dependent",
        deps: { first: resourceDep(resource), second: resourceDep(resource) },
      }),
      defineService({
        id: "dependent",
        deps: { first: semanticDep("adapter"), second: semanticDep("adapter") },
      }),
    ];

    for (const service of duplicateServices) {
      const plugin = makePlugin({
        id: `plugin.${service.deps["first"]?.kind}`,
        services: { service: useService(service, { contract: {} }) },
      });
      const entrypoint = makeEntrypoint([plugin]);
      expect(() =>
        deriveNormalizedRuntimeTopology({ entrypoint, profileId: entrypoint.profile.id })
      ).toThrow();
    }
  });

  test("refuses self-loops and longer service cycles under authored-order permutations", () => {
    type MutableService = {
      kind: "service.definition";
      id: string;
      deps: Record<string, ServiceDependencyDeclaration>;
    };
    const asDefinition = (service: MutableService) => service as unknown as ServiceDefinition;

    for (const reverse of [false, true]) {
      const self: MutableService = { kind: "service.definition", id: "self", deps: {} };
      self.deps = reverse
        ? { semantic: semanticDep("adapter"), self: serviceDep(asDefinition(self)) }
        : { self: serviceDep(asDefinition(self)), semantic: semanticDep("adapter") };
      const entrypoint = makeEntrypoint([
        makePlugin({
          id: `self.${reverse}`,
          services: { self: useService(asDefinition(self), { contract: {} }) },
        }),
      ]);
      expect(() =>
        deriveNormalizedRuntimeTopology({ entrypoint, profileId: entrypoint.profile.id })
      ).toThrow();
    }

    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ] as const;
    for (const [first, second, third] of permutations) {
      const services: MutableService[] = [
        { kind: "service.definition", id: "a", deps: {} },
        { kind: "service.definition", id: "b", deps: {} },
        { kind: "service.definition", id: "c", deps: {} },
      ];
      services[0]!.deps = {
        next: serviceDep(asDefinition(services[1]!)),
        semantic: semanticDep("a.adapter"),
      };
      services[1]!.deps = {
        semantic: semanticDep("b.adapter"),
        next: serviceDep(asDefinition(services[2]!)),
      };
      services[2]!.deps = { next: serviceDep(asDefinition(services[0]!)) };
      const ordered = [services[first]!, services[second]!, services[third]!];
      const uses = Object.fromEntries(
        ordered.map((service) => [service.id, useService(asDefinition(service), { contract: {} })])
      );
      const entrypoint = makeEntrypoint([
        makePlugin({ id: `cycle.${first}${second}${third}`, services: uses }),
      ]);

      expect(() =>
        deriveNormalizedRuntimeTopology({ entrypoint, profileId: entrypoint.profile.id })
      ).toThrow();
    }
  });

  test("rejects surplus data at every nested object schema location and unknown edges", () => {
    const { topology } = makeOrderedFixture(false, { effect: 0, loader: 0, project: 0 });
    const appPlugin = edgeOfKind(topology, "app.plugin");
    const pluginResource = edgeOfKind(topology, "plugin.resource");
    const serviceService = edgeOfKind(topology, "service.service");
    const serviceResource = edgeOfKind(topology, "service.resource");
    const serviceSemantic = edgeOfKind(topology, "service.semantic");

    const surplusCandidates: readonly unknown[] = [
      { ...topology, surplus: true },
      { ...topology, identity: { ...topology.identity, surplus: true } },
      {
        ...topology,
        pluginIdentities: [
          { ...topology.pluginIdentities[0]!, surplus: true },
          ...topology.pluginIdentities.slice(1),
        ],
      },
      {
        ...topology,
        surfaceRequirements: [
          { ...topology.surfaceRequirements[0]!, surplus: true },
          ...topology.surfaceRequirements.slice(1),
        ],
      },
      {
        ...topology,
        surfaceRequirements: [
          {
            ...topology.surfaceRequirements[0]!,
            plugin: { ...topology.surfaceRequirements[0]!.plugin, surplus: true },
          },
          ...topology.surfaceRequirements.slice(1),
        ],
      },
      {
        ...topology,
        resourceRequirementIdentities: [
          { ...topology.resourceRequirementIdentities[0]!, surplus: true },
          ...topology.resourceRequirementIdentities.slice(1),
        ],
      },
      { ...topology, edges: [{ ...appPlugin, surplus: true }] },
      {
        ...topology,
        edges: [{ ...appPlugin, plugin: { ...appPlugin.plugin, surplus: true } }],
      },
      { ...topology, edges: [{ ...pluginResource, surplus: true }] },
      {
        ...topology,
        edges: [{ ...pluginResource, plugin: { ...pluginResource.plugin, surplus: true } }],
      },
      {
        ...topology,
        edges: [{ ...pluginResource, resource: { ...pluginResource.resource, surplus: true } }],
      },
      { ...topology, edges: [{ ...serviceService, surplus: true }] },
      { ...topology, edges: [{ ...serviceResource, surplus: true }] },
      { ...topology, edges: [{ ...serviceSemantic, surplus: true }] },
    ];

    for (const candidate of surplusCandidates) {
      expect(NormalizedRuntimeTopologyRuntimeSchema.decode(candidate).success).toBe(false);
    }

    const unknownEdge = {
      ...topology,
      edges: [
        {
          kind: "plugin.service",
          plugin: { pluginId: "Z.plugin" },
          serviceId: "root.service",
        },
      ],
    };
    expect(NormalizedRuntimeTopologyRuntimeSchema.decode(unknownEdge).success).toBe(false);
  });

  test("rejects invalid role and lifetime enum values at every topology projection", () => {
    const { topology } = makeOrderedFixture(false, { effect: 0, loader: 0, project: 0 });
    const surfaceRequirement = topology.surfaceRequirements[0]!;
    const resourceRequirement = topology.resourceRequirementIdentities[0]!;
    const pluginResource = edgeOfKind(topology, "plugin.resource");
    const invalidRoleCandidates: readonly unknown[] = [
      { ...topology, roleRequirements: ["invalid-role"] },
      {
        ...topology,
        surfaceRequirements: [{ ...surfaceRequirement, role: "invalid-role" }],
      },
      {
        ...topology,
        resourceRequirementIdentities: [{ ...resourceRequirement, role: "invalid-role" }],
      },
      {
        ...topology,
        edges: [
          {
            ...pluginResource,
            resource: { ...pluginResource.resource, role: "invalid-role" },
          },
        ],
      },
    ];
    const invalidLifetimeCandidates: readonly unknown[] = [
      {
        ...topology,
        resourceRequirementIdentities: [{ ...resourceRequirement, lifetime: "invalid-lifetime" }],
      },
      {
        ...topology,
        edges: [
          {
            ...pluginResource,
            resource: { ...pluginResource.resource, lifetime: "invalid-lifetime" },
          },
        ],
      },
    ];

    for (const candidate of [...invalidRoleCandidates, ...invalidLifetimeCandidates]) {
      expect(NormalizedRuntimeTopologyRuntimeSchema.decode(candidate).success).toBe(false);
    }
  });
});
