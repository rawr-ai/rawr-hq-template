import { closeSync, fstatSync, openSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type as schemaType } from "@orpc/contract";
import type { WithEffectContext } from "@orpc/experimental-effect";
import { createRouterClient, implement } from "@orpc/server";
import { Effect } from "effect";
import { expect, test } from "vitest";

import { orderBootgraph } from "../../runtime/bootgraph/src/index";
import { type CompiledProcessPlan, compileRuntimePlan } from "../../runtime/compiler/src/index";
import {
  createRuntimeObservation,
  type RuntimeObservationSeed,
  type RuntimeTelemetryRecord,
  type RuntimeTelemetrySink,
} from "../../runtime/observation/src/index";
import {
  createAgentToolsAdapter,
  createProcessRuntime,
} from "../../runtime/process-runtime/src/index";
import { provisionProcess } from "../../runtime/substrate/effect/src/index";
import { defineApp, defineEntrypoint, defineProcessCatalog } from "../src/app/index";
import { defineTool } from "../src/plugins/agent/effect/index";
import { defineAgentToolPlugin } from "../src/plugins/agent/index";
import { toolSchema } from "../src/plugins/agent/schema/index";
import { deriveRuntimeArtifacts } from "../src/runtime/derivation/index";
import { defineRuntimeProfile, providerSelection } from "../src/runtime/profiles/index";
import { providerFx } from "../src/runtime/providers/effect/index";
import { defineRuntimeProvider } from "../src/runtime/providers/index";
import { defineRuntimeResource, requireResource } from "../src/runtime/resources/index";
import { RuntimeSchema } from "../src/runtime/schema";
import { defineService, resourceDep, sealService, useService } from "../src/service/index";

interface FileLease {
  readonly fd: number;
  readonly apiKey: string;
}

/** Only test composition adapts compiler facts; terminal assembly belongs to task 10.6. */
function selectedSeed(plan: CompiledProcessPlan): RuntimeObservationSeed {
  return {
    identity: plan.identity,
    profileId: plan.profileId,
    roles: plan.roles,
    derivedAuthoring: {
      pluginOwnerIds: plan.surfaces.map((surface) => surface.pluginOwnerId),
      serviceIds: plan.serviceBindings.map((binding) => binding.serviceId),
    },
    resources: plan.resourceRequirements.map(({ requirementId, resource, optional }) => ({
      requirementId,
      resourceId: resource.resourceId,
      optional,
      lifetime: resource.lifetime,
      ...(resource.role === undefined ? {} : { role: resource.role }),
      ...(resource.instance === undefined ? {} : { instance: resource.instance }),
    })),
    providers: plan.compiledResources.map(
      ({ selectionId, providerId, resource, requirementIds }) => ({
        selectionId,
        providerId,
        resourceId: resource.resourceId,
        requirementIds,
      })
    ),
    providerDependencyGraph: {
      nodes: plan.providerDependencyGraph.nodes.map((node) => node.selectionId),
      edges: plan.providerDependencyGraph.edges,
      closure: plan.providerDependencyGraph.closure,
    },
    plugins: plan.surfaces.map(({ pluginOwnerId, role, surface, capability, instance }) => ({
      pluginOwnerId,
      role,
      surface,
      capability,
      ...(instance === undefined ? {} : { instance }),
    })),
    serviceAttachments: plan.serviceBindings.map((binding) => ({
      bindingId: binding.bindingId,
      serviceId: binding.serviceId,
      role: binding.role,
      ...(binding.serviceInstance === undefined ? {} : { instance: binding.serviceInstance }),
      dependencyBindingIds: binding.serviceDependencies.map((dependency) => dependency.bindingId),
    })),
    workflowDispatchers: plan.workflowDispatchers.map(({ descriptorId }) => ({
      dispatcherId: descriptorId,
    })),
    executionPlans: plan.executionPlans.map(({ ref }) => ({
      executionId: ref.executionId,
      ownerId: ref.ownerId,
      boundary: ref.boundary,
    })),
    executionRegistry: {
      executionIds: plan.executionRegistryInput.boundaries.map(({ executionId }) => executionId),
    },
    surfaces: plan.surfaces.map((surface) => ({
      surfacePlanId: surface.surfacePlanId,
      pluginOwnerId: surface.pluginOwnerId,
      role: surface.role,
      surface: surface.surface,
      capability: surface.capability,
      ...(surface.instance === undefined ? {} : { instance: surface.instance }),
      bindingIds: surface.serviceBindings.map(({ bindingId }) => bindingId),
      executionIds: surface.executionDescriptorRefs.map(({ executionId }) => executionId),
    })),
    harnesses: plan.harnesses.map(({ harnessId }) => ({ harnessId })),
  };
}

function fixture(appRoot: string, processId: string, failRelease = false) {
  const secret = `private-config-${processId}`;
  const releaseFailure = Object.assign(new Error(`private-release-${processId}`), {
    apiKey: secret,
  });
  const calls = { build: 0, acquire: 0, release: 0, construct: 0, execute: 0 };
  const file = defineRuntimeResource<"observation.file", FileLease>({
    id: "observation.file",
    title: "Observation file",
    purpose: "Real selected file lease",
  });
  const dependency = requireResource({ resource: file, reason: "Borrow the ready file lease" });
  const consumer = defineRuntimeResource<"observation.consumer", FileLease>({
    id: "observation.consumer",
    title: "Observation consumer",
    purpose: "Real provider dependency",
  });
  const fileProvider = defineRuntimeProvider({
    id: "observation.file.provider",
    title: "Observation file provider",
    provides: file,
    requires: [],
    defaultConfigKey: "lease.config",
    configSchema: RuntimeSchema.fromTypeBox(toolSchema.object({ apiKey: toolSchema.string() })),
    build({ config }) {
      calls.build++;
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          calls.acquire++;
          return { fd: openSync(join(appRoot, `${processId}.lease`), "wx"), apiKey: config.apiKey };
        }),
        release: ({ fd }) =>
          Effect.sync(() => {
            closeSync(fd);
            calls.release++;
            if (failRelease) throw releaseFailure;
          }),
      });
    },
  });
  const consumerProvider = defineRuntimeProvider({
    id: "observation.consumer.provider",
    title: "Observation consumer provider",
    provides: consumer,
    requires: [dependency],
    build({ resources }) {
      calls.build++;
      const lease = resources.get(dependency);
      return providerFx.acquireRelease({
        acquire: Effect.sync(() => {
          calls.acquire++;
          return lease;
        }),
        release: () =>
          Effect.sync(() => {
            calls.release++;
          }),
      });
    },
  });
  const definition = defineService({
    id: "observation.reader",
    deps: { lease: resourceDep(consumer) },
  });
  const contract = definition.oc.router({ read: definition.oc.output(schemaType<number>()) });
  const implementation = implement(contract).$context<{ fd: number } & WithEffectContext<never>>();
  const router = implementation.router({
    read: implementation.read.handler(({ context }) => context.fd),
  });
  const service = sealService(definition, {
    contract,
    construct({ deps, clients }) {
      calls.construct++;
      return {
        kind: "service.client.construction-bound",
        serviceId: definition.id,
        withInvocation: () =>
          clients.bind({
            context: () => ({ fd: deps.lease.fd }),
            createNativeClient: (options) => createRouterClient(router, options),
          }),
      };
    },
  });
  const plugin = defineAgentToolPlugin.factory()({
    capability: "observation-tools",
    services: { reader: useService(service) },
    tools: [
      defineTool({
        id: "read",
        description: "A selected executable that this observation proof does not invoke",
        input: toolSchema.object({}),
        effect() {
          calls.execute++;
          return Effect.succeed("read");
        },
      }),
    ],
  })();
  const app = defineApp({ id: "observation.app", plugins: [plugin] });
  const profile = defineRuntimeProfile({
    id: "observation.profile",
    configSources: [{ kind: "test" }],
    providers: [
      providerSelection({ resource: file, provider: fileProvider }),
      providerSelection({ resource: consumer, provider: consumerProvider }),
    ],
    harnesses: ["test.observation"],
  });
  const process = defineProcessCatalog({ main: { id: processId, roles: ["agent"] } }).main;
  const entrypoint = defineEntrypoint({
    id: processId,
    app,
    profile,
    process,
    identity: {
      app: app.id,
      process: processId,
      entrypoint: processId,
      deployment: "test",
      source: "sdk-observation-test",
    },
  });
  const derivation = deriveRuntimeArtifacts({ entrypoint, profileId: profile.id });
  const compilation = compileRuntimePlan({ derivation });
  const bootgraph = orderBootgraph(compilation.plan.bootgraphInput);
  const seed = selectedSeed(compilation.plan);
  async function start(sink?: RuntimeTelemetrySink) {
    const observation = createRuntimeObservation({ seed, sink });
    const provisioned = await provisionProcess({
      compilation,
      bootgraph,
      sources: { appRoot, test: { "lease.config": { apiKey: secret } } },
      observation: observation.port,
    });
    const runtime = await createProcessRuntime({
      compilation,
      provisioned,
      descriptorTable: derivation.executionDescriptorTable,
    });
    try {
      const ready = runtime.prepareMounts({
        launchIdentity: entrypoint.identity,
        assignments: compilation.plan.surfaces.map((surface) => ({
          surface,
          adapter: createAgentToolsAdapter({ harness: "test.observation" }),
        })),
      });
      return { observation, ready, lease: runtime.access.process.resource(file) };
    } catch (error) {
      await runtime.stop();
      throw error;
    }
  }
  return { start, seed, compilation, calls, secret, releaseFailure };
}

test("actual selected topology and native release failure project without invented lifecycle success", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-observation-"));
  const produced = fixture(root, "first", true);
  let stop: (() => Promise<void>) | undefined;
  try {
    const { observation, ready, lease } = await produced.start();
    stop = ready.stop;
    const { plan } = produced.compilation;
    const initial = observation.snapshot();
    expect(produced.calls).toEqual({ build: 2, acquire: 2, release: 0, construct: 1, execute: 0 });
    expect(fstatSync(lease.fd).isFile()).toBe(true);
    expect(initial.resources.map(({ requirementId }) => requirementId)).toEqual(
      plan.resourceRequirements.map(({ requirementId }) => requirementId)
    );
    expect(initial.providers.map(({ providerId }) => providerId)).toEqual(
      plan.compiledResources.map(({ providerId }) => providerId)
    );
    expect(initial.providerDependencyGraph.edges).toHaveLength(1);
    expect(initial.providerDependencyGraph.edges).toEqual(plan.providerDependencyGraph.edges);
    expect(initial.providerDependencyGraph.closure).toEqual(plan.providerDependencyGraph.closure);
    expect(initial.serviceAttachments[0]?.bindingId).toBe(plan.serviceBindings[0]?.bindingId);
    expect(initial.derivedAuthoring).toEqual(produced.seed.derivedAuthoring);
    expect(initial.plugins).toEqual(produced.seed.plugins);
    expect(initial.executionPlans).toHaveLength(1);
    expect(initial.executionRegistry.executionIds).toEqual(
      produced.seed.executionRegistry.executionIds
    );
    expect(initial.surfaces[0]?.surfacePlanId).toBe(ready.records[0]?.surfacePlanId);
    expect(initial.harnesses).toEqual([
      {
        harnessId: "test.observation",
        mountStatus: "unobserved",
        readiness: "unknown",
        liveness: "unknown",
        stopStatus: "unobserved",
      },
    ]);
    expect(initial.workflowDispatchers).toEqual([]);
    expect(initial.lifecycleStatus).toEqual({
      topology: "selected",
      provisioning: "unobserved",
      binding: "unobserved",
      adapters: "unobserved",
      execution: "unobserved",
      mounting: "unobserved",
      finalization: "unobserved",
    });
    expect(initial.startupRecords).toEqual([]);
    expect(initial.executionRecords).toEqual([]);
    expect(initial.executionRegistry.status).toBe("unobserved");
    expect(initial.diagnostics).toEqual([]);

    const selected = plan.compiledResources.find(
      ({ providerId }) => providerId === "observation.file.provider"
    );
    if (selected === undefined) throw new Error("Fixture requires its selected file provider.");
    // Unknown provider payload fields are not evidence and cannot trigger cleanup.
    observation.port.publish({
      phase: "provisioning",
      boundary: "provider.release",
      kind: "provider.release.failed",
      correlationId: plan.identity.process,
      payload: {
        selectionId: selected.selectionId,
        providerId: selected.providerId,
        typedFailure: false,
        defect: true,
        interrupted: false,
        config: { apiKey: produced.secret },
        error: produced.releaseFailure,
      },
    });
    expect(observation.snapshot().diagnostics[0]?.code).toBe("observation.unsupported");
    expect(observation.snapshot().finalizationRecords).toEqual([]);
    expect(
      observation.snapshot().providers.every(({ releaseStatus }) => releaseStatus === "unobserved")
    ).toBe(true);
    expect(produced.calls.release).toBe(0);
    expect(fstatSync(lease.fd).isFile()).toBe(true);

    await ready.stop();
    expect(produced.calls.release).toBe(2);
    expect(() => fstatSync(lease.fd)).toThrow();
    const final = observation.snapshot();
    expect(final.finalizationRecords).toEqual([
      {
        kind: "provider.release.failed",
        selectionId: selected.selectionId,
        providerId: selected.providerId,
        typedFailure: false,
        defect: true,
        interrupted: false,
      },
    ]);
    expect(final.diagnostics).toEqual([
      expect.objectContaining({ code: "observation.unsupported", redaction: "omitted" }),
      expect.objectContaining({
        code: "provider.release.failed",
        severity: "error",
        phase: "observation",
        recordKind: "finalization",
        redaction: "safe",
      }),
    ]);
    expect(
      final.providers.find(({ providerId }) => providerId === selected.providerId)?.releaseStatus
    ).toBe("failed");
    expect(final.lifecycleStatus.finalization).toBe("failure-observed");
    expect(final.lifecycleStatus.mounting).toBe("unobserved");
    expect(final.executionRecords).toEqual([]);
    expect(initial.finalizationRecords).toEqual([]);
    expect(Object.isFrozen(final)).toBe(true);
    expect(JSON.stringify(final)).not.toContain(produced.secret);
    expect(JSON.stringify(final)).not.toContain(produced.releaseFailure.message);
    expect(JSON.stringify(final)).not.toContain("apiKey");
  } finally {
    await stop?.();
    await rm(root, { recursive: true, force: true });
  }
});

test("collectors and resource lifetimes remain independent for two processes of one app", async () => {
  const root = await mkdtemp(join(tmpdir(), "habitat-observation-siblings-"));
  const first = fixture(root, "first", true);
  const second = fixture(root, "second");
  const stops: (() => Promise<void>)[] = [];
  try {
    const a = await first.start();
    stops.push(a.ready.stop);
    const b = await second.start();
    stops.push(b.ready.stop);
    const before = b.observation.snapshot();
    await a.ready.stop();
    expect(a.observation.snapshot().finalizationRecords).toHaveLength(1);
    expect(b.observation.snapshot()).toEqual(before);
    expect(second.calls.release).toBe(0);
    expect(fstatSync(b.lease.fd).isFile()).toBe(true);
    expect(a.observation.snapshot().processIdentity.id).toBe("first");
    expect(b.observation.snapshot().processIdentity.id).toBe("second");
    await b.ready.stop();
    expect(second.calls.release).toBe(2);
    expect(b.observation.snapshot().finalizationRecords).toEqual([]);
    expect(b.observation.snapshot().lifecycleStatus.finalization).toBe("unobserved");
  } finally {
    for (const stop of stops.reverse()) await stop();
    await rm(root, { recursive: true, force: true });
  }
});

test.each([
  "sync",
  "async",
] as const)("%s telemetry sink failures preserve exact product outcomes and no lifecycle authority", async (mode) => {
  const produced = fixture(tmpdir(), `cold-${mode}`);
  const records: RuntimeTelemetryRecord[] = [];
  const sinkFailure = new Error("private-sink-failure");
  const observation = createRuntimeObservation({
    seed: produced.seed,
    sink: {
      publish(record) {
        records.push(record);
        if (mode === "sync") throw sinkFailure;
        return Promise.reject(sinkFailure);
      },
    },
  });
  const result = { apiKey: produced.secret };
  const original = new Error("original-application-rejection");
  const span = {
    name: "sdk.application",
    phase: "mounting" as const,
    boundary: "sdk" as const,
    attributes: { inputKind: "fixture" },
  };
  await expect(observation.telemetry.span(span, async () => result)).resolves.toBe(result);
  await expect(
    observation.telemetry.span(span, async () => {
      throw original;
    })
  ).rejects.toBe(original);
  observation.telemetry.event("sdk.application.event", { mode });
  observation.telemetry.annotate({
    key: "credential",
    value: produced.secret,
    redaction: "omitted",
  });
  observation.port.publish({
    phase: "mounting",
    boundary: "harness",
    kind: "harness.mounted",
    correlationId: produced.seed.identity.process,
    payload: { secret: produced.secret, error: original },
  });
  const snapshot = observation.snapshot();
  expect(snapshot.diagnostics.at(-1)?.code).toBe("observation.unsupported");
  expect(snapshot.lifecycleStatus.mounting).toBe("unobserved");
  expect(snapshot.startupRecords).toEqual([]);
  expect(snapshot.executionRecords).toEqual([]);
  expect(snapshot.finalizationRecords).toEqual([]);
  expect(produced.calls).toEqual({ build: 0, acquire: 0, release: 0, construct: 0, execute: 0 });
  expect(records.map(({ kind }) => kind)).toEqual([
    "span.started",
    "span.settled",
    "span.started",
    "span.settled",
    "event",
    "annotation",
  ]);
  expect(
    records.filter(({ kind }) => kind === "span.settled").map(({ outcome }) => outcome)
  ).toEqual(["success", "failure"]);
  expect(records.every(({ processId }) => processId === produced.seed.identity.process)).toBe(true);
  expect(JSON.stringify({ snapshot, records })).not.toContain(produced.secret);
  expect(JSON.stringify({ snapshot, records })).not.toContain(original.message);
  expect(JSON.stringify({ snapshot, records })).not.toContain(sinkFailure.message);
});
