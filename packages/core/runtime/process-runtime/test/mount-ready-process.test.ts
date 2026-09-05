import { describe, expect, test } from "bun:test";
import { Check } from "typebox/value";

import { type CompiledSurfacePlan, compileRuntimePlan } from "../../compiler/src/index";
import {
  defineAgentToolPlugin,
  defineApp,
  defineDesktopBackground,
  defineDesktopBackgroundPlugin,
  defineEntrypoint,
  defineProcessCatalog,
  defineRuntimeProfile,
  defineRuntimeProvider,
  defineRuntimeResource,
  defineService,
  defineTool,
  Effect,
  providerFx,
  providerSelection,
  requireResource,
  sealService,
  toolSchema,
  useService,
} from "../../definition/src/index";
import { deriveRuntimeArtifacts } from "../../derivation/src/index";
import { createExecutionRegistry } from "../src/execution-registry";
import { createInvocationTracker } from "../src/invocation-tracker";
import {
  createMountPreparation,
  type MountReadyProcess,
  MountReadySurfaceMetadataSchema,
  MountResourceReadinessSchema,
  type PrepareMountsInput,
  readMountReadyProcessHandoff,
  readMountReadySurfaceRuntimeRecord,
} from "../src/mount-ready-process";
import type { ProcessRuntimeAccess, RoleRuntimeAccess } from "../src/runtime-access";
import type { SurfaceAdapter } from "../src/surface-adapter";

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Mount fixture must contain this value.");
  return value;
}

interface TestPayload {
  readonly name: string;
}

function fixture(
  options: {
    healthRequired?: boolean;
    optionalRequirement?: boolean;
    unusedRequiredHealth?: boolean;
  } = {}
) {
  let bodies = 0;
  const resource = defineRuntimeResource<"mount.resource", number>({
    id: "mount.resource",
    title: "Mount resource",
    purpose: "Required readiness projection",
  });
  const optional = defineRuntimeResource<"mount.optional", number>({
    id: "mount.optional",
    title: "Optional resource",
    purpose: "Absent optional values do not block mounting",
  });
  const requirement = requireResource({
    resource,
    reason: "Required mount dependency",
    ...(options.optionalRequirement === true ? { optional: true as const } : {}),
  });
  const provider = defineRuntimeProvider({
    id: "mount.provider",
    title: "Mount provider",
    provides: resource,
    requires: [],
    ...(options.healthRequired === undefined
      ? {}
      : { health: { kind: "provider.health" as const, required: options.healthRequired } }),
    build() {
      bodies++;
      return providerFx.acquireRelease({
        acquire: providerFx.succeed(1),
        release: () => providerFx.succeed(undefined),
      });
    },
  });
  const definition = defineService({ id: "mount.service", deps: {} });
  const service = sealService(definition, {
    contract: {},
    construct() {
      bodies++;
      return {
        kind: "service.client.construction-bound",
        serviceId: definition.id,
        withInvocation: () => ({}),
      };
    },
  });
  const tool = defineTool({
    id: "read",
    input: toolSchema.object({ name: toolSchema.string() }),
    description: "Cold tool metadata",
    effect() {
      bodies++;
      return Effect.succeed("read");
    },
  });
  const app = defineApp({
    id: "mount.app",
    plugins: [
      defineAgentToolPlugin.factory()({
        capability: "mount-tools",
        services: { named: useService(service) },
        resourceRequirements: [
          requirement,
          requireResource({ resource: optional, optional: true, reason: "Optional mount value" }),
        ],
        tools: [tool],
      })(),
      defineDesktopBackgroundPlugin.factory()({
        capability: "mount-backgrounds",
        services: {},
        backgrounds: [
          defineDesktopBackground({
            id: "refresh",
            cadence: 100,
            effect() {
              bodies++;
              return Effect.succeed("refreshed");
            },
          }),
        ],
      })(),
    ],
  });
  const providers = [providerSelection({ resource, provider })];
  if (options.unusedRequiredHealth === true) {
    const unused = defineRuntimeResource<"mount.unused", number>({
      id: "mount.unused",
      title: "Unused resource",
      purpose: "An unused profile provider is not process readiness evidence",
    });
    providers.push(
      providerSelection({
        resource: unused,
        provider: defineRuntimeProvider({
          ...provider,
          id: "mount.unused.provider",
          provides: unused,
          health: { kind: "provider.health", required: true },
        }),
      })
    );
  }
  const profile = defineRuntimeProfile({
    id: "mount.profile",
    providers,
    harnesses: ["agent-host", "desktop-host", "no-op"],
  });
  const process = defineProcessCatalog({
    main: { id: "mount.process", roles: ["agent", "desktop"] },
  }).main;
  const entrypoint = defineEntrypoint({
    id: "mount.entrypoint",
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: process.id,
      entrypoint: "mount.entrypoint",
      deployment: "test",
      source: "mount-owner-test",
    },
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const { plan, references } = compileRuntimePlan({ derivation });
  const admission = createInvocationTracker();
  const executionRegistry = createExecutionRegistry({
    processId: process.id,
    registryInput: plan.executionRegistryInput,
    executionPlans: plan.executionPlans,
    descriptorTable: derivation.executionDescriptorTable,
    assertOpen: admission.assertOpen,
  });
  // These ports test handoff ownership, not provisioning or live resource access.
  const noResourceAccess = {
    resource(): never {
      throw new TypeError("The metadata adapter does not consume live resources.");
    },
    optionalResource: () => undefined,
  };
  const processAccess: ProcessRuntimeAccess = Object.freeze({
    appId: app.id,
    processId: process.id,
    entrypointId: entrypoint.id,
    profileId: profile.id,
    roles: plan.roles,
    ...noResourceAccess,
  });
  const lowerCalls: string[] = [];
  const payloads: TestPayload[] = [];
  let acquired = true;
  let stopping: Promise<void> | undefined;
  let releases = 0;
  const stop = () => {
    stopping ??= admission.closeAndDrain().then(() => {
      releases++;
    });
    return stopping;
  };
  const prepare = createMountPreparation({
    plan,
    processAccess,
    hasSelection: (selectionId) =>
      acquired && plan.compiledResources.some((selected) => selected.selectionId === selectionId),
    requiresHealth: (selectionId) => references.getProvider(selectionId).health?.required === true,
    assertOpen: admission.assertOpen,
    lower(surface, adapter) {
      lowerCalls.push(surface.surfacePlanId);
      const roleAccess: RoleRuntimeAccess = {
        role: surface.role,
        process: processAccess,
        selectedSurfaces: [surface],
        ...noResourceAccess,
        forSurface() {
          throw new TypeError("The metadata adapter does not project surface access.");
        },
      };
      return adapter.lower({
        plan: surface,
        processAccess,
        roleAccess,
        resources: {
          has: () => false,
          get() {
            throw new TypeError("The metadata adapter does not consume live resources.");
          },
        },
        serviceBindings: {},
        executionRegistry,
      });
    },
    closeAdmission: () => {
      void admission.closeAndDrain();
    },
    stop,
  });
  function adapter(
    surface: CompiledSurfacePlan,
    harness = surface.role === "agent" ? "agent-host" : "desktop-host"
  ): SurfaceAdapter<CompiledSurfacePlan, TestPayload> {
    const payload = { name: surface.capability };
    payloads.push(payload);
    return {
      role: surface.role,
      surface: surface.surface,
      harness,
      lower: ({ plan: selected }) => ({
        payload,
        payloadSchemas: [tool.inputSchema],
        findings: [{ code: "fixture", message: "Metadata projection", severity: "warning" }],
        observations: [
          {
            kind: "surface.lowered",
            surfacePlanId: selected.surfacePlanId,
            executionIds: selected.executionDescriptorRefs.map((ref) => ref.executionId),
          },
        ],
      }),
    };
  }
  const assignments = plan.surfaces.map((surface) => ({ surface, adapter: adapter(surface) }));
  const request: PrepareMountsInput<TestPayload> = {
    launchIdentity: entrypoint.identity,
    assignments,
  };
  return {
    plan,
    profile,
    prepare,
    request,
    adapter,
    admission,
    lowerCalls,
    payloads,
    stop,
    schema: tool.inputSchema,
    bodies: () => bodies,
    releases: () => releases,
    setAcquired(value: boolean) {
      acquired = value;
    },
  };
}

describe("Mount-ready process handoff", () => {
  test("completes selected lowering and carries only frozen metadata plus exact native payloads", () => {
    const value = fixture();
    const ready: MountReadyProcess<TestPayload> = value.prepare(value.request);
    expect(value.lowerCalls).toHaveLength(2);
    expect(value.bodies()).toBe(0);
    expect(ready.identity).toBe(value.request.launchIdentity);
    expect(ready.harnessIds).toEqual(["agent-host", "desktop-host", "no-op"]);
    expect(ready.records.map((record) => record.harnessId)).toEqual(["agent-host", "desktop-host"]);
    expect(ready.requiredResources).toEqual({
      ready: true,
      resources: value.plan.resourceRequirements
        .filter((requirement) => !requirement.optional)
        .map((requirement) => ({ resource: requirement.requirementId, ready: true, findings: [] })),
    });
    expect(Check(MountResourceReadinessSchema, ready.requiredResources)).toBe(true);
    expect(ready.findings).toHaveLength(2);
    expect(ready.observations).toHaveLength(2);
    for (const record of ready.records) {
      const assignment = required(
        value.request.assignments.find(
          (item) => item.surface.surfacePlanId === record.surfacePlanId
        )
      );
      const { payload, payloadSchemas, findings, observations, ...metadata } = record;
      expect(Check(MountReadySurfaceMetadataSchema, metadata)).toBe(true);
      expect(record.serviceBindings).toEqual(assignment.surface.serviceBindings);
      expect(record.serviceBindings).not.toBe(assignment.surface.serviceBindings);
      expect(record.payload.name).toBe(assignment.surface.capability);
      expect(value.payloads.includes(payload)).toBe(true);
      expect(payloadSchemas[0]).toBe(value.schema);
      expect(Object.isFrozen(payload)).toBe(false);
      for (const shell of [
        ready,
        ready.records,
        record,
        record.serviceBindings,
        findings,
        observations,
      ])
        expect(Object.isFrozen(shell)).toBe(true);
      expect(record).not.toHaveProperty("plan");
      expect(record).not.toHaveProperty("serviceExports");
      expect(Object.getOwnPropertySymbols(record)).toHaveLength(0);
      expect(readMountReadySurfaceRuntimeRecord(ready, record)).toBe(record);
    }
    expect(
      required(ready.records.find((record) => record.role === "agent")).serviceBindings[0]
        ?.localName
    ).toBe("named");
    expect(ready).not.toHaveProperty("compilation");
    expect(ready).not.toHaveProperty("providers");
  });

  test("permits explicit same-surface lowering to distinct selected harnesses", () => {
    const value = fixture();
    const surface = required(value.plan.surfaces[0]);
    const ready = value.prepare({
      ...value.request,
      assignments: [
        ...value.request.assignments,
        { surface, adapter: value.adapter(surface, "no-op") },
      ],
    });
    expect(ready.records).toHaveLength(3);
    expect(
      ready.records.filter((record) => record.surfacePlanId === surface.surfacePlanId)
    ).toHaveLength(2);
  });

  test.each([
    false,
    true,
  ])("required provider health remains unknown after acquisition (optional requirement: %j)", (optionalRequirement) => {
    const value = fixture({ healthRequired: true, optionalRequirement });
    const ready = value.prepare(value.request);
    expect(ready.requiredResources).toEqual({
      ready: false,
      resources: [
        {
          resource: required(required(value.plan.compiledResources[0]).requirementIds[0]),
          ready: false,
          findings: [
            {
              code: "provider.health.unknown",
              message: "Explicitly required provider health has no admitted evidence.",
              severity: "error",
            },
          ],
        },
      ],
    });
    expect(Check(MountResourceReadinessSchema, ready.requiredResources)).toBe(true);
    expect(value.bodies()).toBe(0);
    expect(ready.requiredResources).not.toHaveProperty("providers");
    expect(Object.isFrozen(ready.requiredResources.resources[0]?.findings[0])).toBe(true);
  });

  test.each([
    undefined,
    false,
  ])("acquisition remains availability evidence when health is not required: %j", (healthRequired) => {
    const value = fixture({ healthRequired });
    const ready = value.prepare(value.request);
    expect(ready.requiredResources.ready).toBe(true);
    expect(ready.requiredResources.resources).toHaveLength(1);
    expect(ready.requiredResources.resources[0]?.findings).toEqual([]);
    expect(value.bodies()).toBe(0);
  });

  test("an unused health-required provider in the profile does not affect selected readiness", () => {
    const value = fixture({ unusedRequiredHealth: true });
    expect(value.profile.providers).toHaveLength(2);
    expect(value.plan.compiledResources).toHaveLength(1);
    const ready = value.prepare(value.request);
    expect(ready.requiredResources.ready).toBe(true);
    expect(ready.requiredResources.resources).toHaveLength(1);
    expect(value.bodies()).toBe(0);
  });

  test("refuses invalid preflight before any lowering without consuming preparation", () => {
    const value = fixture();
    const first = required(value.request.assignments[0]);
    const rest = value.request.assignments.slice(1);
    const invalid: PrepareMountsInput<TestPayload>[] = [
      { ...value.request, launchIdentity: { ...value.request.launchIdentity } },
      {
        ...value.request,
        launchIdentity: Object.freeze({ ...value.request.launchIdentity, source: "other" }),
      },
      {
        ...value.request,
        launchIdentity: Object.freeze({ ...value.request.launchIdentity, extra: true }),
      },
      { ...value.request, assignments: [first] },
      { ...value.request, assignments: [...value.request.assignments, first] },
      { ...value.request, assignments: [{ ...first, surface: { ...first.surface } }, ...rest] },
      ...[
        { ...first.adapter, harness: "unselected" },
        { ...first.adapter, role: "server" as const },
        { ...first.adapter, surface: "server/api" },
        { ...first.adapter, lower: undefined } as unknown as SurfaceAdapter<
          CompiledSurfacePlan,
          TestPayload
        >,
      ].map((adapter) => ({ ...value.request, assignments: [{ ...first, adapter }, ...rest] })),
    ];
    for (const request of invalid) {
      expect(() => value.prepare(request)).toThrow(TypeError);
      expect(value.lowerCalls).toEqual([]);
    }
    value.setAcquired(false);
    expect(() => value.prepare(value.request)).toThrow("has not been acquired");
    expect(value.lowerCalls).toEqual([]);
    value.setAcquired(true);
    expect(value.prepare(value.request).records).toHaveLength(2);
    expect(value.bodies()).toBe(0);
  });

  test("a lowering failure returns no partial handoff and requires ordinary caller stop", async () => {
    const value = fixture();
    const failure = new Error("Second lowering failed");
    const readyRequest = {
      ...value.request,
      assignments: value.request.assignments.map((assignment) =>
        assignment.adapter.harness === "desktop-host"
          ? {
              ...assignment,
              adapter: {
                ...assignment.adapter,
                lower() {
                  throw failure;
                },
              },
            }
          : assignment
      ),
    };
    expect(() => value.prepare(readyRequest)).toThrow(failure);
    expect(value.lowerCalls).toHaveLength(2);
    expect(value.releases()).toBe(0);
    expect(() => value.prepare(value.request)).toThrow("already has an owner");
    expect(value.bodies()).toBe(0);
    await value.stop();
    expect(value.releases()).toBe(1);
  });

  test.each([
    "unselected harness",
    "selected harness",
    "role",
    "surface",
    "lower",
  ] as const)("refuses a later adapter's %s drift before invoking it", (change) => {
    const value = fixture();
    const first = required(
      value.request.assignments.find(({ adapter }) => adapter.harness === "agent-host")
    );
    const second = required(
      value.request.assignments.find(({ adapter }) => adapter.harness === "desktop-host")
    );
    let secondCalls = 0;
    const laterAdapter = { ...second.adapter };
    laterAdapter.lower = (input) => {
      secondCalls++;
      return second.adapter.lower(input);
    };
    const firstAdapter = { ...first.adapter };
    firstAdapter.lower = (input) => {
      switch (change) {
        case "unselected harness":
          laterAdapter.harness = "unselected";
          break;
        case "selected harness":
          laterAdapter.harness = "agent-host";
          break;
        case "role":
          laterAdapter.role = "server";
          break;
        case "surface":
          laterAdapter.surface = "server/api";
          break;
        case "lower":
          laterAdapter.lower = (laterInput) => {
            secondCalls++;
            return second.adapter.lower(laterInput);
          };
          break;
      }
      return first.adapter.lower(input);
    };
    expect(() =>
      value.prepare({
        ...value.request,
        assignments: [
          { ...first, adapter: firstAdapter },
          { ...second, adapter: laterAdapter },
        ],
      })
    ).toThrow("changed after assignment preflight");
    expect(value.lowerCalls).toEqual([first.surface.surfacePlanId]);
    expect(secondCalls).toBe(0);
    expect(value.releases()).toBe(0);
    expect(() => value.prepare(value.request)).toThrow("already has an owner");
  });

  test("admits only exact records and a single live handoff claim", () => {
    const value = fixture();
    const ready = value.prepare(value.request);
    expect(() => value.prepare(value.request)).toThrow(TypeError);
    expect(() => readMountReadyProcessHandoff({ ...ready })).toThrow(TypeError);
    const transplanted = Object.create(
      Object.getPrototypeOf(ready),
      Object.getOwnPropertyDescriptors(ready)
    ) as MountReadyProcess;
    expect(() => readMountReadyProcessHandoff(transplanted)).toThrow(TypeError);
    const record = required(ready.records[0]);
    expect(() => readMountReadySurfaceRuntimeRecord(ready, { ...record })).toThrow(TypeError);
    const other = fixture();
    const otherReady = other.prepare(other.request);
    expect(() =>
      readMountReadySurfaceRuntimeRecord(ready, required(otherReady.records[0]))
    ).toThrow(TypeError);
    const handoff = readMountReadyProcessHandoff(ready);
    expect(Object.isFrozen(handoff)).toBe(true);
    handoff.claim();
    expect(() => handoff.claim()).toThrow(TypeError);
  });

  test("closed or stopped preparation cannot authorize a new native mounting owner", async () => {
    for (const mode of ["closed", "stopped"] as const) {
      const value = fixture();
      const ready = value.prepare(value.request);
      if (mode === "closed") ready.closeAdmission();
      else await ready.stop();
      expect(() => readMountReadyProcessHandoff(ready).claim()).toThrow(TypeError);
      await ready.stop();
      expect(value.releases()).toBe(1);
    }
  });

  test("closeAdmission returns immediately so native stop can settle the invocation before release", async () => {
    const value = fixture();
    const ready = value.prepare(value.request);
    const nativeStop = deferred();
    const running = value.admission.run(() => nativeStop.promise);
    expect(ready.closeAdmission()).toBeUndefined();
    expect(() => value.admission.assertOpen()).toThrow(TypeError);
    expect(value.releases()).toBe(0);
    const stopped = ready.stop();
    expect(ready.stop()).toBe(stopped);
    await Promise.resolve();
    expect(value.releases()).toBe(0);
    nativeStop.resolve();
    await running;
    await stopped;
    expect(value.releases()).toBe(1);
  });
});
