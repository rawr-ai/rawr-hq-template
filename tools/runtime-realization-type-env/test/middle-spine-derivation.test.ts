import { describe, expect, test } from "bun:test";
import {
  compileRuntimeSpine,
  createExecutionRegistry,
  deriveRuntimeSpine,
} from "@rawr/spec-env/spine/simulate";
import { defineRuntimeProfile, providerSelection } from "@rawr/sdk/runtime/profiles";
import { defineRuntimeProvider, providerFx } from "@rawr/sdk/runtime/providers";
import { defineRuntimeResource, resourceRequirement } from "@rawr/sdk/runtime/resources";
import {
  CreateWorkItemDescriptor,
  CreateWorkItemRef,
  SyncWorkItemStepDescriptor,
} from "../fixtures/positive/app-and-plan-artifacts";
import {
  ClockProvider,
  ClockResource,
  EmailProvider,
  EmailSenderResource,
  RuntimeFixtureProfile,
} from "../fixtures/positive/resource-provider-profile";
import { WorkItemsServerApiPlugin } from "../fixtures/positive/server-api-plugin";

function collectFunctionPaths(value: unknown, path = "$"): string[] {
  if (typeof value === "function") return [path];
  if (!value || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectFunctionPaths(item, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
    collectFunctionPaths(entry, `${path}.${key}`),
  );
}

function deriveFixtureSpine() {
  return deriveRuntimeSpine({
    kind: "runtime.spine-derivation-input",
    appId: "hq",
    profile: RuntimeFixtureProfile,
    executions: [
      {
        kind: "runtime.execution-derivation-input",
        boundary: "plugin.server-api",
        executionId: "exec:server:work-items:create",
        role: "server",
        surface: "api",
        capability: "work-items",
        routePath: ["items", "create"],
        descriptor: WorkItemsServerApiPlugin.descriptors[0],
        policy: {
          timeoutMs: 1000,
        },
      },
      {
        kind: "runtime.execution-derivation-input",
        boundary: "plugin.async-step",
        executionId: "exec:async:work-items.sync:sync-work-item",
        role: "async",
        surface: "workflow",
        capability: "work-items",
        workflowId: "work-items.sync",
        stepId: "sync-work-item",
        descriptor: SyncWorkItemStepDescriptor,
        policy: {
          timeoutMs: 1000,
        },
      },
    ],
    serviceBindings: [
      {
        kind: "service.binding-derivation-input",
        serviceId: "work-items",
        role: "server",
        surface: "api",
        capability: "work-items",
        dependencyInstances: [],
        scopeHash: "scope:server:api:work-items",
        configHash: "config:server:api:work-items",
      },
    ],
    dispatchers: [
      {
        kind: "workflow.dispatcher-derivation-input",
        descriptorId: "dispatcher:work-items",
        role: "server",
        surface: "api",
        capability: "work-items",
        workflowIds: ["work-items.sync"],
      },
    ],
  });
}

describe("middle spine derivation and compiler simulation", () => {
  test("derives normalized graph, portable artifact, compiler inputs, and placeholders from explicit lab input", () => {
    const derivation = deriveFixtureSpine();
    const compilation = compileRuntimeSpine(derivation);
    const serverRef = derivation.executionDescriptorRefs[0];
    const asyncRef = derivation.executionDescriptorRefs[1];

    expect(derivation.normalizedGraph.kind).toBe("normalized.authoring-graph");
    expect(derivation.executionDescriptorRefs.map((ref) => ref.executionId)).toEqual([
      "exec:server:work-items:create",
      "exec:async:work-items.sync:sync-work-item",
    ]);
    expect(derivation.descriptorTableInput.entries).toHaveLength(2);
    expect(derivation.descriptorTableInput.entries[0]?.descriptor.ref).toEqual(serverRef);
    expect(derivation.descriptorTableInput.entries[1]?.descriptor.ref).toEqual(asyncRef);
    expect(derivation.executionPlanSeeds).toEqual([
      {
        kind: "execution.plan-seed",
        ref: serverRef,
        policy: {
          timeoutMs: 1000,
        },
      },
      {
        kind: "execution.plan-seed",
        ref: asyncRef,
        policy: {
          timeoutMs: 1000,
        },
      },
    ]);
    expect(derivation.serviceBindingPlans).toEqual([
      {
        kind: "service.binding-plan",
        serviceId: "work-items",
        role: "server",
        surface: "api",
        capability: "work-items",
        dependencyInstances: [],
        scopeHash: "scope:server:api:work-items",
        configHash: "config:server:api:work-items",
      },
    ]);
    expect(derivation.surfaceRuntimePlans).toEqual([
      {
        kind: "surface.runtime-plan",
        role: "server",
        surface: "api",
        executableBoundaryRefs: [serverRef],
      },
      {
        kind: "surface.runtime-plan",
        role: "async",
        surface: "workflow",
        executableBoundaryRefs: [asyncRef],
      },
    ]);
    expect(derivation.workflowDispatcherDescriptors).toEqual([
      {
        kind: "workflow.dispatcher-descriptor",
        descriptorId: "dispatcher:work-items",
        appId: "hq",
        role: "server",
        surface: "api",
        capability: "work-items",
        workflowRefs: [{ workflowId: "work-items.sync" }],
        operations: [],
        diagnostics: [
          {
            code: "runtime.dispatcher-access.reserved",
            message:
              "dispatcher descriptor records operation inventory only; dispatcher access declaration remains unresolved",
          },
        ],
      },
    ]);
    expect("providerDependencyGraph" in derivation).toBeFalse();
    expect("providerDependencyGraph" in derivation.normalizedGraph).toBeFalse();
    expect(compilation.providerDependencyGraph?.edges).toEqual([
      {
        kind: "provider.dependency-edge",
        fromProviderKey: {
          kind: "provider.dependency-node",
          resourceId: "email.sender",
          providerId: "email.sender.memory",
          lifetime: "process",
          role: "server",
        },
        fromProviderId: "email.sender.memory",
        toResourceId: "clock",
        optional: false,
        reason: "timestamp outbound fixture mail",
        matchedProviderId: "clock.system",
        matchedProviderKey: {
          kind: "provider.dependency-node",
          resourceId: "clock",
          providerId: "clock.system",
          lifetime: "process",
          role: "server",
        },
      },
    ]);
    expect(compilation.providerDependencyGraph?.diagnostics).toEqual([]);

    expect(derivation.portableArtifact).toEqual({
      kind: "portable.runtime-plan-artifact",
      appId: "hq",
      executionDescriptorRefs: [serverRef, asyncRef],
      serviceBindingPlans: derivation.serviceBindingPlans,
      surfaceRuntimePlans: derivation.surfaceRuntimePlans,
      workflowDispatcherDescriptors: derivation.workflowDispatcherDescriptors,
      diagnostics: derivation.diagnostics,
    });
    expect(compilation.compiledProcessPlan).toEqual({
      kind: "compiled.process-plan",
      appId: "hq",
      executionPlans: [
        {
          kind: "compiled.execution-plan",
          ref: serverRef,
          policy: {
            timeoutMs: 1000,
          },
        },
        {
          kind: "compiled.execution-plan",
          ref: asyncRef,
          policy: {
            timeoutMs: 1000,
          },
        },
      ],
    });
    expect(compilation.registryInput.kind).toBe("compiled.execution-registry-input");
    expect(compilation.harnessPlans).toEqual([
      {
        kind: "harness.plan-placeholder",
        harness: "server",
        role: "server",
        surface: "api",
        executableBoundaryRefs: [serverRef],
        diagnostics: [
          {
            code: "runtime.harness.mounting-placeholder",
            message:
              "harness plan is a compile-time placeholder only; real host mounting remains out of scope for this lab slice",
          },
        ],
      },
      {
        kind: "harness.plan-placeholder",
        harness: "async",
        role: "async",
        surface: "workflow",
        executableBoundaryRefs: [asyncRef],
        diagnostics: [
          {
            code: "runtime.harness.mounting-placeholder",
            message:
              "harness plan is a compile-time placeholder only; real host mounting remains out of scope for this lab slice",
          },
        ],
      },
    ]);
    expect(compilation.bootgraphInput.resourceModules).toEqual([
      {
        kind: "boot.resource-module",
        resourceId: "email.sender",
        providerId: "email.sender.memory",
        lifetime: "process",
        role: "server",
      },
      {
        kind: "boot.resource-module",
        resourceId: "clock",
        providerId: "clock.system",
        lifetime: "process",
        role: "server",
      },
    ]);
    expect(compilation.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.provider-effect-plan.lowering-reserved",
    );

    const registry = createExecutionRegistry({
      plans: compilation.registryInput.executionPlans,
      descriptorTable: compilation.registryInput.descriptorTable,
    });
    expect(registry.get(serverRef).descriptor.ref).toEqual(serverRef);
    expect(registry.get(asyncRef).descriptor.ref).toEqual(asyncRef);
  });

  test("reports provider coverage and duplicate provider selections without lowering providers", () => {
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "runtime-realization.missing-clock",
      providerSelections: [
        providerSelection({
          resource: EmailSenderResource,
          provider: EmailProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: EmailSenderResource,
          provider: EmailProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ClockResource,
          provider: ClockProvider,
          lifetime: "process",
          role: "async",
        }),
      ],
    });

    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      profile,
      executions: [],
    });
    const compilation = compileRuntimeSpine(derivation);

    expect("providerDependencyGraph" in derivation).toBeFalse();
    expect("providerDependencyGraph" in derivation.normalizedGraph).toBeFalse();
    expect(compilation.providerDependencyGraph?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "provider.coverage.ambiguous",
      "provider.coverage.missing",
      "provider.coverage.missing",
    ]);
    expect(compilation.bootgraphInput.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "runtime.provider-effect-plan.lowering-reserved",
    );
  });

  test("reports provider dependency cycles without lowering provider plans", () => {
    const ResourceA = defineRuntimeResource<"cycle.a", { readonly a: true }>({
      id: "cycle.a",
      title: "Cycle A",
    });
    const ResourceB = defineRuntimeResource<"cycle.b", { readonly b: true }>({
      id: "cycle.b",
      title: "Cycle B",
    });
    const ProviderA = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "cycle.provider-a",
      title: "Cycle provider A",
      provides: ResourceA,
      requires: [
        resourceRequirement(ResourceB, {
          lifetime: "process",
          role: "server",
          reason: "cycle test",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { a: true as const };
          },
        });
      },
    });
    const ProviderB = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "cycle.provider-b",
      title: "Cycle provider B",
      provides: ResourceB,
      requires: [
        resourceRequirement(ResourceA, {
          lifetime: "process",
          role: "server",
          reason: "cycle test",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { b: true as const };
          },
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "runtime-realization.cycle",
      providerSelections: [
        providerSelection({
          resource: ResourceA,
          provider: ProviderA,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ResourceB,
          provider: ProviderB,
          lifetime: "process",
          role: "server",
        }),
      ],
    });

    const derivation = deriveRuntimeSpine({
      kind: "runtime.spine-derivation-input",
      appId: "hq",
      profile,
      executions: [],
    });

    const compilation = compileRuntimeSpine(derivation);

    expect("providerDependencyGraph" in derivation).toBeFalse();
    expect("providerDependencyGraph" in derivation.normalizedGraph).toBeFalse();
    expect(compilation.providerDependencyGraph?.diagnostics).toContainEqual({
      code: "provider.dependency.cycle",
      message:
        "provider dependency cycle detected: cycle.provider-a:cycle.a:process:server:default -> cycle.provider-b:cycle.b:process:server:default -> cycle.provider-a:cycle.a:process:server:default",
    });
  });

  test("keeps provider coverage scoped by lifetime and instance during compilation", () => {
    const ProcessClock = defineRuntimeResource<"process-clock", { now(): Date }>({
      id: "process-clock",
      title: "Process clock",
    });
    const ClockConsumerResource = defineRuntimeResource<
      "clock-consumer",
      { consume(): void }
    >({
      id: "clock-consumer",
      title: "Clock consumer",
    });
    const ClockConsumerProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "clock-consumer.provider",
      title: "Clock consumer provider",
      provides: ClockConsumerResource,
      requires: [
        resourceRequirement(ProcessClock, {
          lifetime: "process",
          role: "server",
          instance: "primary",
          reason: "instance-specific clock",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { consume() {} };
          },
        });
      },
    });
    const WrongClockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "process-clock.secondary-provider",
      title: "Wrong clock provider",
      provides: ProcessClock,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { now: () => new Date(0) };
          },
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "runtime-realization.instance-mismatch",
      providerSelections: [
        providerSelection({
          resource: ClockConsumerResource,
          provider: ClockConsumerProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ProcessClock,
          provider: WrongClockProvider,
          lifetime: "role",
          role: "server",
          instance: "secondary",
        }),
      ],
    });

    const compilation = compileRuntimeSpine(
      deriveRuntimeSpine({
        kind: "runtime.spine-derivation-input",
        appId: "hq",
        profile,
        executions: [],
      }),
    );

    expect(compilation.providerDependencyGraph?.diagnostics).toContainEqual({
      code: "provider.coverage.missing",
      message:
        "provider clock-consumer.provider requires process-clock, but the profile does not select a provider for it",
    });
  });

  test("does not collapse provider selections across lifetime during compilation", () => {
    const ScopedClock = defineRuntimeResource<"scoped-clock", { now(): Date }>({
      id: "scoped-clock",
      title: "Scoped clock",
    });
    const ClockConsumerResource = defineRuntimeResource<
      "scoped-clock-consumer",
      { consume(): void }
    >({
      id: "scoped-clock-consumer",
      title: "Scoped clock consumer",
    });
    const ClockConsumerProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "scoped-clock-consumer.provider",
      title: "Scoped clock consumer provider",
      provides: ClockConsumerResource,
      requires: [
        resourceRequirement(ScopedClock, {
          lifetime: "process",
          role: "server",
          instance: "primary",
          reason: "process-scoped clock",
        }),
      ],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { consume() {} };
          },
        });
      },
    });
    const ScopedClockProvider = defineRuntimeProvider({
      kind: "runtime.provider",
      id: "scoped-clock.provider",
      title: "Scoped clock provider",
      provides: ScopedClock,
      requires: [],
      build() {
        return providerFx.acquireRelease({
          acquire: function* () {
            return { now: () => new Date(0) };
          },
        });
      },
    });
    const profile = defineRuntimeProfile({
      kind: "runtime.profile",
      id: "runtime-realization.lifetime-key",
      providerSelections: [
        providerSelection({
          resource: ClockConsumerResource,
          provider: ClockConsumerProvider,
          lifetime: "process",
          role: "server",
        }),
        providerSelection({
          resource: ScopedClock,
          provider: ScopedClockProvider,
          lifetime: "process",
          role: "server",
          instance: "primary",
        }),
        providerSelection({
          resource: ScopedClock,
          provider: ScopedClockProvider,
          lifetime: "role",
          role: "server",
          instance: "primary",
        }),
      ],
    });

    const compilation = compileRuntimeSpine(
      deriveRuntimeSpine({
        kind: "runtime.spine-derivation-input",
        appId: "hq",
        profile,
        executions: [],
      }),
    );

    expect(compilation.providerDependencyGraph?.diagnostics).toEqual([]);
    expect(compilation.providerDependencyGraph?.edges).toContainEqual({
      kind: "provider.dependency-edge",
      fromProviderKey: {
        kind: "provider.dependency-node",
        resourceId: "scoped-clock-consumer",
        providerId: "scoped-clock-consumer.provider",
        lifetime: "process",
        role: "server",
      },
      fromProviderId: "scoped-clock-consumer.provider",
      toResourceId: "scoped-clock",
      optional: false,
      reason: "process-scoped clock",
      matchedProviderId: "scoped-clock.provider",
      matchedProviderKey: {
        kind: "provider.dependency-node",
        resourceId: "scoped-clock",
        providerId: "scoped-clock.provider",
        lifetime: "process",
        role: "server",
        instance: "primary",
      },
    });
    expect(
      compilation.bootgraphInput.resourceModules.filter(
        (module) => module.resourceId === "scoped-clock",
      ),
    ).toEqual([
      {
        kind: "boot.resource-module",
        resourceId: "scoped-clock",
        providerId: "scoped-clock.provider",
        lifetime: "process",
        role: "server",
        instance: "primary",
      },
      {
        kind: "boot.resource-module",
        resourceId: "scoped-clock",
        providerId: "scoped-clock.provider",
        lifetime: "role",
        role: "server",
        instance: "primary",
      },
    ]);
  });

  test("rejects duplicate execution ids and descriptor ref mismatches", () => {
    expect(() =>
      deriveRuntimeSpine({
        kind: "runtime.spine-derivation-input",
        appId: "hq",
        executions: [
          {
            kind: "runtime.execution-derivation-input",
            boundary: "plugin.server-api",
            executionId: "exec:server:work-items:create",
            role: "server",
            surface: "api",
            capability: "work-items",
            routePath: ["items", "create"],
            descriptor: WorkItemsServerApiPlugin.descriptors[0],
          },
          {
            kind: "runtime.execution-derivation-input",
            boundary: "plugin.server-api",
            executionId: "exec:server:work-items:create",
            role: "server",
            surface: "api",
            capability: "work-items",
            routePath: ["items", "rename"],
          },
        ],
      }),
    ).toThrow("duplicate execution derivation");

    expect(() =>
      deriveRuntimeSpine({
        kind: "runtime.spine-derivation-input",
        appId: "hq",
        executions: [
          {
            kind: "runtime.execution-derivation-input",
            boundary: "plugin.server-api",
            executionId: CreateWorkItemRef.executionId,
            role: "server",
            surface: "api",
            capability: "work-items",
            routePath: ["items", "rename"],
            descriptor: CreateWorkItemDescriptor,
          },
        ],
      }),
    ).toThrow("descriptor derivation mismatch");
  });

  test("keeps portable artifacts free of executable descriptors and registry handles", () => {
    const derivation = deriveFixtureSpine();
    const compilation = compileRuntimeSpine(derivation);
    const portable = compilation.portableArtifact;

    expect(collectFunctionPaths(portable)).toEqual([]);
    expect("descriptorTableInput" in portable).toBe(false);
    expect("descriptorTable" in portable).toBe(false);
    expect("registryInput" in portable).toBe(false);
    expect("compiledProcessPlan" in portable).toBe(false);
    expect(
      JSON.stringify(portable, (_key, value) =>
        typeof value === "function" ? "__function__" : value,
      ),
    ).not.toContain("__function__");
  });
});
