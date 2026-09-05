import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { Effect as NativeEffect } from "effect";
import { Type } from "typebox";

import {
  defineApp,
  defineAsyncConsumerPlugin,
  defineAsyncSchedulePlugin,
  defineAsyncStepEffect,
  defineAsyncWorkflowPlugin,
  defineConsumer,
  defineEntrypoint,
  definePlugin,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineSchedule,
  defineService,
  defineWebAppPlugin,
  defineWorkflow,
  Effect,
  providerFx,
  providerSelection,
  requireResource,
  resourceDep,
  semanticDep,
  serviceDep,
  useService,
} from "../../definition/src/index";
import { RuntimeSchema } from "../../schema/src/index";
import { createExecutionDescriptorTable } from "../src/derive-execution-descriptor-table";
import type { ExecutionDescriptorIdentityInput } from "../src/execution-descriptor-ref";
import {
  canonicalJson,
  executionDescriptorId,
  pluginOwnerId,
  portableArtifactId,
  providerSelectionId,
  resourceRequirementId,
  semanticDependencyId,
  serviceBindingId,
  serviceDependencyId,
  serviceUseId,
  surfacePlanId,
  workflowDispatcherId,
} from "../src/identity-policy";
import {
  decodePortableRuntimePlanArtifact,
  deriveRuntimeArtifacts,
  type ExecutionDescriptorRef,
  type PortableRuntimePlanArtifact,
  type RuntimeDerivationResult,
} from "../src/index";
import {
  type NormalizedJsonObject,
  NormalizedJsonObjectSchema,
  NormalizedJsonValueSchema,
} from "../src/normalized-authoring-graph";
import { createWebRouteModuleTable } from "../src/web-route-module-table";
import { coldService } from "./support/cold-service";

type TypesEqual<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
      ? true
      : false
    : false;

type Assert<T extends true> = T;

function inheritRequiredValuesWithOwnSubstitutes<T extends object>(
  prototype: T,
  ownKeyCount: number
): T {
  const candidate = Object.create(prototype) as Record<string, unknown>;
  for (let index = 0; index < ownKeyCount; index += 1) {
    candidate[`substitute${index}`] = index;
  }
  return candidate as T;
}

function retainOwnDataWithForeignPrototype<T extends object>(value: T): T {
  return Object.setPrototypeOf({ ...value }, {}) as T;
}

const LaneSchema = RuntimeSchema.fromTypeBox(
  Type.Object({ value: Type.String() }, { additionalProperties: false })
);

interface FixtureOptions {
  readonly ambiguousProcessProvider?: boolean;
  readonly divergentDiamond?: boolean;
  readonly invalidSourcePath?: string;
  readonly omitProcessProvider?: boolean;
  readonly processDefaults?: Readonly<Record<string, unknown>>;
  readonly unusedOverride?: boolean;
}

function makeFixture(options: FixtureOptions = {}) {
  let effectCalls = 0;
  let loaderCalls = 0;
  let providerBuildCalls = 0;
  const processResource = defineRuntimeResource<string, unknown>({
    id: "database.pool",
    title: "Database pool",
    purpose: "Fixture process resource",
    defaultLifetime: "process",
  });
  const roleResource = defineRuntimeResource<string, unknown>({
    id: "role.cache",
    title: "Role cache",
    purpose: "Fixture role resource",
    defaultLifetime: "role",
  });
  const optionalResource = defineRuntimeResource<string, unknown>({
    id: "optional.metrics",
    title: "Optional metrics",
    purpose: "Fixture optional resource",
  });

  const shared = coldService(
    defineService({
      id: "fixture.shared",
      deps: { database: resourceDep(processResource) },
      scope: LaneSchema,
      config: LaneSchema,
    })
  );
  const left = coldService(
    defineService({
      id: "fixture.left",
      deps: { shared: serviceDep(shared) },
      scope: LaneSchema,
      config: LaneSchema,
    })
  );
  const right = coldService(
    defineService({
      id: "fixture.right",
      deps: { shared: serviceDep(shared) },
      scope: LaneSchema,
      config: LaneSchema,
    })
  );
  const root = coldService(
    defineService({
      id: "fixture.root",
      deps: {
        cache: resourceDep(roleResource),
        left: serviceDep(left),
        right: serviceDep(right),
        telemetry: semanticDep("fixture.telemetry"),
      },
      scope: LaneSchema,
      config: LaneSchema,
    })
  );
  const binding = {
    scope: { kind: "runtime.config" as const, key: "ROOT_SCOPE" },
    config: { kind: "runtime.config" as const, key: "ROOT_CONFIG" },
    dependencies: {
      left: {
        scope: { kind: "runtime.config" as const, key: "BRANCH_SCOPE" },
        ...(options.divergentDiamond
          ? {
              dependencies: {
                shared: { config: { kind: "runtime.config" as const, key: "LEFT_CONFIG" } },
              },
            }
          : options.unusedOverride
            ? { dependencies: { shared: {} } }
            : {}),
      },
      right: {
        scope: { kind: "runtime.config" as const, key: "BRANCH_SCOPE" },
        ...(options.divergentDiamond
          ? {
              dependencies: {
                shared: { config: { kind: "runtime.config" as const, key: "RIGHT_CONFIG" } },
              },
            }
          : {}),
      },
    },
  };

  const authoredStep = defineAsyncStepEffect({
    id: "send",
    policy: { interruptible: true },
    effect: () => {
      effectCalls += 1;
      return Effect.succeed("sent");
    },
  });
  const firstWorkflow = defineWorkflow({
    id: "alpha",
    inputSchema: LaneSchema,
    steps: [authoredStep] as const,
  });
  const secondWorkflow = defineWorkflow({
    id: "zeta",
    inputSchema: LaneSchema,
    steps: [authoredStep] as const,
  });
  const asyncPlugin = defineAsyncWorkflowPlugin.factory()({
    capability: "jobs",
    services: { root: useService(root, { binding }) },
    resourceRequirements: [
      requireResource({
        resource: optionalResource,
        optional: true,
        reason: "Optional metrics",
      }),
    ] as const,
    workflows: [secondWorkflow, firstWorkflow] as const,
  })();
  const serverPlugin = definePlugin({
    id: "fixture.server",
    role: "server",
    surface: "server/internal",
    capability: "fixture-server",
    services: { root: useService(root, { binding }) },
    resourceRequirements: [],
    project: ({ pluginId }) => ({ kind: "plugin.projection", facts: { pluginId } }),
  });
  const loader = async () => {
    loaderCalls += 1;
    return { page: "fixture" } as const;
  };
  const webPlugin = defineWebAppPlugin.factory()({
    capability: "fixture",
    routes: [{ id: "fixture.index", path: "/fixture", module: loader }] as const,
  })();

  const buildProvider = () => {
    providerBuildCalls += 1;
    return providerFx.acquireRelease({
      acquire: providerFx.succeed<unknown>({}),
      release: () => providerFx.succeed(undefined),
    });
  };

  const processProvider = defineRuntimeProvider({
    id: "fixture.database-provider",
    title: "Database provider",
    provides: processResource,
    requires: [],
    configSchema: LaneSchema,
    defaultConfigKey: "DATABASE_CONFIG",
    build: buildProvider,
  });
  const alternateProcessProvider = defineRuntimeProvider({
    id: "fixture.alternate-database-provider",
    title: "Alternate database provider",
    provides: processResource,
    requires: [],
    configSchema: LaneSchema,
    defaultConfigKey: "ALTERNATE_DATABASE_CONFIG",
    build: buildProvider,
  });
  const roleProvider = defineRuntimeProvider({
    id: "fixture.role-provider",
    title: "Role provider",
    provides: roleResource,
    requires: [],
    build: buildProvider,
  });
  const selections = [
    ...(options.omitProcessProvider
      ? []
      : [providerSelection({ resource: processResource, provider: processProvider })]),
    ...(options.ambiguousProcessProvider
      ? [
          providerSelection({
            resource: processResource,
            provider: alternateProcessProvider,
          }),
        ]
      : []),
    providerSelection({
      resource: roleResource,
      provider: roleProvider,
      lifetime: "role",
      role: "async",
    }),
    providerSelection({
      resource: roleResource,
      provider: roleProvider,
      lifetime: "role",
      role: "server",
    }),
  ];
  const profile = defineRuntimeProfile({
    id: "fixture.profile",
    providers: selections,
    configSources: [
      { kind: "test" },
      { kind: "env", prefix: "HABITAT_" },
      { kind: "dotenv" },
      { kind: "file", path: options.invalidSourcePath ?? "config/runtime.json" },
      { kind: "memory" },
    ],
    processDefaults: options.processDefaults ?? {
      retries: 2,
      nested: { enabled: true, labels: ["a", null] },
    },
    harnesses: ["web", "async"],
  });
  const app = defineApp({
    id: "fixture.app",
    plugins: [webPlugin, serverPlugin, asyncPlugin],
  });
  const process = defineProcessCatalog({
    application: { id: "fixture.process", roles: ["web", "server", "async"] },
  }).application;
  const entrypoint = defineEntrypoint({
    id: "fixture.entrypoint",
    app,
    profile,
    process,
    identity: {
      app: "fixture.app",
      process: "fixture.process",
      entrypoint: "fixture.entrypoint",
      deployment: "fixture",
      source: "complete-derivation-test",
    },
  });

  return {
    counters: () => ({ effectCalls, loaderCalls, providerBuildCalls }),
    entrypoint,
    loader,
    profileId: profile.id,
  };
}

const ZERO_FIXTURE_CALLS = {
  effectCalls: 0,
  loaderCalls: 0,
  providerBuildCalls: 0,
} as const;

function expectRecursivelyFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectRecursivelyFrozen(nested);
}

const goldenOwnerId = `plugin-owner:sha256:${"a".repeat(64)}`;

function makeExecutionRef(identity: ExecutionDescriptorIdentityInput): ExecutionDescriptorRef {
  return {
    kind: "execution.descriptor-ref",
    executionId: executionDescriptorId(identity),
    ...identity,
  } as ExecutionDescriptorRef;
}

function makePortableArtifact(
  executionDescriptorRefs: readonly ExecutionDescriptorRef[]
): PortableRuntimePlanArtifact {
  const withoutId = {
    kind: "portable.runtime-plan-artifact" as const,
    identity: {
      app: "golden.app",
      process: "golden.process",
      entrypoint: "golden.entrypoint",
      deployment: "test",
      source: "golden-source",
    },
    profileId: "golden.profile",
    roles: ["async", "web"] as const,
    surfaces: [
      {
        plugin: { pluginId: "golden.plugin", instance: "primary" },
        role: "async" as const,
        surface: "async/workflow",
        capability: "jobs",
      },
    ],
    executionDescriptorRefs,
  };
  return {
    ...withoutId,
    artifactId: portableArtifactId(withoutId),
  };
}

describe("complete runtime derivation", () => {
  test("derives the complete cold graph, disjoint tables, bindings, and sole finding", () => {
    const fixture = makeFixture();
    const result = deriveRuntimeArtifacts({
      entrypoint: fixture.entrypoint,
      profileId: fixture.profileId,
    });

    expect(Object.keys(result).sort()).toEqual([
      "executionDescriptorTable",
      "graph",
      "portableArtifact",
      "topology",
      "webRouteModuleTable",
    ]);
    expect(result.graph.topology).toBe(result.topology);
    expect(result.graph.profile.configSources).toEqual([
      { kind: "test" },
      { kind: "env", prefix: "HABITAT_" },
      { kind: "dotenv", path: ".env", optional: false },
      { kind: "file", path: "config/runtime.json", optional: false },
      { kind: "memory" },
    ]);
    expect(result.graph.profile.providerSelections).toHaveLength(3);
    expect(result.graph.resourceRequirements).toHaveLength(4);
    expect(result.graph.findings).toEqual([
      {
        kind: "derivation.finding",
        code: "provider-selection.optional-missing",
        requirementId: expect.stringMatching(/^resource-requirement:sha256:[0-9a-f]{64}$/),
        resource: {
          resourceId: "optional.metrics",
          lifetime: "process",
        },
      },
    ]);

    const databaseRequirements = result.graph.resourceRequirements.filter(
      (requirement) => requirement.resource.resourceId === "database.pool"
    );
    const roleRequirements = result.graph.resourceRequirements.filter(
      (requirement) => requirement.resource.resourceId === "role.cache"
    );
    expect(databaseRequirements).toHaveLength(1);
    expect(databaseRequirements[0]).toMatchObject({
      owner: { kind: "service", serviceId: "fixture.shared", localName: "database" },
      optional: false,
      reason: "database",
      resource: { lifetime: "process" },
    });
    expect(roleRequirements.map((requirement) => requirement.resource.role).sort()).toEqual([
      "async",
      "server",
    ]);
    expect(result.graph.serviceBindingPlans).toHaveLength(8);
    expect(
      result.graph.serviceBindingPlans.filter((plan) => plan.serviceId === "fixture.shared")
    ).toHaveLength(2);

    const branchPlan = result.graph.serviceBindingPlans.find(
      (plan) => plan.role === "async" && plan.serviceId === "fixture.shared"
    );
    expect(branchPlan?.scopeRef).toMatchObject({
      kind: "runtime.config-ref",
      key: "BRANCH_SCOPE",
    });
    expect(branchPlan?.scopeRef?.sources).toHaveLength(5);
    expect(branchPlan?.scopeRef?.sources[0]).toEqual({
      kind: "runtime.config.test",
      key: "BRANCH_SCOPE",
    });
    expect(branchPlan?.scopeRef?.sources[1]).toEqual({
      kind: "runtime.config.env",
      key: "BRANCH_SCOPE",
      name: "HABITAT_BRANCH_SCOPE",
    });
    expect(branchPlan?.configRef?.key).toBe("ROOT_CONFIG");

    const executionEntries = result.executionDescriptorTable.entries();
    const webEntries = result.webRouteModuleTable.entries();
    expect(executionEntries).toHaveLength(2);
    expect(executionEntries.map(([ref]) => "workflowId" in ref && ref.workflowId)).toEqual([
      "alpha",
      "zeta",
    ]);
    expect(executionEntries[0]?.[1]).not.toBe(executionEntries[1]?.[1]);
    expect(result.executionDescriptorTable.entries()).toBe(executionEntries);
    expect(result.webRouteModuleTable.entries()).toBe(webEntries);
    expect(webEntries).toHaveLength(1);
    expect(result.webRouteModuleTable.get({ ...webEntries[0]!.ref })).toBe(fixture.loader);
    expect(result.executionDescriptorTable.get({ ...executionEntries[0]![0] })).toBe(
      executionEntries[0]![1]
    );
    const mismatchedRef: ExecutionDescriptorRef = {
      ...executionEntries[0]![0],
      executionId: "execution-descriptor:sha256:" + "0".repeat(64),
    };
    expect(() => result.executionDescriptorTable.get(mismatchedRef)).toThrow(TypeError);
    expect(result.graph.executionDescriptorRefs).toHaveLength(2);
    expect(result.graph.webRouteModuleRefs).toHaveLength(1);
    expect(result.portableArtifact.executionDescriptorRefs).toHaveLength(2);
    expect(result.portableArtifact).not.toHaveProperty("webRouteModuleRefs");

    const asyncSurface = result.graph.surfaceRuntimePlans.find(
      (plan) => plan.surface === "async/workflow"
    );
    const serverSurface = result.graph.surfaceRuntimePlans.find(
      (plan) => plan.surface === "server/internal"
    );
    expect(asyncSurface?.workflowDispatcherDescriptorIds).toHaveLength(1);
    expect(serverSurface?.workflowDispatcherDescriptorIds).toEqual([]);
    expect(fixture.counters()).toEqual(ZERO_FIXTURE_CALLS);
    expectRecursivelyFrozen(result.topology);
    expectRecursivelyFrozen(result.graph);
    expectRecursivelyFrozen(result.portableArtifact);
    expect(Object.isFrozen(executionEntries)).toBe(true);
    expect(Object.isFrozen(webEntries)).toBe(true);
  });

  test("completes the real selection handoff and defensively refuses every disagreement", () => {
    const { counters, entrypoint, profileId } = makeFixture();
    const result = deriveRuntimeArtifacts({ entrypoint, profileId });

    expect(result.topology.identity).toEqual(entrypoint.identity);
    expect(result.topology.profileId).toBe(profileId);
    expect(counters()).toEqual(ZERO_FIXTURE_CALLS);

    const appMismatch = Object.freeze({
      ...entrypoint,
      identity: Object.freeze({ ...entrypoint.identity, app: "corrupt.app" }),
    });
    let appMismatchResult: RuntimeDerivationResult | undefined;
    expect(() => {
      appMismatchResult = deriveRuntimeArtifacts({
        entrypoint: appMismatch,
        profileId,
      });
    }).toThrow(TypeError);
    expect(appMismatchResult).toBeUndefined();
    expect(counters()).toEqual(ZERO_FIXTURE_CALLS);

    const processMismatch = Object.freeze({
      ...entrypoint,
      identity: Object.freeze({ ...entrypoint.identity, process: "corrupt.process" }),
    });
    let processMismatchResult: RuntimeDerivationResult | undefined;
    expect(() => {
      processMismatchResult = deriveRuntimeArtifacts({
        entrypoint: processMismatch,
        profileId,
      });
    }).toThrow(TypeError);
    expect(processMismatchResult).toBeUndefined();
    expect(counters()).toEqual(ZERO_FIXTURE_CALLS);

    const entrypointMismatch = Object.freeze({
      ...entrypoint,
      identity: Object.freeze({ ...entrypoint.identity, entrypoint: "corrupt.entrypoint" }),
    });
    let entrypointMismatchResult: RuntimeDerivationResult | undefined;
    expect(() => {
      entrypointMismatchResult = deriveRuntimeArtifacts({
        entrypoint: entrypointMismatch,
        profileId,
      });
    }).toThrow(TypeError);
    expect(entrypointMismatchResult).toBeUndefined();
    expect(counters()).toEqual(ZERO_FIXTURE_CALLS);

    let profileMismatchResult: RuntimeDerivationResult | undefined;
    expect(() => {
      profileMismatchResult = deriveRuntimeArtifacts({
        entrypoint,
        profileId: "corrupt.profile",
      });
    }).toThrow(TypeError);
    expect(profileMismatchResult).toBeUndefined();
    expect(counters()).toEqual(ZERO_FIXTURE_CALLS);
  });

  test("returns fresh deterministic schema data while preserving table executable references", () => {
    const firstFixture = makeFixture();
    const secondFixture = makeFixture();
    const first = deriveRuntimeArtifacts({
      entrypoint: firstFixture.entrypoint,
      profileId: firstFixture.profileId,
    });
    const second = deriveRuntimeArtifacts({
      entrypoint: secondFixture.entrypoint,
      profileId: secondFixture.profileId,
    });

    expect(second.graph).toEqual(first.graph);
    expect(second.portableArtifact).toEqual(first.portableArtifact);
    expect(second.graph).not.toBe(first.graph);
    expect(second.graph.profile).not.toBe(first.graph.profile);
    expect(second.portableArtifact).not.toBe(first.portableArtifact);
    expect(first.webRouteModuleTable.entries()[0]?.load).toBe(firstFixture.loader);
    expect(firstFixture.counters()).toEqual(ZERO_FIXTURE_CALLS);
    expect(secondFixture.counters()).toEqual(ZERO_FIXTURE_CALLS);
  });

  test("lowers every async parent occurrence to a distinct lazy operational descriptor", async () => {
    const contexts: unknown[] = [];
    const directProgram = Effect.succeed("direct");
    const generatedProgram = Effect.succeed("generated");
    const direct = defineAsyncStepEffect({
      id: "shared-direct",
      policy: {},
      effect: (context) => {
        contexts.push(context);
        return directProgram;
      },
    });
    const generated = defineAsyncStepEffect({
      id: "shared-generator",
      policy: {},
      effect: function* (context) {
        contexts.push(context);
        return yield* generatedProgram;
      },
    });
    const workflowPlugin = defineAsyncWorkflowPlugin.factory()({
      capability: "lazy-workflow",
      services: {},
      workflows: [
        defineWorkflow({
          id: "workflow",
          inputSchema: LaneSchema,
          steps: [direct, generated] as const,
        }),
      ] as const,
    })();
    const schedulePlugin = defineAsyncSchedulePlugin.factory()({
      capability: "lazy-schedule",
      services: {},
      schedules: [
        defineSchedule({ id: "schedule", cron: "* * * * *", steps: [direct] as const }),
      ] as const,
    })();
    const consumerPlugin = defineAsyncConsumerPlugin.factory()({
      capability: "lazy-consumer",
      services: {},
      consumers: [
        defineConsumer({
          id: "consumer",
          eventName: "fixture.event",
          eventSchema: LaneSchema,
          steps: [generated] as const,
        }),
      ] as const,
    })();
    const profile = defineRuntimeProfile({ id: "lazy", providers: [] });
    const app = defineApp({
      id: "lazy",
      plugins: [consumerPlugin, workflowPlugin, schedulePlugin],
    });
    const process = defineProcessCatalog({
      application: { id: "lazy", roles: ["async"] },
    }).application;
    const entrypoint = defineEntrypoint({
      id: "lazy",
      app,
      profile,
      process,
      identity: {
        app: "lazy",
        process: "lazy",
        entrypoint: "lazy",
        deployment: "test",
        source: "lazy-lowering",
      },
    });

    const result = deriveRuntimeArtifacts({ entrypoint, profileId: "lazy" });
    const entries = result.executionDescriptorTable.entries();
    expect(entries).toHaveLength(4);
    expect(new Set(entries.map(([ref]) => ref.executionId))).toHaveProperty("size", 4);
    expect(contexts).toEqual([]);

    const directEntry = entries.find(
      ([ref]) =>
        ref.boundary === "plugin.async-step" &&
        "workflowId" in ref &&
        ref.stepId === "shared-direct"
    );
    if (directEntry === undefined) throw new Error("Fixture lacks the direct workflow entry.");
    const context = Object.freeze({ exact: true });
    const cold = directEntry[1].run({ input: Object.freeze({ ignored: true }), context });
    expect(contexts).toEqual([]);
    expect(NativeEffect.isEffect(cold)).toBe(true);
    expect(await NativeEffect.runPromise(cold as NativeEffect.Effect<unknown>)).toBe("direct");
    expect(contexts).toEqual([context]);
    expect(directEntry[1].policy).toBe(direct.policy);

    const generatedEntry = entries.find(
      ([ref]) =>
        ref.boundary === "plugin.async-step" &&
        "workflowId" in ref &&
        ref.stepId === "shared-generator"
    );
    if (generatedEntry === undefined)
      throw new Error("Fixture lacks the generator workflow entry.");
    const generatedCold = generatedEntry[1].run({
      input: Object.freeze({ ignored: true }),
      context,
    });
    expect(NativeEffect.isEffect(generatedCold)).toBe(true);
    expect(contexts).toEqual([context]);
    expect(await NativeEffect.runPromise(generatedCold as NativeEffect.Effect<unknown>)).toBe(
      "generated"
    );
    expect(contexts).toEqual([context, context]);
    expect(generatedEntry[1].policy).toBe(generated.policy);
    expect(
      entries
        .filter(([, descriptor]) => descriptor.policy === direct.policy)
        .map(([ref]) => ref.boundary === "plugin.async-step" && ref.stepId)
    ).toEqual(["shared-direct", "shared-direct"]);
    expect(
      entries
        .filter(([, descriptor]) => descriptor.policy === generated.policy)
        .map(([ref]) => ref.boundary === "plugin.async-step" && ref.stepId)
    ).toEqual(["shared-generator", "shared-generator"]);
  });

  test("roundtrips only a canonical seven-field portable artifact", () => {
    const fixture = makeFixture();
    const result = deriveRuntimeArtifacts({
      entrypoint: fixture.entrypoint,
      profileId: fixture.profileId,
    });
    const decoded = decodePortableRuntimePlanArtifact(result.portableArtifact);

    expect(Object.keys(decoded)).toEqual([
      "kind",
      "artifactId",
      "identity",
      "profileId",
      "roles",
      "surfaces",
      "executionDescriptorRefs",
    ]);
    expect(decoded).toEqual(result.portableArtifact);
    expect(decoded).not.toBe(result.portableArtifact);
    expect(decoded.artifactId).toMatch(/^sha256:[0-9a-f]{64}$/);
    expectRecursivelyFrozen(decoded);

    expect(() =>
      decodePortableRuntimePlanArtifact({ ...result.portableArtifact, surplus: true })
    ).toThrow(TypeError);
    expect(() =>
      decodePortableRuntimePlanArtifact({
        ...result.portableArtifact,
        artifactId: "sha256:" + "0".repeat(64),
      })
    ).toThrow(TypeError);
    expect(() =>
      decodePortableRuntimePlanArtifact({
        ...result.portableArtifact,
        roles: [...result.portableArtifact.roles].reverse(),
      })
    ).toThrow(TypeError);
  });

  test("rejects inherited and non-data substitutions at every public artifact boundary", () => {
    const fixture = makeFixture();
    const result = deriveRuntimeArtifacts({
      entrypoint: fixture.entrypoint,
      profileId: fixture.profileId,
    });
    const executionEntries = result.executionDescriptorTable.entries();
    const webEntry = result.webRouteModuleTable.entries()[0]!;

    expect(() =>
      result.executionDescriptorTable.get(
        Object.create(executionEntries[0]![0]) as ExecutionDescriptorRef
      )
    ).toThrow(TypeError);
    expect(() =>
      result.webRouteModuleTable.get(Object.create(webEntry.ref) as typeof webEntry.ref)
    ).toThrow(TypeError);

    const inheritedWebRef = Object.create(webEntry.ref) as typeof webEntry.ref;
    expect(() =>
      // The loader is cold; refusal must happen before it can be admitted to a table.
      result.webRouteModuleTable.get(inheritedWebRef)
    ).toThrow(TypeError);
    expect(() =>
      createWebRouteModuleTable([{ ref: inheritedWebRef, load: webEntry.load }])
    ).toThrow(TypeError);
    const substitutedInheritedWebRef = inheritRequiredValuesWithOwnSubstitutes(webEntry.ref, 4);
    expect(() => result.webRouteModuleTable.get(substitutedInheritedWebRef)).toThrow(TypeError);
    expect(() =>
      createWebRouteModuleTable([{ ref: substitutedInheritedWebRef, load: webEntry.load }])
    ).toThrow(TypeError);
    const foreignPrototypeWebRef = retainOwnDataWithForeignPrototype(webEntry.ref);
    expect(() => result.webRouteModuleTable.get(foreignPrototypeWebRef)).toThrow(TypeError);
    expect(() =>
      createWebRouteModuleTable([{ ref: foreignPrototypeWebRef, load: webEntry.load }])
    ).toThrow(TypeError);

    const invalidWebRefs: unknown[] = [
      { ...webEntry.ref, surplus: true },
      { ...webEntry.ref, [Symbol("surplus")]: true },
    ];
    const accessorWebRef = { ...webEntry.ref };
    Object.defineProperty(accessorWebRef, "ownerId", {
      enumerable: true,
      get: () => {
        throw new Error("The web-reference accessor must not run.");
      },
    });
    invalidWebRefs.push(accessorWebRef);
    const nonEnumerableWebRef = { ...webEntry.ref };
    Object.defineProperty(nonEnumerableWebRef, "kind", {
      enumerable: false,
      value: webEntry.ref.kind,
    });
    invalidWebRefs.push(nonEnumerableWebRef);
    for (const invalidWebRef of invalidWebRefs) {
      expect(() => result.webRouteModuleTable.get(invalidWebRef as typeof webEntry.ref)).toThrow(
        TypeError
      );
    }

    const identities: readonly ExecutionDescriptorIdentityInput[] = [
      {
        boundary: "plugin.async-step",
        ownerId: goldenOwnerId,
        workflowId: "workflow",
        stepId: "step",
      },
      {
        boundary: "plugin.async-step",
        ownerId: goldenOwnerId,
        scheduleId: "schedule",
        stepId: "step",
      },
      {
        boundary: "plugin.async-step",
        ownerId: goldenOwnerId,
        consumerId: "consumer",
        stepId: "step",
      },
      { boundary: "plugin.cli-command", ownerId: goldenOwnerId, commandId: "command" },
      { boundary: "plugin.web-surface", ownerId: goldenOwnerId, surfaceId: "surface" },
      { boundary: "plugin.agent-tool", ownerId: goldenOwnerId, toolId: "tool" },
      {
        boundary: "plugin.desktop-background",
        ownerId: goldenOwnerId,
        backgroundId: "background",
      },
    ];

    for (const identity of identities) {
      const ref = makeExecutionRef(identity);
      const descriptor = Object.freeze({
        kind: "execution.effect" as const,
        executionId: ref.executionId,
        boundary: ref.boundary,
        policy: Object.freeze({}),
        run: () => Effect.succeed(undefined),
      });
      const table = createExecutionDescriptorTable([Object.freeze([ref, descriptor])]);
      expect(table.get(ref)).toBe(descriptor);
      const inheritedRef = Object.create(ref) as ExecutionDescriptorRef;
      expect(() => table.get(inheritedRef)).toThrow(TypeError);
      expect(() =>
        createExecutionDescriptorTable([Object.freeze([inheritedRef, descriptor])])
      ).toThrow(TypeError);
      const substitutedInheritedRef = inheritRequiredValuesWithOwnSubstitutes(
        ref,
        Reflect.ownKeys(ref).length
      );
      expect(() => table.get(substitutedInheritedRef)).toThrow(TypeError);
      expect(() =>
        createExecutionDescriptorTable([Object.freeze([substitutedInheritedRef, descriptor])])
      ).toThrow(TypeError);
      const foreignPrototypeRef = retainOwnDataWithForeignPrototype(ref);
      expect(() => table.get(foreignPrototypeRef)).toThrow(TypeError);
      expect(() =>
        createExecutionDescriptorTable([Object.freeze([foreignPrototypeRef, descriptor])])
      ).toThrow(TypeError);

      const invalidRefs: unknown[] = [
        { ...ref, surplus: true },
        { ...ref, [Symbol("surplus")]: true },
      ];
      const accessorRef = { ...ref };
      Object.defineProperty(accessorRef, "ownerId", {
        enumerable: true,
        get: () => {
          throw new Error("The execution-reference accessor must not run.");
        },
      });
      invalidRefs.push(accessorRef);
      const nonEnumerableRef = { ...ref };
      Object.defineProperty(nonEnumerableRef, "kind", {
        enumerable: false,
        value: ref.kind,
      });
      invalidRefs.push(nonEnumerableRef);
      for (const invalidRef of invalidRefs) {
        expect(() => table.get(invalidRef as ExecutionDescriptorRef)).toThrow(TypeError);
      }

      const artifact = makePortableArtifact([ref]);
      expect(decodePortableRuntimePlanArtifact(artifact)).toEqual(artifact);
      expect(() =>
        decodePortableRuntimePlanArtifact({
          ...artifact,
          executionDescriptorRefs: [Object.create(ref)],
        })
      ).toThrow(TypeError);
      expect(() =>
        decodePortableRuntimePlanArtifact({
          ...artifact,
          executionDescriptorRefs: [substitutedInheritedRef],
        })
      ).toThrow(TypeError);
      expect(() =>
        decodePortableRuntimePlanArtifact({
          ...artifact,
          executionDescriptorRefs: [foreignPrototypeRef],
        })
      ).toThrow(TypeError);
    }

    const artifact = makePortableArtifact([makeExecutionRef(identities[0]!)]);
    expect(() => decodePortableRuntimePlanArtifact(Object.create(artifact))).toThrow(TypeError);
    expect(() =>
      decodePortableRuntimePlanArtifact(inheritRequiredValuesWithOwnSubstitutes(artifact, 7))
    ).toThrow(TypeError);
    expect(() =>
      decodePortableRuntimePlanArtifact(retainOwnDataWithForeignPrototype(artifact))
    ).toThrow(TypeError);
    expect(() =>
      decodePortableRuntimePlanArtifact({
        ...artifact,
        identity: Object.create(artifact.identity),
      })
    ).toThrow(TypeError);
    expect(() =>
      decodePortableRuntimePlanArtifact({
        ...artifact,
        identity: retainOwnDataWithForeignPrototype(artifact.identity),
      })
    ).toThrow(TypeError);
    expect(() =>
      decodePortableRuntimePlanArtifact({
        ...artifact,
        surfaces: [Object.create(artifact.surfaces[0]!)],
      })
    ).toThrow(TypeError);
    expect(() =>
      decodePortableRuntimePlanArtifact({
        ...artifact,
        surfaces: [
          { ...artifact.surfaces[0]!, plugin: Object.create(artifact.surfaces[0]!.plugin) },
        ],
      })
    ).toThrow(TypeError);

    const sparseRoles = [...artifact.roles];
    delete sparseRoles[0];
    expect(() => decodePortableRuntimePlanArtifact({ ...artifact, roles: sparseRoles })).toThrow(
      TypeError
    );
    const hugeSparseRoles: unknown[] = [];
    hugeSparseRoles.length = 0xffffffff;
    expect(() =>
      decodePortableRuntimePlanArtifact({ ...artifact, roles: hugeSparseRoles })
    ).toThrow(TypeError);
    const foreignPrototypeRoles = Object.setPrototypeOf([...artifact.roles], {});
    expect(() =>
      decodePortableRuntimePlanArtifact({ ...artifact, roles: foreignPrototypeRoles })
    ).toThrow(TypeError);
    const surplusRoles = Object.assign([...artifact.roles], { surplus: true });
    expect(() => decodePortableRuntimePlanArtifact({ ...artifact, roles: surplusRoles })).toThrow(
      TypeError
    );
    const symbolRoles = [...artifact.roles];
    Object.defineProperty(symbolRoles, Symbol("surplus"), { value: true });
    expect(() => decodePortableRuntimePlanArtifact({ ...artifact, roles: symbolRoles })).toThrow(
      TypeError
    );
    const accessorRoles = [...artifact.roles];
    Object.defineProperty(accessorRoles, "0", {
      enumerable: true,
      get: () => {
        throw new Error("The array accessor must not run.");
      },
    });
    expect(() => decodePortableRuntimePlanArtifact({ ...artifact, roles: accessorRoles })).toThrow(
      TypeError
    );

    const withSymbol = { ...artifact, [Symbol("surplus")]: true };
    expect(() => decodePortableRuntimePlanArtifact(withSymbol)).toThrow(TypeError);
    const withAccessor = { ...artifact };
    Object.defineProperty(withAccessor, "identity", {
      enumerable: true,
      get: () => {
        throw new Error("The accessor must not run.");
      },
    });
    expect(() => decodePortableRuntimePlanArtifact(withAccessor)).toThrow(TypeError);
    const withNonEnumerable = { ...artifact };
    Object.defineProperty(withNonEnumerable, "kind", {
      enumerable: false,
      value: artifact.kind,
    });
    expect(() => decodePortableRuntimePlanArtifact(withNonEnumerable)).toThrow(TypeError);
  });

  test("matches independent RFC 8785 and SHA-256 golden vectors", () => {
    const canonicalLiterals = {
      pluginOwner:
        '{"kind":"plugin.owner-identity","plugin":{"instance":"primary","pluginId":"golden.plugin"}}',
      serviceUse:
        '{"kind":"service.use-identity","localName":"orders","pluginOwnerId":"plugin-owner:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","serviceId":"golden.service","serviceInstance":"primary"}',
      serviceDependency:
        '{"dependencyServiceId":"golden.dependency","kind":"service.dependency-identity","localName":"dependency","serviceId":"golden.service"}',
      semanticDependency:
        '{"adapterId":"golden.adapter","kind":"semantic.dependency-identity","localName":"telemetry","serviceId":"golden.service"}',
      resourceRequirement:
        '{"kind":"resource.requirement-identity","optional":false,"owner":{"kind":"service","localName":"database","serviceId":"golden.service"},"resource":{"instance":"primary","lifetime":"role","resourceId":"golden.resource","role":"async"}}',
      providerSelection:
        '{"configRef":{"key":"DATABASE_URL","kind":"runtime.config-ref","sources":[{"key":"DATABASE_URL","kind":"runtime.config.env","name":"HABITAT_DATABASE_URL"}]},"kind":"provider.selection-identity","providerId":"golden.provider","resource":{"instance":"primary","lifetime":"role","resourceId":"golden.resource","role":"async"}}',
      surfacePlan:
        '{"capability":"jobs","kind":"surface.plan-identity","pluginOwnerId":"plugin-owner:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","role":"async","surface":"async/workflow"}',
      workflowDispatcher:
        '{"appId":"golden.app","capability":"jobs","kind":"workflow.dispatcher-identity","pluginOwnerId":"plugin-owner:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","role":"async","surface":"async/workflow","workflowIds":["alpha","zeta"]}',
      executionDescriptor:
        '{"boundary":"plugin.async-step","kind":"execution.descriptor-identity","ownerId":"plugin-owner:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","stepId":"deliver","workflowId":"delivery"}',
      serviceBinding:
        '{"configRef":{"key":"CONFIG","kind":"runtime.config-ref","sources":[]},"kind":"service.binding-identity","resourceRequirementIds":["resource-requirement:sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],"role":"async","scopeRef":{"key":"SCOPE","kind":"runtime.config-ref","sources":[]},"semanticDependencyIds":["semantic-dependency:sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"],"serviceDependencies":[{"bindingId":"service-binding:sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","localName":"child"}],"serviceId":"golden.service","serviceInstance":"primary"}',
      portable:
        '{"executionDescriptorRefs":[{"boundary":"plugin.async-step","executionId":"execution-descriptor:sha256:5745df06cfdcca54246c2ed3a9bac034a5b7218eca93d17779d24393a1e66111","kind":"execution.descriptor-ref","ownerId":"plugin-owner:sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","stepId":"deliver","workflowId":"delivery"}],"identity":{"app":"golden.app","deployment":"test","entrypoint":"golden.entrypoint","process":"golden.process","source":"golden-source"},"kind":"portable.runtime-plan-artifact","profileId":"golden.profile","roles":["async","web"],"surfaces":[{"capability":"jobs","plugin":{"instance":"primary","pluginId":"golden.plugin"},"role":"async","surface":"async/workflow"}]}',
    } as const;
    const expected = {
      pluginOwner: "ebc7526fe03e45e798b8048a5c5109b5fe5b1d0b7d318ef73f651bc3dabca14d",
      serviceUse: "a554cedbfc23f336a85c165a2d59e0d7668c5770ccd9e068cd9c64f539d54e56",
      serviceDependency: "b1cfbc5679fb0cc46174487f8951e75a84f2a82252b8b3e7ea8a8b48c290609d",
      semanticDependency: "1da17b3385c2316d263de3b27708f1f18b1e2e3731e76e2e64c5a07029567cd2",
      resourceRequirement: "b9f012a0321cadd553ae9833af874e2b9c337fdb57b90ec69bcfc0d8a2da7482",
      providerSelection: "98b6537a7d3abf2c4442ead3f1a145f707e7d4d38c1bfdc887db4702d25cb7ac",
      surfacePlan: "00152239913cf6940d115ed5737bca5720b0884542f12a41855af93493d6033f",
      workflowDispatcher: "21e4175c54d60484d4c05b4d91ca7d44d6c01b51b8ae9bec9b81c2db7e2716c2",
      executionDescriptor: "5745df06cfdcca54246c2ed3a9bac034a5b7218eca93d17779d24393a1e66111",
      serviceBinding: "8fdc10aa94883adbd2594aea07aeec08d53c1019860178d01be39def7e30986e",
      portable: "e4203d295e46d96c9b0643795bfecac11f52e165f1766d45fcbdf7c60b6ca39a",
    } as const;

    for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
      expect(createHash("sha256").update(canonicalLiterals[key], "utf8").digest("hex")).toBe(
        expected[key]
      );
    }

    expect(pluginOwnerId({ pluginId: "golden.plugin", instance: "primary" })).toBe(
      `plugin-owner:sha256:${expected.pluginOwner}`
    );
    expect(
      serviceUseId({
        pluginOwnerId: goldenOwnerId,
        localName: "orders",
        serviceId: "golden.service",
        serviceInstance: "primary",
      })
    ).toBe(`service-use:sha256:${expected.serviceUse}`);
    expect(
      serviceDependencyId({
        serviceId: "golden.service",
        localName: "dependency",
        dependencyServiceId: "golden.dependency",
      })
    ).toBe(`service-dependency:sha256:${expected.serviceDependency}`);
    expect(
      semanticDependencyId({
        serviceId: "golden.service",
        localName: "telemetry",
        adapterId: "golden.adapter",
      })
    ).toBe(`semantic-dependency:sha256:${expected.semanticDependency}`);
    const goldenResource = {
      resourceId: "golden.resource",
      lifetime: "role" as const,
      role: "async" as const,
      instance: "primary",
    };
    expect(
      resourceRequirementId({
        owner: { kind: "service", serviceId: "golden.service", localName: "database" },
        resource: goldenResource,
        optional: false,
      })
    ).toBe(`resource-requirement:sha256:${expected.resourceRequirement}`);
    expect(
      providerSelectionId({
        providerId: "golden.provider",
        resource: goldenResource,
        configRef: {
          kind: "runtime.config-ref",
          key: "DATABASE_URL",
          sources: [
            { kind: "runtime.config.env", key: "DATABASE_URL", name: "HABITAT_DATABASE_URL" },
          ],
        },
      })
    ).toBe(`provider-selection:sha256:${expected.providerSelection}`);
    expect(
      surfacePlanId({
        pluginOwnerId: goldenOwnerId,
        role: "async",
        surface: "async/workflow",
        capability: "jobs",
      })
    ).toBe(`surface-plan:sha256:${expected.surfacePlan}`);
    expect(
      workflowDispatcherId({
        appId: "golden.app",
        pluginOwnerId: goldenOwnerId,
        role: "async",
        surface: "async/workflow",
        capability: "jobs",
        workflowIds: ["alpha", "zeta"],
      })
    ).toBe(`workflow-dispatcher:sha256:${expected.workflowDispatcher}`);
    const executionIdentity = {
      boundary: "plugin.async-step" as const,
      ownerId: goldenOwnerId,
      workflowId: "delivery",
      stepId: "deliver",
    };
    expect(executionDescriptorId(executionIdentity)).toBe(
      `execution-descriptor:sha256:${expected.executionDescriptor}`
    );
    expect(
      serviceBindingId({
        role: "async",
        serviceId: "golden.service",
        serviceInstance: "primary",
        scopeRef: { kind: "runtime.config-ref", key: "SCOPE", sources: [] },
        configRef: { kind: "runtime.config-ref", key: "CONFIG", sources: [] },
        resourceRequirementIds: [`resource-requirement:sha256:${"b".repeat(64)}`],
        serviceDependencies: [
          { localName: "child", bindingId: `service-binding:sha256:${"d".repeat(64)}` },
        ],
        semanticDependencyIds: [`semantic-dependency:sha256:${"c".repeat(64)}`],
      })
    ).toBe(`service-binding:sha256:${expected.serviceBinding}`);
    const goldenArtifact = makePortableArtifact([makeExecutionRef(executionIdentity)]);
    expect(goldenArtifact.artifactId).toBe(`sha256:${expected.portable}`);
    expect(decodePortableRuntimePlanArtifact(goldenArtifact)).toEqual(goldenArtifact);
  });

  test("keeps the closed recursive JSON schemas unchanged while exposing readonly statics", () => {
    expect(NormalizedJsonObjectSchema as unknown).toEqual({
      type: "object",
      patternProperties: {
        "^.*$": NormalizedJsonValueSchema,
      },
      additionalProperties: false,
    });
    expect(NormalizedJsonValueSchema).not.toHaveProperty("~unsafe");
    expect(NormalizedJsonObjectSchema).not.toHaveProperty("~unsafe");
  });

  test("refuses non-plain process-default arrays without invoking indexed accessors", () => {
    class AuthoredArray extends Array<unknown> {}

    const subclassed = new AuthoredArray("value");
    const alteredPrototype = ["value"];
    Object.setPrototypeOf(alteredPrototype, { map: Array.prototype.map });
    let accessorReads = 0;
    const accessorArray = ["value"];
    Object.defineProperty(accessorArray, "0", {
      configurable: true,
      enumerable: true,
      get: () => {
        accessorReads += 1;
        throw new Error("The process-default accessor must not run.");
      },
    });
    const hugeSparseArray: unknown[] = [];
    hugeSparseArray.length = 0xffffffff;

    expect(() => canonicalJson(accessorArray)).toThrow(TypeError);
    expect(() => canonicalJson(hugeSparseArray)).toThrow(TypeError);
    expect(accessorReads).toBe(0);

    for (const invalid of [subclassed, alteredPrototype, accessorArray, hugeSparseArray]) {
      const fixture = makeFixture({ processDefaults: { invalid } });
      expect(() =>
        deriveRuntimeArtifacts({
          entrypoint: fixture.entrypoint,
          profileId: fixture.profileId,
        })
      ).toThrow(TypeError);
      expect(fixture.counters()).toEqual(ZERO_FIXTURE_CALLS);
    }
    expect(accessorReads).toBe(0);
  });

  test("distinguishes the optional finding from every fatal derivation condition", () => {
    for (const options of [
      { omitProcessProvider: true },
      { ambiguousProcessProvider: true },
      { divergentDiamond: true },
      { unusedOverride: true },
      { invalidSourcePath: "../secrets.json" },
      { processDefaults: { invalid: Number.NaN } },
    ] satisfies readonly FixtureOptions[]) {
      const fixture = makeFixture(options);
      expect(() =>
        deriveRuntimeArtifacts({
          entrypoint: fixture.entrypoint,
          profileId: fixture.profileId,
        })
      ).toThrow(TypeError);
      expect(fixture.counters()).toEqual(ZERO_FIXTURE_CALLS);
    }
  });
});

function assertDerivationTypes(resultContract: RuntimeDerivationResult): void {
  const portableContract: PortableRuntimePlanArtifact = resultContract.portableArtifact;
  void portableContract;

  // @ts-expect-error The result has no public incremental or diagnostics field.
  resultContract.diagnostics;
  // @ts-expect-error Portable artifacts are recursively readonly.
  portableContract.roles.push("server");
  const processDefaults = resultContract.graph.profile.processDefaults;
  type ProcessDefaultsContract = NonNullable<typeof processDefaults>;
  const processDefaultsAreExact: Assert<TypesEqual<ProcessDefaultsContract, NormalizedJsonObject>> =
    true;
  const representativeProcessDefaults: ProcessDefaultsContract = {
    retries: 3,
    nested: {
      enabled: true,
      labels: ["primary", { region: "test" }],
    },
  };
  void processDefaultsAreExact;
  void representativeProcessDefaults;
  if (processDefaults !== undefined) {
    // @ts-expect-error Top-level process-default records are immutable.
    processDefaults.retries = 3;
    const nestedProcessDefaults = processDefaults.nested;
    if (
      nestedProcessDefaults !== null &&
      typeof nestedProcessDefaults === "object" &&
      !Array.isArray(nestedProcessDefaults)
    ) {
      // @ts-expect-error Nested process-default records are recursively immutable.
      nestedProcessDefaults.enabled = false;
    }
  }
}
void assertDerivationTypes;
